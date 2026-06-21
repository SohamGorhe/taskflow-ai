import React, { useState, useEffect, useRef } from "react";
import VoiceInput from "./components/VoiceInput";
import TaskList from "./components/TaskList";
import Header from "./components/Header";
import ChatBubbles from "./components/ChatBubbles";
import Auth from "./components/Auth";
import Toast from "./components/Toast";
import Sidebar from "./components/Sidebar";
import { supabase, fetchTasks, insertTasks, updateTask, deleteTask } from "./lib/supabase";
import { requestNotificationPermission, scheduleAllReminders, scheduleReminder, cancelReminder, cancelAllReminders } from "./lib/reminders";
import { useToast } from "./lib/useToast";
import "./styles/App.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [chatLog, setChatLog] = useState([]);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // null = today
  const reminderIds = useRef({});
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchTasks(session.user.id)
        .then(data => {
          setTasks(data);
          requestNotificationPermission().then(granted => {
            if (granted) {
              setNotifPermission("granted");
              reminderIds.current = scheduleAllReminders(data);
            }
          });
        })
        .catch(() => addToast("Failed to load tasks", "error"));
    } else {
      setTasks([]);
      cancelAllReminders(reminderIds.current);
    }
  }, [session]);

  useEffect(() => {
    if ("Notification" in window) setNotifPermission(Notification.permission);
  }, []);

  const handleEnableReminders = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifPermission("granted");
      reminderIds.current = scheduleAllReminders(tasks);
      addToast("Reminders enabled!", "success");
    } else {
      addToast("Notification permission denied", "error");
    }
  };

  const speakText = (text) => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.onstart = () => setAiSpeaking(true);
      utter.onend = () => { setAiSpeaking(false); resolve(); };
      utter.onerror = () => { setAiSpeaking(false); resolve(); };
      window.speechSynthesis.speak(utter);
    });
  };

  const handleTranscript = async (userText) => {
    setChatLog(prev => [...prev, { role: "user", text: userText }]);
    const newHistory = [...conversationHistory, { role: "user", content: userText }];
    setIsProcessing(true);

    const { parseTasksAndQuestions } = await import("./lib/taskParser");
    const result = await parseTasksAndQuestions(userText, conversationHistory);

    if (result.tasks.length > 0 && session?.user) {
      try {
        const saved = await insertTasks(result.tasks, session.user.id);
        setTasks(prev => [...prev, ...saved]);
        if (notifPermission === "granted") {
          saved.forEach(task => {
            const ids = scheduleReminder(task);
            if (ids.length > 0) reminderIds.current[task.id] = ids;
          });
        }
        addToast(`${saved.length} task${saved.length > 1 ? "s" : ""} added!`, "success");
      } catch {
        addToast("Failed to save tasks", "error");
        setTasks(prev => [...prev, ...result.tasks]);
      }
    }

    const aiText = result.question ? `${result.message} ${result.question}` : result.message;
    setChatLog(prev => [...prev, { role: "ai", text: aiText }]);
    setConversationHistory([...newHistory, { role: "assistant", content: aiText }]);
    setPendingQuestion(result.question);
    setIsProcessing(false);
    await speakText(aiText);
  };

  const handleToggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: newDone } : t));
    if (newDone) { cancelReminder(id, reminderIds.current); addToast("Task completed!", "success"); }
    try { await updateTask(id, { done: newDone }); } catch { addToast("Failed to update task", "error"); }
  };

  const handleDeleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    cancelReminder(id, reminderIds.current);
    try { await deleteTask(id); addToast("Task deleted", "info"); } catch { addToast("Failed to delete task", "error"); }
  };

  const handleLogout = async () => {
    cancelAllReminders(reminderIds.current);
    await supabase.auth.signOut();
    setTasks([]); setChatLog([]); setConversationHistory([]);
  };

  // Tasks for today
  const today = new Date().toLocaleDateString("en-CA");
  const todayTasks = tasks.filter(t => {
    const d = new Date(t.created_at).toLocaleDateString("en-CA");
    return d === today;
  });

  // Tasks for selected past date
  const selectedTasks = selectedDate
    ? tasks.filter(t => new Date(t.created_at).toLocaleDateString("en-CA") === selectedDate)
    : [];

  const formatSelectedLabel = (key) => {
    const date = new Date(key + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  if (authLoading) return (
    <div className="app">
      <div className="model-loading">
        <div className="model-spinner" />
        <p className="model-sub">Initializing...</p>
      </div>
    </div>
  );

  if (!session) return <Auth />;

  return (
    <div className="app">
      <Header user={session.user} onLogout={handleLogout} onMenuClick={() => setSidebarOpen(true)} />

      <div className="app-body">
        <Sidebar
          tasks={tasks}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onClose={() => setSidebarOpen(false)}
          isOpen={sidebarOpen}
        />

        <main className="main">
          {notifPermission !== "granted" && notifPermission !== "denied" && (
            <div className="reminder-banner">
              <span>⏰ Enable reminders to get notified before your meetings</span>
              <button className="reminder-btn" onClick={handleEnableReminders}>Enable</button>
            </div>
          )}

          {selectedDate ? (
            // ── PAST DATE VIEW ──
            <div className="past-view">
              <div className="past-view-header">
                <button className="back-btn" onClick={() => setSelectedDate(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                  Back to Today
                </button>
                <h2 className="past-view-title">{formatSelectedLabel(selectedDate)}</h2>
              </div>
              <TaskList tasks={selectedTasks} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
            </div>
          ) : (
            // ── TODAY VIEW ──
            <>
              <VoiceInput onTranscript={handleTranscript} isProcessing={isProcessing} aiSpeaking={aiSpeaking} pendingQuestion={pendingQuestion} />
              <ChatBubbles chatLog={chatLog} isProcessing={isProcessing} />
              <TaskList tasks={todayTasks} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
            </>
          )}
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

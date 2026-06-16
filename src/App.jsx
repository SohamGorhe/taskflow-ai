import React, { useState, useEffect, useRef } from "react";
import VoiceInput from "./components/VoiceInput";
import TaskList from "./components/TaskList";
import Header from "./components/Header";
import ChatBubbles from "./components/ChatBubbles";
import Auth from "./components/Auth";
import { supabase, fetchTasks, insertTasks, updateTask, deleteTask } from "./lib/supabase";
import {
  requestNotificationPermission,
  scheduleAllReminders,
  scheduleReminder,
  cancelReminder,
  cancelAllReminders,
} from "./lib/reminders";
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
  const reminderIds = useRef({});

  // Auth state
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

  // Load tasks when logged in
  useEffect(() => {
    if (session?.user) {
      fetchTasks(session.user.id)
        .then(data => {
          setTasks(data);
          // Schedule reminders for existing tasks
          requestNotificationPermission().then(granted => {
            if (granted) {
              setNotifPermission("granted");
              reminderIds.current = scheduleAllReminders(data);
            }
          });
        })
        .catch(console.error);
    } else {
      setTasks([]);
      cancelAllReminders(reminderIds.current);
    }
  }, [session]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleEnableReminders = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifPermission("granted");
      reminderIds.current = scheduleAllReminders(tasks);
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
        // Schedule reminders for new tasks
        if (notifPermission === "granted") {
          saved.forEach(task => {
            const id = scheduleReminder(task);
            if (id) reminderIds.current[task.id] = id;
          });
        }
      } catch (err) {
        console.error("Failed to save tasks:", err);
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
    if (newDone) cancelReminder(id, reminderIds.current);
    try { await updateTask(id, { done: newDone }); } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    cancelReminder(id, reminderIds.current);
    try { await deleteTask(id); } catch (err) { console.error(err); }
  };

  const handleLogout = async () => {
    cancelAllReminders(reminderIds.current);
    await supabase.auth.signOut();
    setTasks([]);
    setChatLog([]);
    setConversationHistory([]);
  };

  if (authLoading) {
    return (
      <div className="app">
        <div className="model-loading">
          <div className="model-spinner" />
          <p className="model-sub">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="app">
      <Header user={session.user} onLogout={handleLogout} />
      <main className="main">

        {/* Reminder banner */}
        {notifPermission !== "granted" && notifPermission !== "denied" && (
          <div className="reminder-banner">
            <span>⏰ Enable reminders to get notified before your meetings</span>
            <button className="reminder-btn" onClick={handleEnableReminders}>
              Enable
            </button>
          </div>
        )}

        <VoiceInput
          onTranscript={handleTranscript}
          isProcessing={isProcessing}
          aiSpeaking={aiSpeaking}
          pendingQuestion={pendingQuestion}
        />
        <ChatBubbles chatLog={chatLog} isProcessing={isProcessing} />
        <TaskList
          tasks={tasks}
          onToggle={handleToggleTask}
          onDelete={handleDeleteTask}
        />
      </main>
    </div>
  );
}

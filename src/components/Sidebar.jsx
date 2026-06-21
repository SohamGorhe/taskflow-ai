import React, { useMemo } from "react";

export default function Sidebar({ tasks, selectedDate, onSelectDate, onClose, isOpen }) {
  // Group tasks by date (last 10 days that have tasks)
  const dateGroups = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const date = new Date(task.created_at);
      const key = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    const today = new Date().toLocaleDateString("en-CA");

    return Object.entries(groups)
      .filter(([key]) => key !== today) // exclude today — shown in main
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .slice(0, 10);
  }, [tasks]);

  const formatLabel = (key) => {
    const date = new Date(key + "T00:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (key === yesterday.toLocaleDateString("en-CA")) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Past Tasks</span>
          <button className="sidebar-close" onClick={onClose}>✕</button>
        </div>

        {dateGroups.length === 0 ? (
          <p className="sidebar-empty">No past tasks yet</p>
        ) : (
          <ul className="sidebar-list">
            {dateGroups.map(([key, dayTasks]) => {
              const pending = dayTasks.filter(t => !t.done).length;
              const isSelected = selectedDate === key;
              return (
                <li key={key}>
                  <button
                    className={`sidebar-item ${isSelected ? "active" : ""}`}
                    onClick={() => { onSelectDate(key); onClose(); }}
                  >
                    <span className="sidebar-date">{formatLabel(key)}</span>
                    <span className="sidebar-meta">
                      {dayTasks.length} task{dayTasks.length > 1 ? "s" : ""}
                      {pending > 0 && <span className="sidebar-pending">{pending}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </>
  );
}

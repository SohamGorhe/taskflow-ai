import React, { useMemo, useState } from "react";
import ProfileModal from "./ProfileModal";

export default function Sidebar({ tasks, selectedDate, onSelectDate, onClose, isOpen, user, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);

  const dateGroups = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const date = new Date(task.created_at);
      const key = date.toLocaleDateString("en-CA");
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    const today = new Date().toLocaleDateString("en-CA");
    return Object.entries(groups)
      .filter(([key]) => key !== today)
      .sort(([a], [b]) => b.localeCompare(a))
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

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Past Tasks</span>
          <button className="sidebar-close" onClick={onClose}>✕</button>
        </div>

        <div className="sidebar-content">
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
        </div>

        {/* Profile section at bottom */}
        <div className="sidebar-profile" onClick={() => setProfileOpen(true)}>
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <span className="profile-display-name">
              {user?.user_metadata?.full_name || "My Profile"}
            </span>
            <span className="profile-display-email">{user?.email}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{color: "var(--dark-muted)", flexShrink: 0}}>
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
        </div>
      </aside>

      {profileOpen && (
        <ProfileModal
          user={user}
          tasks={tasks}
          onClose={() => setProfileOpen(false)}
          onLogout={onLogout}
        />
      )}
    </>
  );
}

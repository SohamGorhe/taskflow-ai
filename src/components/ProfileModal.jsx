import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function ProfileModal({ user, tasks, onClose, onLogout }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const total = tasks.length;
  const completed = tasks.filter(t => t.done).length;
  const pending = tasks.filter(t => !t.done).length;
  const todayCount = tasks.filter(t =>
    new Date(t.created_at).toLocaleDateString("en-CA") === new Date().toLocaleDateString("en-CA")
  ).length;

  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  const handleSave = async () => {
    setSaving(true);
    await supabase.auth.updateUser({ data: { full_name: name } });
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>

        {/* Top accent */}
        <div className="profile-modal-top" />

        {/* Close */}
        <button className="profile-modal-close" onClick={onClose}>✕</button>

        {/* Avatar */}
        <div className="profile-avatar-lg">{initials}</div>

        {/* Name */}
        <div className="profile-name-wrap">
          {editing ? (
            <div className="profile-name-edit">
              <input
                className="profile-name-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleSave()}
              />
              <div className="profile-name-actions">
                <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="profile-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="profile-name-display">
              <span className="profile-name">{name || "Add your name"}</span>
              <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                {saved ? "Saved!" : "Edit"}
              </button>
            </div>
          )}
          <span className="profile-email">{user?.email}</span>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-num">{total}</span>
            <span className="profile-stat-label">Total</span>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <span className="profile-stat-num" style={{color: "var(--success)"}}>{completed}</span>
            <span className="profile-stat-label">Done</span>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <span className="profile-stat-num" style={{color: "var(--accent)"}}>{pending}</span>
            <span className="profile-stat-label">Pending</span>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <span className="profile-stat-num" style={{color: "var(--warning)"}}>{todayCount}</span>
            <span className="profile-stat-label">Today</span>
          </div>
        </div>

        {/* Sign out */}
        <button className="profile-logout-btn" onClick={onLogout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sign Out
        </button>

      </div>
    </div>
  );
}

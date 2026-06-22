import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SettingsPage({ user, tasks, onLogout, theme, onThemeToggle, notifPermission, onEnableReminders }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = tasks.length;
  const completed = tasks.filter(t => t.done).length;
  const pending = tasks.filter(t => !t.done).length;

  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  const handleSaveName = async () => {
    setSaving(true);
    await supabase.auth.updateUser({ data: { full_name: name } });
    setSaving(false);
    setEditingName(false);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure? This will sign you out. Contact support to fully delete your account.")) {
      onLogout();
    }
  };

  return (
    <div className="settings-page">
      {/* Profile Card */}
      <div className="settings-card">
        <div className="settings-avatar">{initials}</div>
        <div className="settings-stat-row">
          <div className="settings-stat"><span className="settings-stat-num">{total}</span><span className="settings-stat-label">Total</span></div>
          <div className="settings-stat"><span className="settings-stat-num" style={{color:"var(--success)"}}>{completed}</span><span className="settings-stat-label">Done</span></div>
          <div className="settings-stat"><span className="settings-stat-num" style={{color:"var(--accent)"}}>{pending}</span><span className="settings-stat-label">Pending</span></div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="settings-section">
        <p className="settings-section-title">Profile</p>
        <div className="settings-group">
          <div className="settings-field">
            <label className="settings-label">Full Name</label>
            {editingName ? (
              <div className="settings-edit-row">
                <input className="settings-input" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveName()} autoFocus placeholder="Your name" />
                <button className="settings-save-btn" onClick={handleSaveName} disabled={saving}>{saving ? "..." : "Save"}</button>
                <button className="settings-cancel-btn" onClick={() => setEditingName(false)}>Cancel</button>
              </div>
            ) : (
              <div className="settings-value-row">
                <span className="settings-value">{name || "Add your name"}</span>
                <button className="settings-edit-btn" onClick={() => setEditingName(true)}>Edit</button>
              </div>
            )}
          </div>
          <div className="settings-divider" />
          <div className="settings-field">
            <label className="settings-label">Email</label>
            <span className="settings-value muted">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <p className="settings-section-title">Appearance</p>
        <div className="settings-group">
          <div className="settings-row">
            <div>
              <p className="settings-row-title">Dark Mode</p>
              <p className="settings-row-sub">Switch between light and dark theme</p>
            </div>
            <button className={`settings-toggle ${theme === "dark" ? "on" : ""}`} onClick={onThemeToggle}>
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <p className="settings-section-title">Notifications</p>
        <div className="settings-group">
          <div className="settings-row">
            <div>
              <p className="settings-row-title">Task Reminders</p>
              <p className="settings-row-sub">Get notified before meetings and for daily tasks</p>
            </div>
            {notifPermission === "granted" ? (
              <span className="settings-badge enabled">Enabled</span>
            ) : notifPermission === "denied" ? (
              <span className="settings-badge denied">Blocked</span>
            ) : (
              <button className="settings-enable-btn" onClick={onEnableReminders}>Enable</button>
            )}
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="settings-section">
        <p className="settings-section-title">Account</p>
        <div className="settings-group">
          <button className="settings-logout-row" onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sign Out
          </button>
          <div className="settings-divider" />
          <button className="settings-danger-row" onClick={handleDeleteAccount}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Delete Account
          </button>
        </div>
      </div>

      <p className="settings-version">TaskFlow AI · v1.0</p>
    </div>
  );
}

import React from "react";

export default function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <div className="logo-icon">◈</div>
          <span className="logo-text">TASKFLOW</span>
          <span className="logo-tag">AI</span>
        </div>
        <div className="header-right">
          {user && (
            <>
              <div className="header-status">
                <span className="status-dot" />
                <span className="user-email">{user.email}</span>
              </div>
              <button className="logout-btn" onClick={onLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Sign Out
              </button>
            </>
          )}
          {!user && (
            <div className="header-status">
              <span className="status-dot" />
              <span>SYSTEM ONLINE</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { Search, Bell, Settings } from "lucide-react";

export function TopBar() {
  return (
    <header className="top-bar" role="banner">
      {/* Left: Wordmark */}
      <div className="top-bar__left">
        <span className="top-bar__wordmark">Reddit365</span>
      </div>

      {/* Center: Search bar */}
      <div className="top-bar__center">
        <div className="top-bar__search">
          <Search size={14} className="top-bar__search-icon" />
          <input
            type="text"
            placeholder="Search"
            className="top-bar__search-input"
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right: Actions + avatar */}
      <div className="top-bar__right">
        <button
          className="top-bar__action"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>
        <button
          className="top-bar__action"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>
        <button
          className="top-bar__avatar"
          title="Account"
          aria-label="Account menu"
        >
          <span className="top-bar__avatar-initials">R</span>
        </button>
      </div>
    </header>
  );
}

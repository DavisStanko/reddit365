"use client";

import {
  Search,
  Bell,
  Settings,
  CircleUserRound,
  MessageSquare,
  CalendarCheck,
} from "lucide-react";

interface TopBarProps {
  folderWidth?: number;
  listWidth?: number;
}

function AppLauncherIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      className="top-bar__launcher-icon"
    >
      <circle cx="3" cy="3" r="1.1" />
      <circle cx="8" cy="3" r="1.1" />
      <circle cx="13" cy="3" r="1.1" />
      <circle cx="3" cy="8" r="1.1" />
      <circle cx="8" cy="8" r="1.1" />
      <circle cx="13" cy="8" r="1.1" />
      <circle cx="3" cy="13" r="1.1" />
      <circle cx="8" cy="13" r="1.1" />
      <circle cx="13" cy="13" r="1.1" />
    </svg>
  );
}

export function TopBar({ folderWidth = 220, listWidth = 340 }: TopBarProps) {
  return (
    <header className="top-bar" role="banner" style={{ position: "relative" }}>
      <div className="top-bar__main">
        <div className="top-bar__left">
          <button className="top-bar__launcher" aria-label="App launcher">
            <AppLauncherIcon />
          </button>

          <span className="top-bar__wordmark">Outlook</span>
        </div>

        <div
          className="top-bar__search"
          style={{
            position: "absolute",
            left: `${48 + folderWidth + 4}px`, /* IconRail + FolderPane + ResizeHandle */
            width: `${listWidth}px`,
            maxWidth: "none"
          }}
        >
          <Search size={15} className="top-bar__search-icon" />
          <input
            type="text"
            placeholder="Search"
            className="top-bar__search-input"
            aria-label="Search"
          />
        </div>

        <div className="top-bar__right">
          <button
            className="top-bar__action"
            title="Teams"
            aria-label="Teams"
          >
            <MessageSquare size={16} />
          </button>

          <button
            className="top-bar__action"
            title="My Day"
            aria-label="My Day"
          >
            <CalendarCheck size={16} />
          </button>

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
            <CircleUserRound size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}

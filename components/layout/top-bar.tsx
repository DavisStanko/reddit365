"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  Settings,
  Image as ImageIcon,
  CircleUserRound,
  MessageSquare,
  CalendarCheck,
} from "lucide-react";
import { useSettings } from "@/components/settings-context";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { mediaEnabled, setMediaEnabled } = useSettings();
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!settingsOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

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

          <div className="top-bar__settings-wrapper" ref={dropdownRef}>
            <button
              className={`top-bar__action ${settingsOpen ? "top-bar__action--active" : ""}`}
              title="Settings"
              aria-label="Settings"
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings size={16} />
            </button>

            {settingsOpen && (
              <div className="settings-dropdown" role="menu">
                <div className="settings-dropdown__header">Settings</div>
                <label className="settings-dropdown__item">
                  <ImageIcon size={16} className="settings-dropdown__icon" />
                  <span className="settings-dropdown__label">Show media</span>
                  <span
                    className={`settings-toggle ${mediaEnabled ? "settings-toggle--on" : ""}`}
                    role="switch"
                    aria-checked={mediaEnabled}
                    onClick={(e) => {
                      e.preventDefault();
                      setMediaEnabled(!mediaEnabled);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setMediaEnabled(!mediaEnabled);
                      }
                    }}
                    tabIndex={0}
                  >
                    <span className="settings-toggle__thumb" />
                  </span>
                </label>
              </div>
            )}
          </div>

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

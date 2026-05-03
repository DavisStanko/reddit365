"use client";

import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  Settings,
  Image as ImageIcon,
  Mail,
  Trash2,
  Archive,
  Send,
  Reply,
  ReplyAll,
  Forward,
  Undo2,
  Sparkles,
  Tag,
  Clock3,
  Printer,
} from "lucide-react";
import { useSettings } from "@/components/settings-context";

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

const RIBBON_TABS = ["File", "Home", "View", "Help"] as const;

const COMMANDS = [
  { label: "New mail", icon: Mail, primary: true },
  { label: "Delete", icon: Trash2 },
  { label: "Archive", icon: Archive },
  { label: "Sweep", icon: Sparkles },
  { label: "Move to", icon: Send },
  { label: "Reply", icon: Reply },
  { label: "Reply all", icon: ReplyAll },
  { label: "Forward", icon: Forward },
  { label: "Quick steps", icon: Tag },
  { label: "Read / Unread", icon: Mail },
  { label: "Flag", icon: Clock3 },
  { label: "Print", icon: Printer },
  { label: "Undo", icon: Undo2 },
];

export function TopBar() {
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
    <header className="top-bar" role="banner">
      <div className="top-bar__main">
        <button className="top-bar__launcher" aria-label="App launcher">
          <AppLauncherIcon />
        </button>

        <span className="top-bar__wordmark">Outlook</span>

        <div className="top-bar__search">
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
            <span className="top-bar__avatar-initials">R</span>
          </button>
        </div>
      </div>

      <div className="top-bar__subheader">
        <div className="top-bar__subheader-left">
          <button
            className="top-bar__menu-button"
            aria-label="Toggle navigation"
          >
            <Menu size={16} />
          </button>

          <nav className="top-bar__tabs" aria-label="Ribbon tabs">
            {RIBBON_TABS.map((tab) => (
              <button
                key={tab}
                className={`top-bar__tab ${tab === "Home" ? "top-bar__tab--active" : ""}`}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="top-bar__commandbar" aria-label="Command bar">
          {COMMANDS.map((command) => {
            const Icon = command.icon;
            return (
              <button
                key={command.label}
                className={`top-bar__command-btn ${command.primary ? "top-bar__command-btn--primary" : ""}`}
                type="button"
              >
                <Icon size={14} />
                <span>{command.label}</span>
              </button>
            );
          })}
        </div>

        <button className="top-bar__copilot" type="button" aria-label="Copilot">
          <span className="top-bar__copilot-orb" />
        </button>
      </div>
    </header>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, Settings, Image as ImageIcon } from "lucide-react";
import { useSettings } from "@/components/settings-context";

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
      {/* Left: Wordmark */}
      <div className="top-bar__left">
        <span className="top-bar__wordmark">Outlook</span>
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

        {/* Settings button + dropdown */}
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
    </header>
  );
}

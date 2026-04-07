"use client";

import {
  Menu,
  Mail,
  Trash2,
  Archive,
  Sparkles,
  FolderDown,
  Reply,
  ReplyAll,
  Forward,
  Users,
  Tag,
  ChevronDown
} from "lucide-react";

const RIBBON_TABS = ["File", "Home", "View", "Help"] as const;

const COMMANDS = [
  { label: "New mail", icon: Mail, primary: true, dropdown: true },
  { label: "Delete", icon: Trash2 },
  { label: "Archive", icon: Archive },
  { label: "Sweep", icon: Sparkles },
  { label: "Move to", icon: FolderDown, dropdown: true },
  { label: "Reply", icon: Reply },
  { label: "Reply all", icon: ReplyAll },
  { label: "Forward", icon: Forward, dropdown: true },
  { label: "Share to Teams", icon: Users },
  { label: "Quick steps", icon: Tag, dropdown: true },
  { label: "Read / Unread", icon: Mail, dropdown: true },
];

export function Ribbon() {
  return (
    <div className="ribbon" role="toolbar" aria-label="Ribbon">
      <div className="ribbon__tabs-row">
        <button className="ribbon__menu-button" aria-label="Toggle navigation">
          <Menu size={16} />
        </button>

        <nav className="ribbon__tabs" aria-label="Ribbon tabs">
          {RIBBON_TABS.map((tab) => (
            <button
              key={tab}
              className={`ribbon__tab ${tab === "Home" ? "ribbon__tab--active" : ""}`}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="ribbon__command-row">
        <div className="ribbon__commandbar" aria-label="Command bar">
          {COMMANDS.map((command) => {
            const Icon = command.icon;
            return (
              <button
                key={command.label}
                className={`ribbon__command-btn ${command.primary ? "ribbon__command-btn--primary" : ""}`}
                type="button"
              >
                <Icon size={14} />
                <span>{command.label}</span>
                {command.dropdown && <ChevronDown size={12} className="ribbon__command-btn-chevron" />}
              </button>
            );
          })}
        </div>

        <button className="ribbon__copilot" type="button" aria-label="Copilot">
          <span className="ribbon__copilot-orb" />
        </button>
      </div>
    </div>
  );
}

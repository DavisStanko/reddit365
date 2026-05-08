"use client";

import { useState } from "react";
import { useAppContext } from "@/components/app-context";

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
  const { addSubreddit } = useAppContext();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSubreddit, setNewSubreddit] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubreddit.trim()) {
      addSubreddit(newSubreddit.trim());
      setNewSubreddit("");
      setShowAddDialog(false);
    }
  };

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
            const isNewMail = command.label === "New mail";
            return (
              <button
                key={command.label}
                className={`ribbon__command-btn ${command.primary ? "ribbon__command-btn--primary" : ""}`}
                type="button"
                onClick={isNewMail ? () => setShowAddDialog(true) : undefined}
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

      {showAddDialog && (
        <div className="outlook-dialog-overlay" onClick={() => setShowAddDialog(false)}>
          <div className="outlook-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="outlook-dialog__header">
              <h3>Add Subreddit</h3>
              <button type="button" className="outlook-dialog__close" onClick={() => setShowAddDialog(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit} className="outlook-dialog__body">
              <label htmlFor="subreddit-input" className="outlook-dialog__label">Subreddit Name (without r/)</label>
              <input
                id="subreddit-input"
                type="text"
                autoFocus
                placeholder="e.g. reactjs"
                value={newSubreddit}
                onChange={(e) => setNewSubreddit(e.target.value)}
                className="outlook-dialog__input"
              />
              <div className="outlook-dialog__footer">
                <button type="button" className="outlook-dialog__btn" onClick={() => setShowAddDialog(false)}>Cancel</button>
                <button type="submit" className="outlook-dialog__btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

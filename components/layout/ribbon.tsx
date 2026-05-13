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

      <div className="ribbon__command-row-wrapper">
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
            <button className="ribbon__command-btn" type="button" aria-label="More commands">
              <span style={{ fontWeight: "bold", letterSpacing: "2px", paddingBottom: "4px" }}>...</span>
              <ChevronDown size={12} className="ribbon__command-btn-chevron" />
            </button>
          </div>
        </div>

        <button className="ribbon__copilot" type="button" aria-label="Copilot">
          <div className="ribbon__copilot-icon">
            <svg fill="none" height="100%" viewBox="0 0 24 24" width="100%"><path d="M17.0722 3.66246C16.7827 2.67691 15.8784 2 14.8512 2L14.1735 2C13.0569 2 12.0994 2.7971 11.897 3.8952L10.7119 10.3247L11.0335 9.22215C11.3216 8.23453 12.2269 7.55555 13.2557 7.55555L17.1772 7.55556L18.8242 8.19709L20.4119 7.55556H19.9483C18.9212 7.55556 18.0168 6.87864 17.7273 5.89309L17.0722 3.66246Z" fill="url(#paint0_radial_56201_15518)"></path><path d="M7.16561 20.328C7.45189 21.3183 8.35852 22 9.38937 22H10.8432C12.0912 22 13.1145 21.0107 13.1567 19.7634L13.3712 13.4201L12.9681 14.7851C12.6776 15.7691 11.774 16.4444 10.7481 16.4444L6.78679 16.4444L5.37506 15.6786L3.84668 16.4444H4.3025C5.33335 16.4444 6.23998 17.1261 6.52626 18.1164L7.16561 20.328Z" fill="url(#paint1_radial_56201_15518)"></path><path d="M14.7507 2H6.73041C4.43891 2 3.06401 5.02777 2.14741 8.05553C1.06148 11.6426 -0.359484 16.4401 3.75146 16.4401H7.21482C8.24955 16.4401 9.15794 15.7559 9.44239 14.7611C10.0445 12.6551 11.0997 8.98146 11.9285 6.18489C12.3497 4.76367 12.7005 3.5431 13.239 2.783C13.5409 2.35686 14.044 2 14.7507 2Z" fill="url(#paint2_radial_56201_15518)"></path><path d="M14.7507 2H6.73041C4.43891 2 3.06401 5.02777 2.14741 8.05553C1.06148 11.6426 -0.359484 16.4401 3.75146 16.4401H7.21482C8.24955 16.4401 9.15794 15.7559 9.44239 14.7611C10.0445 12.6551 11.0997 8.98146 11.9285 6.18489C12.3497 4.76367 12.7005 3.5431 13.239 2.783C13.5409 2.35686 14.044 2 14.7507 2Z" fill="url(#paint3_radial_56201_15518)"></path><path d="M9.24902 22H17.2693C19.5608 22 20.9357 18.9722 21.8523 15.9445C22.9382 12.3574 24.3592 7.55991 20.2482 7.55991H16.7849C15.7501 7.55991 14.8417 8.24407 14.5573 9.23894C13.9552 11.3449 12.9 15.0186 12.0712 17.8151C11.65 19.2363 11.2991 20.4569 10.7607 21.217C10.4588 21.6431 9.9557 22 9.24902 22Z" fill="url(#paint4_radial_56201_15518)"></path><path d="M9.24902 22H17.2693C19.5608 22 20.9357 18.9722 21.8523 15.9445C22.9382 12.3574 24.3592 7.55991 20.2482 7.55991H16.7849C15.7501 7.55991 14.8417 8.24407 14.5573 9.23894C13.9552 11.3449 12.9 15.0186 12.0712 17.8151C11.65 19.2363 11.2991 20.4569 10.7607 21.217C10.4588 21.6431 9.9557 22 9.24902 22Z" fill="url(#paint5_radial_56201_15518)"></path><defs><radialGradient id="paint0_radial_56201_15518" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(18.9994 10.3791) rotate(-128.978) scale(8.73886 8.198)"><stop offset="0.0955758" stop-color="#00AEFF"></stop><stop offset="0.773185" stop-color="#2253CE"></stop><stop offset="1" stop-color="#0736C4"></stop></radialGradient><radialGradient id="paint1_radial_56201_15518" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(5.57463 16.2453) rotate(52.4153) scale(8.16508 7.88004)"><stop stop-color="#FFB657"></stop><stop offset="0.633728" stop-color="#FF5F3D"></stop><stop offset="0.923392" stop-color="#C02B3C"></stop></radialGradient><linearGradient id="paint2_radial_56201_15518" x1="6.25039" y1="3.7497" x2="7.39413" y2="16.985" gradientUnits="userSpaceOnUse"><stop offset="0.156162" stop-color="#0D91E1"></stop><stop offset="0.487484" stop-color="#52B471"></stop><stop offset="0.652394" stop-color="#98BD42"></stop><stop offset="0.937361" stop-color="#FFC800"></stop></linearGradient><linearGradient id="paint3_radial_56201_15518" x1="7.25046" y1="2" x2="7.87502" y2="16.4401" gradientUnits="userSpaceOnUse"><stop stop-color="#3DCBFF"></stop><stop offset="0.246674" stop-color="#0588F7" stop-opacity="0"></stop></linearGradient><radialGradient id="paint4_radial_56201_15518" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20.6602 6.14612) rotate(109.282) scale(19.1879 22.994)"><stop offset="0.0661714" stop-color="#8C48FF"></stop><stop offset="0.5" stop-color="#F2598A"></stop><stop offset="0.895833" stop-color="#FFB152"></stop></radialGradient><linearGradient id="paint5_radial_56201_15518" x1="21.2938" y1="6.67831" x2="21.2857" y2="10.6113" gradientUnits="userSpaceOnUse"><stop offset="0.0581535" stop-color="#F8ADFA"></stop><stop offset="0.708063" stop-color="#A86EDD" stop-opacity="0"></stop></linearGradient></defs></svg>
          </div>
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

"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  FolderPane,
  ContentPane,
  PostList,
} from "@/components/layout";
import { AppProvider } from "@/components/app-context";
import { RedditProvider } from "@/components/reddit-context";
import { HelpModal } from "@/components/help-modal";

const DEFAULT_FOLDER_WIDTH = 212;
const DEFAULT_LIST_WIDTH = 350;

function HomeContent() {
  const [showWarning, setShowWarning] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Open on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem("reddit365_helpSeen")) {
        queueMicrotask(() => setShowHelp(true));
        localStorage.setItem("reddit365_helpSeen", "1");
      }
    } catch {
      // localStorage unavailable — just skip
    }
  }, []);

  const openHelp = () => setShowHelp(true);
  const closeHelp = () => setShowHelp(false);

  return (
    <div className="outlook-shell">
      {/* Mobile Warning Banner */}
      {showWarning && (
        <div className="mobile-warning">
          <span>⚠️ This theme is designed for desktop use and may display incorrectly on smaller windows or mobile devices.</span>
          <button className="mobile-warning__close" onClick={() => setShowWarning(false)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="outlook-shell__body">
        {/* Full-height Sidebar Image — left column, top to bottom */}
        <div
          onContextMenu={(e) => e.preventDefault()}
          onClick={openHelp}
          role="button"
          tabIndex={0}
          aria-label="Open help and settings"
          onKeyDown={(e) => e.key === "Enter" && openHelp()}
          style={{ width: "65px", flexShrink: 0, backgroundColor: "#1f1f1f", userSelect: "none", alignSelf: "stretch", overflow: "hidden", cursor: "pointer" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/full_side.png"
            alt="Sidebar"
            draggable={false}
            style={{ display: "block", width: "65px", height: "100%", objectFit: "fill", pointerEvents: "none" }}
          />
        </div>

        <div className="outlook-shell__main-area">
          {/* Double Header Image (top bar + ribbon) — click to open help */}
          {/* Height = 178/1245 * 100vh so it scales at the same rate as the sidebar (65×1245 → 100vh) */}
          <div
            onContextMenu={(e) => e.preventDefault()}
            onClick={openHelp}
            role="button"
            tabIndex={0}
            aria-label="Open help and settings"
            onKeyDown={(e) => e.key === "Enter" && openHelp()}
            style={{ width: "100%", height: "calc(178 / 1245 * 100vh)", flexShrink: 0, userSelect: "none", cursor: "pointer", lineHeight: 0, overflow: "hidden" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/double_header.png"
              alt="Outlook Header"
              draggable={false}
              style={{ display: "block", width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }}
            />
          </div>

          <div className="outlook-shell__panes">
            {/* Folder pane — resizable */}
            <div
              className="outlook-shell__folder"
              style={{ width: DEFAULT_FOLDER_WIDTH }}
            >
              <FolderPane />
            </div>

            {/* Message list pane — resizable */}
            <div className="outlook-shell__list" style={{ width: DEFAULT_LIST_WIDTH }}>
              <PostList />
            </div>

            {/* Reading pane — takes remaining space */}
            <div className="outlook-shell__content">
              <ContentPane />
            </div>
          </div>
        </div>
      </div>

      {/* Help & Settings Modal */}
      <HelpModal isOpen={showHelp} onClose={closeHelp} />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <RedditProvider>
        <HomeContent />
      </RedditProvider>
    </AppProvider>
  );
}

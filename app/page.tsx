"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FolderPane,
  ContentPane,
  PostList,
} from "@/components/layout";
import { AppProvider, useAppContext } from "@/components/app-context";
import { RedditProvider } from "@/components/reddit-context";

const DEFAULT_FOLDER_WIDTH = 212;
const DEFAULT_LIST_WIDTH = 350;

function HomeContent() {
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
    <div className="outlook-shell">
      {/* Top Header Image */}
      <div style={{ position: "relative", width: "100%", height: "48px", flexShrink: 0 }}>
        <Image src="/images/top-header.png" alt="Top Header" fill style={{ objectFit: "cover", objectPosition: "left top" }} priority unoptimized />
      </div>

      <div className="outlook-shell__body">
        {/* Sidebar Image */}
        <div style={{ position: "relative", width: "50px", height: "100%", flexShrink: 0, backgroundColor: "#1f1f1f" }}>
          <Image src="/images/sidebar.png" alt="Sidebar" fill style={{ objectFit: "cover", objectPosition: "top center" }} priority unoptimized />
        </div>

        <div className="outlook-shell__main-area">
          {/* Second Header Image with invisible button */}
          <div style={{ position: "relative", width: "100%", height: "84px", flexShrink: 0, backgroundColor: "#f5f5f5" }}>
            <Image src="/images/second-header.png" alt="Ribbon" fill style={{ objectFit: "cover", objectPosition: "left top" }} priority unoptimized />
            <button
              onClick={() => setShowAddDialog(true)}
              style={{
                position: "absolute",
                top: "40px",
                left: "12px",
                width: "140px",
                height: "36px",
                opacity: 0,
                cursor: "pointer",
                zIndex: 10
              }}
              aria-label="New mail"
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

export default function Home() {
  return (
    <AppProvider>
      <RedditProvider>
        <HomeContent />
      </RedditProvider>
    </AppProvider>
  );
}

"use client";

import Image from "next/image";
import {
  FolderPane,
  ContentPane,
  PostList,
} from "@/components/layout";
import { AppProvider } from "@/components/app-context";
import { RedditProvider } from "@/components/reddit-context";

const DEFAULT_FOLDER_WIDTH = 212;
const DEFAULT_LIST_WIDTH = 350;

function HomeContent() {
  return (
    <div className="outlook-shell">
      {/* Top Header Image */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{ position: "relative", width: "100%", height: "48px", flexShrink: 0, userSelect: "none" }}
      >
        <Image src="/images/top-header.png" alt="Top Header" fill style={{ objectFit: "cover", objectPosition: "left top", pointerEvents: "none" }} draggable={false} priority unoptimized />
      </div>

      <div className="outlook-shell__body">
        {/* Sidebar Image */}
        <div
          onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative", width: "50px", height: "100%", flexShrink: 0, backgroundColor: "#1f1f1f", userSelect: "none" }}
        >
          <Image src="/images/sidebar.png" alt="Sidebar" fill style={{ objectFit: "cover", objectPosition: "top center", pointerEvents: "none" }} draggable={false} priority unoptimized />
        </div>

        <div className="outlook-shell__main-area">
          {/* Second Header Image with invisible button */}
          <div
            onContextMenu={(e) => e.preventDefault()}
            style={{ position: "relative", width: "100%", height: "84px", flexShrink: 0, backgroundColor: "#f5f5f5", userSelect: "none" }}
          >
            <Image src="/images/second-header.png" alt="Ribbon" fill style={{ objectFit: "cover", objectPosition: "left top", pointerEvents: "none" }} draggable={false} priority unoptimized />
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

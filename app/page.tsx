"use client";

import { useState, useCallback } from "react";
import {
  IconRail,
  TopBar,
  Ribbon,
  FolderPane,
  ContentPane,
  ResizeHandle,
  PostList,
} from "@/components/layout";
import { SettingsProvider } from "@/components/settings-context";
import { AppProvider } from "@/components/app-context";

const MIN_FOLDER_WIDTH = 160;
const MAX_FOLDER_WIDTH = 400;
const DEFAULT_FOLDER_WIDTH = 220;

const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 600;
const DEFAULT_LIST_WIDTH = 330;

export default function Home() {
  const [folderWidth, setFolderWidth] = useState(DEFAULT_FOLDER_WIDTH);
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH);

  const handleFolderResize = useCallback((delta: number) => {
    setFolderWidth((w) =>
      Math.min(MAX_FOLDER_WIDTH, Math.max(MIN_FOLDER_WIDTH, w + delta)),
    );
  }, []);

  const handleListResize = useCallback((delta: number) => {
    setListWidth((w) =>
      Math.min(MAX_LIST_WIDTH, Math.max(MIN_LIST_WIDTH, w + delta)),
    );
  }, []);

  return (
    <AppProvider>
      <SettingsProvider>
        <div className="outlook-shell">
          {/* Top ribbon/nav bar */}
          <TopBar folderWidth={folderWidth} listWidth={listWidth} />

          {/* Main body below the top bar */}
          <div className="outlook-shell__body">
            {/* Icon rail — far left */}
            <IconRail />

            <div className="outlook-shell__main-area">
              <Ribbon />

              <div className="outlook-shell__panes">
                {/* Folder pane — resizable */}
                <div
                  className="outlook-shell__folder"
                  style={{ width: folderWidth }}
                >
                  <FolderPane />
                </div>
                <ResizeHandle onResize={handleFolderResize} />

                {/* Post list pane — resizable */}
                <div className="outlook-shell__list" style={{ width: listWidth }}>
                  <PostList />
                </div>
                <ResizeHandle onResize={handleListResize} />

                {/* Content / reading pane — takes remaining space */}
                <div className="outlook-shell__content">
                  <ContentPane />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SettingsProvider>
    </AppProvider>
  );
}

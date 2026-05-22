"use client";


import {
  IconRail,
  TopBar,
  Ribbon,
  FolderPane,
  ContentPane,
  ResizeHandle,
  PostList,
} from "@/components/layout";
import { AppProvider } from "@/components/app-context";
import { RedditProvider } from "@/components/reddit-context";

const MIN_FOLDER_WIDTH = 160;
const MAX_FOLDER_WIDTH = 400;
const DEFAULT_FOLDER_WIDTH = 220;

const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 600;
const DEFAULT_LIST_WIDTH = 330;

export default function Home() {

  return (
    <AppProvider>
      <RedditProvider>
        <div className="outlook-shell">
          {/* Top ribbon/nav bar */}
          <TopBar folderWidth={DEFAULT_FOLDER_WIDTH} listWidth={DEFAULT_LIST_WIDTH} />

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
                  style={{ width: DEFAULT_FOLDER_WIDTH }}
                >
                  <FolderPane />
                </div>
                <ResizeHandle />

                {/* Message list pane — resizable */}
                <div className="outlook-shell__list" style={{ width: DEFAULT_LIST_WIDTH }}>
                  <PostList />
                </div>
                <ResizeHandle />

                {/* Reading pane — takes remaining space */}
                <div className="outlook-shell__content">
                  <ContentPane />
                </div>
              </div>
            </div>
          </div>
        </div>
      </RedditProvider>
    </AppProvider>
  );
}

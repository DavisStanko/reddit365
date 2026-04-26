"use client";

import { useState, useCallback } from "react";
import {
  IconRail,
  TopBar,
  FolderPane,
  ContentPane,
  ResizeHandle,
} from "@/components/layout";
import { SettingsProvider } from "@/components/settings-context";
import { SAMPLE_POSTS, type Post } from "@/lib/sample-posts";

const MIN_FOLDER_WIDTH = 160;
const MAX_FOLDER_WIDTH = 400;
const DEFAULT_FOLDER_WIDTH = 220;

const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 600;
const DEFAULT_LIST_WIDTH = 340;

export default function Home() {
  const [folderWidth, setFolderWidth] = useState(DEFAULT_FOLDER_WIDTH);
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const handleFolderResize = useCallback((delta: number) => {
    setFolderWidth((w) =>
      Math.min(MAX_FOLDER_WIDTH, Math.max(MIN_FOLDER_WIDTH, w + delta))
    );
  }, []);

  const handleListResize = useCallback((delta: number) => {
    setListWidth((w) =>
      Math.min(MAX_LIST_WIDTH, Math.max(MIN_LIST_WIDTH, w + delta))
    );
  }, []);

  return (
    <SettingsProvider>
      <div className="outlook-shell">
        {/* Top Bar — spans full width */}
        <TopBar />

        {/* Main body below the top bar */}
        <div className="outlook-shell__body">
          {/* Icon rail — far left */}
          <IconRail />

          {/* Folder pane — resizable */}
          <div className="outlook-shell__folder" style={{ width: folderWidth }}>
            <FolderPane />
          </div>
          <ResizeHandle onResize={handleFolderResize} />

          {/* Post list pane — resizable */}
          <div className="outlook-shell__list" style={{ width: listWidth }}>
            <div className="post-list">
              <div className="post-list__header">
                <div className="post-list__tabs">
                  <button className="post-list__tab post-list__tab--active">
                    Hot
                  </button>
                  <button className="post-list__tab">New</button>
                  <button className="post-list__tab">Top</button>
                </div>
              </div>
              <div className="post-list__items">
                {SAMPLE_POSTS.map((post) => {
                  const isSelected = selectedPost?.id === post.id;
                  return (
                    <article
                      key={post.id}
                      className={`post-item ${isSelected ? "post-item--selected" : ""}`}
                      onClick={() => setSelectedPost(post)}
                      role="button"
                      tabIndex={0}
                      aria-current={isSelected ? "true" : undefined}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedPost(post);
                        }
                      }}
                    >
                      <div className="post-item__votes">
                        <span className="post-item__score">{post.score}</span>
                      </div>
                      <div className="post-item__content">
                        <h3 className="post-item__title">{post.title}</h3>
                        <div className="post-item__meta">
                          <span className="post-item__sub">
                            {post.subreddit}
                          </span>
                          <span className="post-item__dot">·</span>
                          <span className="post-item__author">
                            u/{post.author}
                          </span>
                          <span className="post-item__dot">·</span>
                          <span className="post-item__time">{post.time}</span>
                        </div>
                        <div className="post-item__stats">
                          <span>{post.comments} comments</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
          <ResizeHandle onResize={handleListResize} />

          {/* Content / reading pane — takes remaining space */}
          <div className="outlook-shell__content">
            <ContentPane post={selectedPost} />
          </div>
        </div>
      </div>
    </SettingsProvider>
  );
}

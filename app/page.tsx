"use client";

import { useState, useCallback } from "react";
import {
  IconRail,
  TopBar,
  FolderPane,
  ContentPane,
  ResizeHandle,
} from "@/components/layout";

const MIN_FOLDER_WIDTH = 160;
const MAX_FOLDER_WIDTH = 400;
const DEFAULT_FOLDER_WIDTH = 220;

const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 600;
const DEFAULT_LIST_WIDTH = 340;

export default function Home() {
  const [folderWidth, setFolderWidth] = useState(DEFAULT_FOLDER_WIDTH);
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH);

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
              {/* Sample post items */}
              {SAMPLE_POSTS.map((post) => (
                <article key={post.id} className="post-item">
                  <div className="post-item__votes">
                    <span className="post-item__score">{post.score}</span>
                  </div>
                  <div className="post-item__content">
                    <h3 className="post-item__title">{post.title}</h3>
                    <div className="post-item__meta">
                      <span className="post-item__sub">{post.subreddit}</span>
                      <span className="post-item__dot">·</span>
                      <span className="post-item__author">u/{post.author}</span>
                      <span className="post-item__dot">·</span>
                      <span className="post-item__time">{post.time}</span>
                    </div>
                    <div className="post-item__stats">
                      <span>{post.comments} comments</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
        <ResizeHandle onResize={handleListResize} />

        {/* Content / reading pane — takes remaining space */}
        <div className="outlook-shell__content">
          <ContentPane />
        </div>
      </div>
    </div>
  );
}

/* Placeholder post data */
const SAMPLE_POSTS = [
  {
    id: 1,
    title: "The James Webb Space Telescope just captured the deepest infrared image of the universe ever taken",
    subreddit: "r/science",
    author: "astro_news",
    time: "3h",
    score: "24.5k",
    comments: 1847,
  },
  {
    id: 2,
    title: "What's a skill that's relatively easy to learn but makes you seem much more competent?",
    subreddit: "r/AskReddit",
    author: "curious_mind",
    time: "5h",
    score: "18.2k",
    comments: 3421,
  },
  {
    id: 3,
    title: "TIL that honey never spoils. Archaeologists have found 3000 year old honey in Egyptian tombs that was still edible.",
    subreddit: "r/todayilearned",
    author: "history_buff",
    time: "7h",
    score: "12.1k",
    comments: 892,
  },
  {
    id: 4,
    title: "After 6 months of learning, I finally deployed my first full-stack app!",
    subreddit: "r/programming",
    author: "newdev2024",
    time: "2h",
    score: "8.4k",
    comments: 567,
  },
  {
    id: 5,
    title: "The new Battery Technology that could charge your phone in 5 minutes",
    subreddit: "r/technology",
    author: "tech_insider",
    time: "4h",
    score: "6.7k",
    comments: 423,
  },
  {
    id: 6,
    title: "My cat decided that my keyboard is the perfect bed. Every. Single. Day.",
    subreddit: "r/funny",
    author: "cat_person_99",
    time: "1h",
    score: "31.2k",
    comments: 2103,
  },
  {
    id: 7,
    title: "Scientists discover high levels of high levels of microplastics in cloud water for first time",
    subreddit: "r/worldnews",
    author: "env_watch",
    time: "6h",
    score: "15.8k",
    comments: 1205,
  },
  {
    id: 8,
    title: "What movie do you consider a 10/10?",
    subreddit: "r/movies",
    author: "cinephile",
    time: "8h",
    score: "9.3k",
    comments: 4521,
  },
];

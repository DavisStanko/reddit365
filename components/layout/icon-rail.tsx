"use client";

import { useState } from "react";
import {
  Mail,
  Calendar,
  Users,
  MoreHorizontal,
} from "lucide-react";

/* Reddit alien SVG icon as a React component */
function RedditIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.71c.147.322.22.673.22 1.04 0 2.496-2.836 4.52-6.336 4.52-3.5 0-6.336-2.024-6.336-4.52 0-.367.073-.718.22-1.04a1.476 1.476 0 0 1-.468-1.076c0-.82.665-1.484 1.484-1.484.393 0 .75.153 1.018.4 1.005-.688 2.368-1.12 3.888-1.18l.736-3.46a.296.296 0 0 1 .357-.232l2.444.52a1.048 1.048 0 0 1 1.972.492c0 .578-.47 1.048-1.048 1.048-.578 0-1.048-.47-1.048-1.048l-2.168-.46-.644 3.032c1.476.073 2.8.504 3.776 1.176a1.48 1.48 0 0 1 1.018-.4c.82 0 1.484.665 1.484 1.484 0 .43-.184.817-.468 1.088zM9.063 13.236c-.578 0-1.048.47-1.048 1.048s.47 1.048 1.048 1.048 1.048-.47 1.048-1.048-.47-1.048-1.048-1.048zm5.874 0c-.578 0-1.048.47-1.048 1.048s.47 1.048 1.048 1.048 1.048-.47 1.048-1.048-.47-1.048-1.048-1.048zm-5.106 3.73a.296.296 0 0 1 .416-.04c.7.56 1.588.84 2.752.84s2.052-.28 2.752-.84a.296.296 0 0 1 .376.456c-.812.65-1.852.976-3.128.976s-2.316-.326-3.128-.976a.296.296 0 0 1-.04-.416z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "mail", label: "Mail", icon: Mail },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "people", label: "People", icon: Users },
  { id: "feed", label: "Feed", icon: RedditIcon },
];

export function IconRail() {
  const [activeItem, setActiveItem] = useState<string>("mail");

  return (
    <nav
      className="icon-rail"
      aria-label="Main navigation"
    >
      {/* Top navigation items */}
      <div className="icon-rail__top">
        {NAV_ITEMS.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`icon-rail__item ${isActive ? "icon-rail__item--active" : ""}`}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator bar */}
              <span
                className={`icon-rail__indicator ${isActive ? "icon-rail__indicator--active" : ""}`}
              />
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      {/* Bottom section: overflow / settings */}
      <div className="icon-rail__bottom">
        <button
          className="icon-rail__item"
          title="More options"
          aria-label="More options"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
    </nav>
  );
}

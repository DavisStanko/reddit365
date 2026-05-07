"use client";

import { useState } from "react";
import {
  Mail,
  Calendar,
  Users,
  CheckSquare,
  FileText,
  Network,
  Cloud,
  LayoutGrid,
  MoreHorizontal,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "mail", label: "Mail", icon: Mail },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "people", label: "People", icon: Users },
  { id: "todo", label: "To Do", icon: CheckSquare },
  { id: "word", label: "Word", icon: FileText },
  { id: "groups", label: "Groups", icon: Network },
  { id: "cloud", label: "OneDrive", icon: Cloud },
  { id: "apps", label: "Apps", icon: LayoutGrid },
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

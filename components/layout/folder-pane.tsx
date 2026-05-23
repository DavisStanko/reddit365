"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  TrendingUp,
  Hash,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useAppContext, SubredditItem } from "@/components/app-context";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const FAVORITES: SubredditItem[] = [
  { id: "all", label: "r/all", icon: Globe },
  { id: "popular", label: "r/popular", icon: TrendingUp },
];

function SortableFolderItem({
  item,
  isActive,
  onSelect,
  onRemove,
}: {
  item: SubredditItem;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = item.icon;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <li ref={setNodeRef} style={style} className="folder-item-wrapper">
      <div
        className={`folder-item ${isActive ? "folder-item--active" : ""}`}
        onClick={() => onSelect(item.id)}
        aria-current={isActive ? "page" : undefined}
        {...attributes}
        {...listeners}
      >
        <Icon size={16} className="folder-item__icon" />
        <span className="folder-item__label">{item.label}</span>
        {onRemove && (
          <div
            className="folder-item__more"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical size={14} className="folder-item__more-icon" />
            {menuOpen && (
              <div className="folder-item__menu">
                <button
                  className="folder-item__menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

interface FolderGroupProps {
  title: string;
  items: SubredditItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
  defaultExpanded?: boolean;
  sortable?: boolean;
}

function FolderGroup({
  title,
  items,
  activeId,
  onSelect,
  onRemove,
  defaultExpanded = true,
  sortable = false,
}: FolderGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const listContent = items.map((item) => (
    <SortableFolderItem
      key={item.id}
      item={item}
      isActive={activeId === item.id}
      onSelect={onSelect}
      onRemove={onRemove}
    />
  ));

  return (
    <div className="folder-group">
      <button
        className="folder-group__header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown size={12} className="folder-group__chevron" />
        ) : (
          <ChevronRight size={12} className="folder-group__chevron" />
        )}
        <span className="folder-group__title">{title}</span>
      </button>
      {expanded && (
        <ul className="folder-group__list">
          {sortable ? (
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {listContent}
            </SortableContext>
          ) : (
            listContent
          )}
        </ul>
      )}
    </div>
  );
}

export function FolderPane() {
  const { activeFeed, setActiveFeed, subreddits, removeSubreddit, reorderSubreddits } = useAppContext();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = subreddits.findIndex((i) => i.id === active.id);
      const newIndex = subreddits.findIndex((i) => i.id === over.id);
      reorderSubreddits(oldIndex, newIndex);
    }
  };

  return (
    <aside className="folder-pane" aria-label="Subreddit folders">
      <div className="folder-pane__content">
        <FolderGroup
          title="Favorites"
          items={FAVORITES}
          activeId={activeFeed}
          onSelect={setActiveFeed}
        />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <FolderGroup
            title="Subscriptions"
            items={subreddits}
            activeId={activeFeed}
            onSelect={setActiveFeed}
            onRemove={removeSubreddit}
            sortable
          />
        </DndContext>
      </div>
    </aside>
  );
}

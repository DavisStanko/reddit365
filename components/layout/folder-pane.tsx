"use client";

import { useState } from "react";
import {
  ChevronDown,
  Globe,
  TrendingUp,
  Trash2,
  Plus,
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
  { id: "all", label: "all", icon: Globe },
  { id: "popular", label: "popular", icon: TrendingUp },
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

  return (
    <li ref={setNodeRef} style={style} className="folder-item-wrapper">
      <div
        className={`folder-item ${isActive ? "folder-item--active" : ""}`}
        onClick={() => onSelect(item.id)}
        aria-current={isActive ? "page" : undefined}
        {...attributes}
        {...listeners}
      >
        <Icon size={18} strokeWidth={1.5} className="folder-item__icon" />
        <span className="folder-item__label">{item.label.startsWith("r/") ? item.label.slice(2) : item.label}</span>
        {onRemove && (
          <button
            className="folder-item__delete-btn"
            aria-label={`Remove ${item.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 size={14} className="folder-item__delete-icon" />
          </button>
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
  sortable = false,
}: FolderGroupProps) {
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
      <div className="folder-group__header">
        <ChevronDown size={12} className="folder-group__chevron" />
        <span className="folder-group__title">{title}</span>
      </div>
      <ul className="folder-group__list">
          {sortable ? (
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {listContent}
            </SortableContext>
          ) : (
            listContent
          )}
        </ul>
    </div>
  );
}

export function FolderPane() {
  const { activeFeed, setActiveFeed, subreddits, removeSubreddit, reorderSubreddits, addSubreddit } = useAppContext();
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
        <DndContext 
          id="folder-pane-dnd"
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <FolderGroup
            title="Subscriptions"
            items={subreddits}
            activeId={activeFeed}
            onSelect={setActiveFeed}
            onRemove={removeSubreddit}
            sortable
          />
        </DndContext>
        <div 
          className="folder-pane__add-btn" 
          onClick={() => setShowAddDialog(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowAddDialog(true);
            }
          }}
        >
          <Plus size={18} strokeWidth={1.5} className="folder-pane__add-icon" />
          <span className="folder-item__label">add feed</span>
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
    </aside>
  );
}

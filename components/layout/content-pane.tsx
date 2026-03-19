"use client";

export function ContentPane() {
  return (
    <section className="content-pane" aria-label="Content">
      <div className="content-pane__empty">
        <div className="content-pane__empty-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="8"
              y="12"
              width="48"
              height="40"
              rx="4"
              stroke="#C4C4C4"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M8 20L32 36L56 20"
              stroke="#C4C4C4"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
        <h2 className="content-pane__empty-title">Select an item to read</h2>
        <p className="content-pane__empty-subtitle">
          Nothing is selected. Choose a post from the list to view it here.
        </p>
      </div>
    </section>
  );
}

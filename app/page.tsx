export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="flex h-12 items-center border-b bg-blue-600 px-4 text-white">
        <h1 className="text-lg font-semibold">Outlook</h1>
      </header>
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/30 p-4">
          <nav className="space-y-2">
            {/* Outlook-style navigation items will go here */}
            <div className="font-medium">Inbox</div>
            <div className="text-muted-foreground">Sent Items</div>
            <div className="text-muted-foreground">Drafts</div>
          </nav>
        </aside>
        {/* Email List / Subreddits */}
        <section className="flex w-1/3 flex-col border-r bg-background">
          <div className="border-b p-4 font-semibold">Focused</div>
          <div className="flex-1 overflow-auto p-4 text-sm text-muted-foreground">
            No items to show.
          </div>
        </section>
        {/* Reading Pane / Post Content */}
        <section className="flex-1 bg-background p-4 flex items-center justify-center text-muted-foreground">
          Select an item to read
        </section>
      </main>
    </div>
  );
}

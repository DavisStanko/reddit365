import type { Metadata } from "next";
import "./globals.css";
import "./outlook.css";

export const metadata: Metadata = {
  title: "Outlook",
  description: "Outlook email client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

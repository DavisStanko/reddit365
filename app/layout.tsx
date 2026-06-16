import type { Metadata } from "next";
import "./outlook.css";

export const metadata: Metadata = {
  title: "Outlook",
  description: "A Reddit client disguised as Microsoft Outlook",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

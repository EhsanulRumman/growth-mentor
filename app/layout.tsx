import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Mentor",
  description: "Weekly scorecard for 10x goal achievement across health, soft skills, and education.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import ToasterProvider from "@/components/ToasterProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agents Dashboard",
  description: "Memory management for Claude Code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}

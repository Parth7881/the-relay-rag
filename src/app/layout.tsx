import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Relay RAG — Private document intelligence",
  description: "Upload PDFs, retrieve supporting passages locally, and get citation-grounded answers.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "The Relay RAG",
    description: "Private, evidence-grounded PDF question answering.",
    type: "website"
  }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="black" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

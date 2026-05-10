import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOTS — Derivatives Ops & Trading Surveillance",
  description:
    "Multi-asset trading dashboard with synthetic trader profiles and anomaly detection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-ink min-h-screen">{children}</body>
    </html>
  );
}

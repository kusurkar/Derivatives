import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AnomalyTicker } from "@/components/AnomalyTicker";

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
      <body className="bg-bg text-ink min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AnomalyTicker />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

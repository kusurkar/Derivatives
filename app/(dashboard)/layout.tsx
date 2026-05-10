import { Sidebar } from "@/components/Sidebar";
import { AnomalyTicker } from "@/components/AnomalyTicker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AnomalyTicker />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

import OperatorSidebar from "@/components/operator/Sidebar";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <OperatorSidebar />
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 px-4 py-4 lg:p-8 bg-slate-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}

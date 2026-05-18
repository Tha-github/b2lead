import ClientSidebar from "@/components/client/Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <ClientSidebar />
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 px-4 py-4 lg:p-8 bg-slate-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}

import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 transition-all">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

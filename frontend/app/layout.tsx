import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SKLENTR Task Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}

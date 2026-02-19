'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { KanbanColumnsProvider } from '@/context/KanbanColumnsContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { NotificationProvider } from '@/context/NotificationContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <NotificationProvider>
            <KanbanColumnsProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </KanbanColumnsProvider>
          </NotificationProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

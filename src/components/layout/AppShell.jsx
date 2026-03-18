'use client';

import { useAuth } from '@/lib/AuthContext';
import LoginPage from '@/components/auth/LoginPage';
import Sidebar from '@/components/layout/Sidebar';

export default function AppShell({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Auth loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b1120', color: '#94a3b8', gap: '1rem', flexDirection: 'column' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '0.875rem' }}>Cargando...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in — show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Logged in — show app
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

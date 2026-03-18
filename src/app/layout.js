import './globals.css';
import { DataProvider } from '@/lib/DataContext';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'SCPSC — Sistema de Comprobantes de Pago',
  description: 'Sistema de cálculo y generación de comprobantes de pago quincenal para Residencia Santa Clara S.R.L.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <AppShell>
                {children}
              </AppShell>
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

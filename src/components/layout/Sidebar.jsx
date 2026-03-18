'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useData } from '@/lib/DataContext';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard,
  Settings,
  Users,
  Receipt,
  Calculator,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  Menu,
  X,
  AlertCircle,
  LogOut
} from 'lucide-react';

const navSections = [
  {
    label: 'Datos',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/empleados', label: 'Empleados', icon: Users },
    ]
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/vales', label: 'Vales / Adelantos', icon: Receipt },
      { href: '/incidencias', label: 'Incidencias', icon: AlertCircle },
      { href: '/planilla', label: 'Planilla', icon: Calculator },
    ]
  },
  {
    label: 'Consultas',
    items: [
      { href: '/reportes', label: 'Reportes', icon: FileText },
      { href: '/configuracion', label: 'Configuración', icon: Settings },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state } = useData();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile toggle button — inline styles to avoid scoping issues */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
        style={{
          position: 'fixed',
          top: '0.75rem',
          left: '0.75rem',
          zIndex: 1001,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #10b981',
          borderRadius: '8px',
          color: '#10b981',
          padding: 0,
          cursor: 'pointer',
          width: '42px',
          height: '42px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5), 0 0 8px rgba(16,185,129,0.2)',
        }}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        {/* Logo header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Building2 size={20} />
            </div>
            {/* Always render but hide via CSS when collapsed on desktop */}
            <div className="sidebar-logo-text sidebar-collapsible">
              <span className="sidebar-logo-title">SCPSC</span>
              <span className="sidebar-logo-subtitle">Santa Clara S.R.L.</span>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {sIdx > 0 && <div className="sidebar-divider" />}
              <div className="sidebar-section-label sidebar-collapsible">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={19} className="sidebar-link-icon" />
                    <span className="sidebar-link-label sidebar-collapsible">{item.label}</span>
                    {isActive && <div className="sidebar-active-indicator" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer sidebar-collapsible">
          <div className="sidebar-footer-text">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.nombre || 'Usuario'}</span>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>CJ: 3-102-754033 · v2.0</span>
          </div>
          <button
            onClick={logout}
            className="sidebar-logout-btn"
            title="Cerrar Sesión"
          >
            <LogOut size={15} />
          </button>
        </div>

        <style jsx>{`
          .mobile-menu-btn {
            display: none;
            position: fixed;
            top: 0.75rem;
            left: 0.75rem;
            z-index: 1001;
            background: var(--bg-secondary);
            border: 1px solid var(--accent-500);
            border-radius: var(--radius-sm);
            color: var(--accent-400);
            padding: 0.5rem;
            cursor: pointer;
            transition: all var(--transition-fast);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), var(--shadow-glow-sm);
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
          }

          .mobile-menu-btn:hover {
            background: var(--bg-tertiary);
            border-color: var(--accent-400);
            color: var(--accent-300);
          }

          .sidebar-overlay {
            display: none;
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: var(--sidebar-width);
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-primary);
            display: flex;
            flex-direction: column;
            z-index: 100;
            transition: width var(--transition-slow);
            overflow: hidden;
          }

          .sidebar--collapsed {
            width: var(--sidebar-collapsed);
          }

          .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 0.875rem;
            border-bottom: 1px solid var(--border-primary);
            min-height: var(--header-height);
          }

          .sidebar-logo {
            display: flex;
            align-items: center;
            gap: 0.625rem;
            overflow: hidden;
          }

          .sidebar-logo-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--accent-500), var(--accent-700));
            border-radius: var(--radius-sm);
            color: white;
            flex-shrink: 0;
            box-shadow: var(--shadow-glow-sm);
          }

          .sidebar-logo-text {
            display: flex;
            flex-direction: column;
            animation: fadeIn 0.2s ease;
          }

          .sidebar-logo-title {
            font-size: 0.9375rem;
            font-weight: 800;
            color: var(--text-primary);
            letter-spacing: 0.04em;
          }

          .sidebar-logo-subtitle {
            font-size: 0.625rem;
            color: var(--text-muted);
            letter-spacing: 0.02em;
          }

          .sidebar-toggle {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-sm);
            color: var(--text-secondary);
            padding: 0.25rem;
            cursor: pointer;
            transition: all var(--transition-fast);
            flex-shrink: 0;
          }

          .sidebar-toggle:hover {
            color: var(--text-primary);
            background: var(--border-secondary);
          }

          .sidebar-nav {
            flex: 1;
            padding: 0.5rem 0.5rem;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
          }

          .sidebar-nav > div {
            display: flex;
            flex-direction: column;
          }

          .sidebar-divider {
            height: 1px;
            background: var(--border-primary);
            margin: 0.375rem 0.5rem;
          }

          .sidebar-section-label {
            font-size: 0.5625rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--text-muted);
            padding: 0.625rem 0.75rem 0.25rem;
          }

          .sidebar-link {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.625rem;
            padding: 0.5625rem 0.75rem;
            border-radius: var(--radius-sm);
            color: var(--text-secondary);
            font-size: 0.8125rem;
            font-weight: 450;
            text-decoration: none;
            transition: all var(--transition-fast);
            overflow: hidden;
            margin: 1px 0;
          }

          .sidebar-link:hover {
            background: rgba(31, 41, 55, 0.8);
            color: var(--text-primary);
          }

          .sidebar-link--active {
            background: rgba(16, 185, 129, 0.1);
            color: var(--accent-400);
            font-weight: 500;
          }

          .sidebar-link--active:hover {
            background: rgba(16, 185, 129, 0.15);
          }

          .sidebar-link-icon {
            flex-shrink: 0;
          }

          .sidebar-link-label {
            white-space: nowrap;
            animation: fadeIn 0.2s ease;
          }

          .sidebar-collapsible {
            overflow: hidden;
            transition: opacity 0.2s ease, width 0.2s ease;
          }

          .sidebar--collapsed .sidebar-collapsible {
            display: none;
          }

          .sidebar-active-indicator {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 55%;
            background: var(--accent-500);
            border-radius: 0 var(--radius-full) var(--radius-full) 0;
          }

          .sidebar-footer {
            padding: 0.875rem;
            border-top: 1px solid var(--border-primary);
            animation: fadeIn 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .sidebar-footer-text {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
          }

          .sidebar-logout-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: var(--radius-sm);
            background: transparent;
            border: 1px solid var(--border-primary);
            color: var(--text-muted);
            cursor: pointer;
            transition: all var(--transition-fast);
            flex-shrink: 0;
          }

          .sidebar-logout-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
            color: #f87171;
          }

          @media (max-width: 768px) {
            .mobile-menu-btn {
              display: flex;
            }

            .sidebar-overlay {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.6);
              backdrop-filter: blur(2px);
              z-index: 999;
              animation: fadeIn 0.2s ease;
            }

            .sidebar {
              transform: translateX(-100%);
              width: var(--sidebar-width) !important;
              z-index: 1000;
              box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
            }

            .sidebar--mobile-open {
              transform: translateX(0);
            }

            .sidebar--collapsed {
              width: var(--sidebar-width) !important;
            }

            /* Force all collapsible elements visible on mobile drawer */
            .sidebar--collapsed .sidebar-collapsible {
              display: flex !important;
            }

            .sidebar--collapsed .sidebar-link-label,
            .sidebar--collapsed .sidebar-section-label {
              display: inline !important;
            }

            .sidebar-toggle {
              display: none;
            }
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </aside>
    </>
  );
}

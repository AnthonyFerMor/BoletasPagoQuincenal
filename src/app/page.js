'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Users, Calculator, Receipt, DollarSign, Activity, Clock, Plus, AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import { useData } from '@/lib/DataContext';

export default function DashboardPage() {
  const { state } = useData();

  const activos = state.empleados.filter(e => e.activo).length;
  const totalEmpleados = state.empleados.length;
  const totalBoletas = state.boletas.length;

  // Only count vales NOT yet covered by a processed period
  const periodosProcesados = state.periodos.filter(p => p.estado === 'procesado');
  const valesPendientes = state.vales.filter(v => {
    // A vale is "pending" if no processed period covers its date
    return !periodosProcesados.some(p => v.fecha >= p.fechaInicio && v.fecha <= p.fechaFin);
  });
  const totalValesPendientes = valesPendientes.reduce((sum, v) => sum + v.monto, 0);
  // Show the period whose date range covers TODAY, regardless of estado
  const periodoActual = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    // First try: period that covers today's date
    const covering = state.periodos.find(p => p.fechaInicio <= today && p.fechaFin >= today);
    if (covering) return covering;
    // Fallback: most recent open period
    return state.periodos.find(p => p.estado === 'abierto') || null;
  }, [state.periodos]);
  const pendientesCount = state.incidencias.filter(i => !i.procesada).length;

  const totalPlanilla = useMemo(() => {
    if (state.boletas.length === 0) return 0;
    return state.boletas.reduce((sum, b) => sum + (b.liquidoPagar || 0), 0);
  }, [state.boletas]);

  function formatColones(n) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 }).format(n);
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days}d`;
  }

  // Calculate period progress
  const periodProgress = useMemo(() => {
    if (!periodoActual) return 0;
    const start = new Date(periodoActual.fechaInicio + 'T00:00:00');
    const end = new Date(periodoActual.fechaFin + 'T23:59:59');
    const now = new Date();
    if (now < start) return 0;
    if (now > end) return 100;
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.round((elapsed / total) * 100);
  }, [periodoActual]);

  const stats = [
    {
      label: 'Empleados Activos',
      value: `${activos}`,
      subtitle: `de ${totalEmpleados} registrados`,
      icon: Users,
      color: 'var(--accent-500)',
    },
    {
      label: 'Planilla Total',
      value: totalPlanilla > 0 ? formatColones(totalPlanilla) : '—',
      subtitle: 'Última procesada',
      icon: DollarSign,
      color: 'var(--status-info)',
    },
    {
      label: 'Vales Pendientes',
      value: totalValesPendientes > 0 ? formatColones(totalValesPendientes) : 'Sin pendientes',
      subtitle: `${valesPendientes.length} de ${state.vales.length} vales por descontar`,
      icon: Receipt,
      color: totalValesPendientes > 0 ? 'var(--status-warning)' : 'var(--accent-500)',
    },
    {
      label: 'Boletas Generadas',
      value: totalBoletas.toString(),
      subtitle: 'Historial completo',
      icon: Calculator,
      color: 'var(--status-success)',
    },
  ];

  const actividad = state.actividad.slice(0, 8);

  const quickActions = [
    { href: '/vales', label: 'Registrar Vale', icon: Plus, desc: 'Nuevo adelanto' },
    { href: '/incidencias', label: 'Nueva Incidencia', icon: AlertCircle, desc: 'Ausencia / Tardía' },
    { href: '/planilla', label: 'Procesar Planilla', icon: Calculator, desc: 'Calcular nómina' },
    { href: '/reportes', label: 'Ver Reportes', icon: ArrowRight, desc: 'Historial completo' },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Residencia Santa Clara S.R.L. — Panel de control</p>
        </div>
      </div>

      {/* Current Period Banner */}
      {periodoActual && (
        <div className="period-banner mb-3">
          <div className="banner-content mb-2">
            <div className="banner-left">
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                  {periodoActual.tipo === 'primera_quincena' ? '1ra Quincena' : '2da Quincena'} — {periodoActual.mes}
                </div>
                <div className="text-sm text-muted">{periodoActual.fechaInicio} al {periodoActual.fechaFin}</div>
              </div>
            </div>
            <div className="banner-right">
              <span className={`badge ${periodoActual.estado === 'procesado' ? 'badge-success' : 'badge-warning'}`}>
                <Clock size={12} /> {periodoActual.estado === 'procesado' ? 'PROCESADO' : 'PERÍODO ACTIVO'}
              </span>
              <span className="text-sm font-mono" style={{ color: 'var(--accent-400)' }}>{periodProgress}%</span>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${periodProgress}%` }} />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid stagger-children">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="card-icon" style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}cc)` }}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="card-value">{stat.value}</div>
              <div className="card-label">{stat.label}</div>
              <div className="text-xs text-muted mt-1">{stat.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <h2 className="section-title mb-2">Acciones Rápidas</h2>
      <div className="responsive-cards-grid-sm stagger-children" style={{ marginBottom: '1.75rem' }}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="quick-action">
              <div className="quick-action-icon">
                <Icon size={22} />
              </div>
              <div className="quick-action-label">{action.label}</div>
              <div className="text-xs text-muted">{action.desc}</div>
            </Link>
          );
        })}
      </div>

      <div className="responsive-grid-2">
        {/* Recent Activity */}
        <div className="card" style={{ gridColumn: actividad.length === 0 ? '1 / -1' : undefined }}>
          <div className="flex items-center gap-sm mb-2">
            <Activity size={18} style={{ color: 'var(--accent-400)' }} />
            <h2 className="section-title" style={{ marginBottom: 0 }}>Actividad Reciente</h2>
          </div>
          {actividad.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <Activity size={32} style={{ color: 'var(--border-secondary)', marginBottom: '0.75rem' }} />
              <p className="text-sm text-muted">Las acciones del sistema aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {actividad.map((item, i) => (
                <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                  <div className="flex items-center gap-sm">
                    <span className={`badge badge-${item.tipo}`}>{item.accion}</span>
                    <span className="text-sm">{item.detalle}</span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{timeAgo(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Incidencias */}
        <div className="card">
          <div className="flex items-center gap-sm mb-2">
            <AlertCircle size={18} style={{ color: pendientesCount > 0 ? 'var(--status-warning)' : 'var(--accent-400)' }} />
            <h2 className="section-title" style={{ marginBottom: 0 }}>Incidencias Pendientes</h2>
            {pendientesCount > 0 && <span className="badge badge-warning ml-auto">{pendientesCount}</span>}
          </div>
          {pendientesCount === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <AlertCircle size={24} style={{ color: 'var(--accent-400)' }} />
              </div>
              <div className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>Sin incidencias pendientes</div>
              <p className="text-xs text-muted mt-1">Todas las incidencias han sido procesadas.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {state.incidencias.filter(i => !i.procesada).slice(0, 6).map((inc) => {
                const emp = state.empleados.find(e => e.id === inc.empleadoId);
                return (
                  <div key={inc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                    <div>
                      <div className="text-sm font-medium">{emp?.nombre || 'Desconocido'}</div>
                      <div className="text-xs text-muted">{inc.tipo} — {inc.fechaInicio}</div>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Pendiente</span>
                  </div>
                );
              })}
              {pendientesCount > 6 && (
                <Link href="/incidencias" className="text-sm text-accent" style={{ display: 'block', padding: '0.5rem 0' }}>
                  Ver todas ({pendientesCount})...
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

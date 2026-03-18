'use client';

import { useState, useMemo } from 'react';
import { FileText, Calendar, Search, ArrowRight, Eye, AlertCircle, TrendingUp, TrendingDown, DollarSign, Download } from 'lucide-react';
import { useData } from '@/lib/DataContext';
import Modal from '@/components/ui/Modal';
import { formatColones } from '@/lib/calculo-engine';
import { exportMultipleToPDF } from '@/lib/pdf-export';
import BoletaImpresion from '@/components/planilla/BoletaImpresion';
import { useToast } from '@/components/ui/Toast';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getMesLabel(periodo) {
  if (periodo.mes) return periodo.mes;
  // Reconstruct from fechaInicio
  const d = new Date(periodo.fechaInicio + 'T12:00:00');
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ReportesPage() {
  const { state } = useData();
  const { addToast } = useToast();
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [search, setSearch] = useState('');
  const [boletaDetalle, setBoletaDetalle] = useState(null);

  const periodosCerrados = useMemo(() => {
    return state.periodos
      .filter(p => p.estado === 'cerrado' || p.estado === 'procesado')
      .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
  }, [state.periodos]);

  function getBoletasPorPeriodo(periodoId) {
    const q = search.toLowerCase();
    return state.boletas.filter(b => 
      b.periodoId === periodoId && 
      (!search || b.empleadoNombre.toLowerCase().includes(q))
    );
  }

  function getTotalesPeriodo(boletas) {
    return boletas.reduce((acc, b) => ({
      brutos: acc.brutos + b.salarioBrutoQuincenal,
      ccss: acc.ccss + b.deduccionCCSS,
      extras: acc.extras + b.totalExtras,
      vales: acc.vales + b.totalVales,
      ausencias: acc.ausencias + (b.deduccionHoras || 0),
      aguinaldos: acc.aguinaldos + (b.aguinaldo || 0),
      liquido: acc.liquido + b.liquidoPagar
    }), { brutos: 0, ccss: 0, extras: 0, vales: 0, ausencias: 0, aguinaldos: 0, liquido: 0 });
  }

  const fmt = (n) => formatColones(n);

  async function handleDescargarPeriodo(periodoId, boletas, e) {
    if (e) e.stopPropagation();
    if (!boletas || boletas.length === 0) {
      addToast('No hay boletas para descargar.', 'error');
      return;
    }
    addToast('Generando PDF...', 'info');
    const periodo = periodosCerrados.find(p => p.id === periodoId);
    let filename = 'Boletas-Historica.pdf';
    if (periodo) {
      const mesLabel = getMesLabel(periodo);
      const qLabel = periodo.tipo === 'primera_quincena' ? '1ra-Quincena' : '2da-Quincena';
      filename = `Boletas-${qLabel}-${mesLabel.replace(/\s+/g, '-')}.pdf`;
    }
    
    setTimeout(async () => {
      const success = await exportMultipleToPDF(`print-container-${periodoId}`, filename);
      if (success) {
        addToast('PDF generado correctamente.', 'success');
      } else {
        addToast('Error al generar PDF. Intente expandir la sección primero.', 'error');
      }
    }, 500);
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="page-title">Reportes e Historial</h1>
          <p className="page-subtitle">Planillas procesadas y boletas de pago</p>
        </div>
      </div>

      <div className="card mb-3" style={{ padding: '0.625rem 1rem' }}>
        <div className="flex items-center gap-sm">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar empleado en historiales..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-md">
        {periodosCerrados.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No hay planillas procesadas</h3>
            <p className="text-muted">Procese una planilla desde el módulo correspondiente.</p>
          </div>
        ) : (
          periodosCerrados.map(periodo => {
            const boletas = getBoletasPorPeriodo(periodo.id);
            if (search && boletas.length === 0) return null;
            
            const isExpanded = expandedPeriod === periodo.id;
            const totales = getTotalesPeriodo(boletas);

            return (
              <div key={periodo.id} className="card p-0 overflow-hidden">
                <div 
                  className="flex items-center justify-between cursor-pointer" 
                  style={{ padding: '1.25rem', background: isExpanded ? 'rgba(31,41,55,0.5)' : 'transparent', transition: 'background var(--transition-fast)' }}
                  onClick={() => setExpandedPeriod(isExpanded ? null : periodo.id)}
                >
                  <div className="flex items-center gap-md">
                    <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {periodo.tipo === 'primera_quincena' ? '1ra Quincena' : '2da Quincena'} de {getMesLabel(periodo)}
                      </div>
                      <div className="text-sm text-muted">{periodo.fechaInicio} al {periodo.fechaFin} · {boletas.length} boletas</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-md">
                    <button 
                      onClick={(e) => handleDescargarPeriodo(periodo.id, boletas, e)}
                      className="btn btn-outline btn-sm"
                    >
                      <Download size={14} /> PDF
                    </button>
                    <div className="text-right" style={{ minWidth: '120px' }}>
                      <div className="text-xs text-muted uppercase">Pagado</div>
                      <div className="font-mono font-bold" style={{ color: 'var(--accent-400)' }}>{fmt(totales.liquido)}</div>
                    </div>
                    <ArrowRight 
                      size={18} 
                      style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform var(--transition-fast)' }} 
                    />
                  </div>
                </div>

                {/* Hidden container remains even when collapsed to allow PDF generation */}
                <div id={`print-container-${periodo.id}`} style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
                  {boletas.map(b => (
                    <BoletaImpresion 
                       key={b.empleadoId} 
                       boleta={b} 
                       periodo={periodo} 
                       empleado={state.empleados.find(e => e.id === b.empleadoId)} 
                    />
                  ))}
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border-primary)' }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '1rem' }}>
                        <div className="flex items-center gap-sm text-muted text-xs mb-1"><TrendingUp size={13}/> Total Extras</div>
                        <div className="font-mono font-semibold">{fmt(totales.extras)}</div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '1rem' }}>
                        <div className="flex items-center gap-sm text-muted text-xs mb-1"><TrendingDown size={13} color="var(--status-danger)"/> CCSS</div>
                        <div className="font-mono" style={{ color: 'var(--status-danger)' }}>-{fmt(totales.ccss)}</div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '1rem' }}>
                        <div className="flex items-center gap-sm text-muted text-xs mb-1"><AlertCircle size={13} color="var(--status-warning)"/> Ausencias</div>
                        <div className="font-mono" style={{ color: 'var(--status-warning)' }}>-{fmt(totales.ausencias)}</div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '1rem' }}>
                        <div className="flex items-center gap-sm text-muted text-xs mb-1"><DollarSign size={13}/> Vales</div>
                        <div className="font-mono">{fmt(totales.vales)}</div>
                      </div>
                    </div>

                    <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none', borderTop: '1px solid var(--border-primary)' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Cédula</th>
                            <th>Empleado</th>
                            <th>Sal. Bruto</th>
                            <th>Extras</th>
                            <th>Deducciones</th>
                            <th>Líquido</th>
                            <th style={{ textAlign: 'right' }}>Boleta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boletas.length === 0 ? (
                            <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>No hay boletas.</td></tr>
                          ) : boletas.map(b => {
                            const emp = state.empleados.find(e => e.id === b.empleadoId);
                            const dedTotales = b.deduccionCCSS + b.totalVales + (b.deduccionHoras || 0);

                            return (
                              <tr key={b.empleadoId}>
                                <td className="font-mono text-sm text-muted">{emp?.cedula}</td>
                                <td className="font-medium">{b.empleadoNombre}</td>
                                <td className="font-mono text-sm">{fmt(b.salarioBrutoQuincenal)}</td>
                                <td className="font-mono text-sm" style={{ color: b.totalExtras > 0 ? 'var(--status-info)' : 'inherit' }}>
                                  {b.totalExtras > 0 ? `+${fmt(b.totalExtras)}` : '—'}
                                </td>
                                <td className="font-mono text-sm" style={{ color: dedTotales > 0 ? 'var(--status-danger)' : 'inherit' }}>
                                  {dedTotales > 0 ? `-${fmt(dedTotales)}` : '—'}
                                </td>
                                <td className="font-mono font-bold" style={{ color: 'var(--accent-400)' }}>{fmt(b.liquidoPagar)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-400)' }} onClick={(e) => { e.stopPropagation(); setBoletaDetalle(b); }}>
                                    <Eye size={14} /> Ver
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
              </div>
            );
          })
        )}
      </div>

      {boletaDetalle && (
        <Modal 
          isOpen={!!boletaDetalle} 
          onClose={() => setBoletaDetalle(null)} 
          title="Desglose de Pago Histórico"
          size="lg"
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
             <BoletaImpresion 
               boleta={boletaDetalle} 
               periodo={state.periodos.find(p => p.id === boletaDetalle.periodoId) || { fechaInicio: '---', fechaFin: '---' }} 
               empleado={state.empleados.find(e => e.id === boletaDetalle.empleadoId)} 
             />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn btn-primary" onClick={() => exportMultipleToPDF('boleta-single-hist-print', `Boleta-${boletaDetalle.empleadoNombre.replace(/\s+/g, '-')}.pdf`)}>
                <Download size={16} /> Descargar PDF
            </button>
          </div>

          <div id="boleta-single-hist-print" style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
             <BoletaImpresion 
               boleta={boletaDetalle} 
               periodo={state.periodos.find(p => p.id === boletaDetalle.periodoId) || { fechaInicio: '---', fechaFin: '---' }} 
               empleado={state.empleados.find(e => e.id === boletaDetalle.empleadoId)} 
             />
          </div>
        </Modal>
      )}
    </div>
  );
}

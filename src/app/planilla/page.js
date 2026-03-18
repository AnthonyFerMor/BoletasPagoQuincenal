'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calculator, Play, CheckCircle, AlertTriangle, Clock, Eye, AlertCircle, Gift, Download, User } from 'lucide-react';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/components/ui/Toast';
import { calcularBoleta, formatColones, calcularHorasMensuales, calcularHorasIncidencias } from '@/lib/calculo-engine';
import { estimarAguinaldoHistorico } from '@/lib/calculo-aguinaldo';
import { exportToPDF, exportMultipleToPDF } from '@/lib/pdf-export';
import Modal from '@/components/ui/Modal';
import BoletaImpresion from '@/components/planilla/BoletaImpresion';

// Avatar color generator
function getAvatarColor(name) {
  const colors = ['#ef4444','#f97316','#f59e0b','#10b981','#14b8a6','#3b82f6','#6366f1','#8b5cf6','#ec4899','#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function PlanillaPage() {
  const { state, dispatch, addActividad } = useData();
  const { addToast } = useToast();
  const [boletaDetalle, setBoletaDetalle] = useState(null);

  // Select period — default to the most recent open period
  const periodosAbiertos = state.periodos.filter(p => p.estado === 'abierto');
  const periodosProcesados = state.periodos.filter(p => p.estado === 'procesado');
  const [selectedPeriodoId, setSelectedPeriodoId] = useState(() => {
    const abierto = state.periodos.find(p => p.estado === 'abierto');
    return abierto?.id || state.periodos[0]?.id || '';
  });

  const periodoActual = state.periodos.find(p => p.id === selectedPeriodoId);

  // Editable payroll data per employee — load from persisted state
  const [payrollData, setPayrollData] = useState(() => {
    const savedEdits = state.payrollEdits?.[selectedPeriodoId] || {};
    const data = {};
    state.empleados.filter(e => e.activo).forEach(emp => {
      data[emp.id] = savedEdits[emp.id] || { horas50: 0, horas200: 0, aguinaldoManual: 0, otrosIngresos: 0, otrasDeducciones: 0 };
    });
    return data;
  });

  // When period changes, load saved edits for that period
  useEffect(() => {
    const savedEdits = state.payrollEdits?.[selectedPeriodoId] || {};
    const data = {};
    state.empleados.filter(e => e.activo).forEach(emp => {
      data[emp.id] = savedEdits[emp.id] || { horas50: 0, horas200: 0, aguinaldoManual: 0, otrosIngresos: 0, otrasDeducciones: 0 };
    });
    setPayrollData(data);
    setResultados({});
  }, [selectedPeriodoId]);

  const [resultados, setResultados] = useState({});

  const empleadosActivos = state.empleados.filter(e => e.activo);

  // Check if current period is the aguinaldo period
  const isAguinaldoPeriod = periodoActual && 
    new Date(periodoActual.fechaInicio).getMonth() + 1 === parseInt(state.parametros.aguinaldo_mes) &&
    periodoActual.tipo === state.parametros.aguinaldo_quincena;

  // Auto-save payroll edits via debounced effect (avoids dispatch during render)
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip the initial mount and period-change resets  
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (selectedPeriodoId) {
        dispatch({ type: 'SAVE_PAYROLL_DATA', payload: { periodoId: selectedPeriodoId, data: payrollData } });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [payrollData, selectedPeriodoId, dispatch]);

  function autocalcularAguinaldos() {
    if (!isAguinaldoPeriod) return;
    setPayrollData(prev => {
      const next = { ...prev };
      empleadosActivos.forEach(emp => {
        const estimado = estimarAguinaldoHistorico(emp.id, state.boletas);
        next[emp.id] = { ...next[emp.id], aguinaldoManual: estimado };
      });
      return next;
    });
    setResultados({});
    addToast('Aguinaldos sugeridos cargados usando historial', 'info');
  }

  function getValesEmpleado(empleadoId) {
    if (!periodoActual) return 0;
    return state.vales
      .filter(v => v.empleadoId === empleadoId && v.fecha >= periodoActual.fechaInicio && v.fecha <= periodoActual.fechaFin)
      .reduce((sum, v) => sum + v.monto, 0);
  }

  function getIncidenciasEmpleado(empleadoId) {
    if (!periodoActual || !periodoActual.fechaInicio || !periodoActual.fechaFin) return [];
    return state.incidencias.filter(i => 
      i.empleadoId === empleadoId && 
      i.fechaInicio >= periodoActual.fechaInicio &&
      i.fechaInicio <= periodoActual.fechaFin &&
      // Include if: NOT processed yet, OR was processed for THIS period
      (!i.procesada || i.periodoId === periodoActual.id)
    );
  }

  function updatePayrollField(empId, field, value) {
    setPayrollData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: parseFloat(value) || 0 }
    }));
    setResultados(prev => { const n = { ...prev }; delete n[empId]; return n; });
  }

  function doCalculation(emp) {
    const pd = payrollData[emp.id] || { horas50: 0, horas200: 0, aguinaldoManual: 0, otrosIngresos: 0, otrasDeducciones: 0 };
    const totalVales = getValesEmpleado(emp.id);
    const incidenciasPendientes = getIncidenciasEmpleado(emp.id);
    const horasDeducidas = calcularHorasIncidencias(incidenciasPendientes, emp.horario);
    const horasMes = calcularHorasMensuales(emp.horario);

    const incidenciasDetalle = incidenciasPendientes.map(inc => ({
      fecha: inc.fechaInicio,
      tipo: inc.tipo,
      justificacion: inc.justificacion,
      id: inc.id
    }));

    return calcularBoleta({
      salarioBruto: emp.salarioBruto,
      porcentajeCCSS: state.parametros.ccss_obrero / 100,
      horasMensuales: horasMes,
      horas50: pd.horas50,
      horas200: pd.horas200,
      factor50: state.parametros.factor_extra_50,
      factor200: state.parametros.factor_extra_100,
      totalVales: totalVales,
      horasDeducidas,
      incidenciasDetalle,
      aguinaldo: pd.aguinaldoManual,
      otrosIngresos: pd.otrosIngresos,
      otrasDeducciones: pd.otrasDeducciones,
    });
  }

  function calcularIndividual(emp) {
    try {
      const boleta = doCalculation(emp);
      setResultados(prev => ({ ...prev, [emp.id]: { ...boleta, empleadoNombre: emp.nombre, empleadoId: emp.id } }));
      addToast(`Boleta calculada para ${emp.nombre}`, 'success');
    } catch (err) {
      addToast(`Error al calcular: ${err.message}`, 'error');
    }
  }

  function procesarTodo() {
    let count = 0;
    const nuevasBoletas = [];
    let incidenciasToMark = []; // Will contain {empleadoId, fechaInicio} objects

    empleadosActivos.forEach(emp => {
      try {
        const boleta = doCalculation(emp);
        const boletaFull = { ...boleta, empleadoNombre: emp.nombre, empleadoId: emp.id, periodoId: periodoActual?.id || 'sin-periodo' };
        setResultados(prev => ({ ...prev, [emp.id]: boletaFull }));
        nuevasBoletas.push(boletaFull);
        
        // Use empleadoId + fechaInicio as stable markers (not client IDs)
        const empIncidencias = getIncidenciasEmpleado(emp.id);
        if (empIncidencias.length > 0) {
          incidenciasToMark.push(...empIncidencias.map(i => ({ empleadoId: i.empleadoId, fechaInicio: i.fechaInicio })));
        }
        count++;
      } catch (err) { /* skip */ }
    });

    if (nuevasBoletas.length > 0) {
      dispatch({ 
        type: 'CLOSE_PAYROLL', 
        payload: { 
          periodoId: periodoActual?.id || 'sin-periodo', 
          boletas: nuevasBoletas,
          incidenciasToMark
        } 
      });
      addActividad('Planilla procesada', `${count} boletas generadas`, 'success');
    }
    addToast(`Planilla procesada: ${count} boletas generadas`, 'success');
  }

  const fmtC = (n) => formatColones(n);
  const todosCalculados = empleadosActivos.every(e => resultados[e.id]) && empleadosActivos.length > 0;

  async function handleDescargarTodas() {
    const quincenaLabel = periodoActual.tipo === 'primera_quincena' ? 'Primer-Quincena' : 'Segunda-Quincena';
    const filename = `Boletas-${quincenaLabel}-${periodoActual.mes.replace(/\s+/g, '-')}.pdf`;
    
    setTimeout(async () => {
      const success = await exportMultipleToPDF('boletas-print-container', filename);
      if (success) {
        addToast('PDF generado correctamente.', 'success');
      } else {
        addToast('Error al generar PDF.', 'error');
      }
    }, 300);
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="page-title">Procesar Planilla</h1>
          <p className="page-subtitle">Motor de cálculo — {empleadosActivos.length} empleados activos</p>
        </div>
        <div className="flex gap-sm">
          {isAguinaldoPeriod && (
            <button className="btn btn-outline" onClick={autocalcularAguinaldos}>
              <Gift size={16} /> Auto-Aguinaldos
            </button>
          )}
          {todosCalculados && (
            <button className="btn btn-outline" onClick={handleDescargarTodas}>
              <Download size={16} /> Descargar PDF
            </button>
          )}
          <button className="btn btn-primary btn-lg" onClick={procesarTodo}>
            <Play size={18} /> Procesar Nómina
          </button>
        </div>
      </div>

      {/* Period selector + info */}
      <div className="period-banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-md">
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                Período de Pago
              </div>
              <div className="text-sm text-muted">Seleccione la quincena a procesar</div>
            </div>
          </div>
          
          <div className="flex items-center gap-md">
            <select 
              className="form-select" 
              value={selectedPeriodoId} 
              onChange={e => setSelectedPeriodoId(e.target.value)}
              style={{ maxWidth: '320px', borderColor: 'var(--accent-500)' }}
            >
              {[
                ...state.periodos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.tipo === 'primera_quincena' ? '1ra Q.' : '2da Q.'} {p.mes} ({p.fechaInicio} al {p.fechaFin}) — {p.estado.toUpperCase()}
                  </option>
                ))
              ]}
            </select>
            {periodoActual && (
              <span className={`badge ${periodoActual.estado === 'abierto' ? 'badge-warning' : 'badge-success'}`}>
                {periodoActual.estado === 'abierto' ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                {periodoActual.estado.toUpperCase()}
              </span>
            )}
            {isAguinaldoPeriod && (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-400)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <Gift size={12} /> AGUINALDO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }} className="stagger-children">
        {empleadosActivos.map((emp) => {
          const pd = payrollData[emp.id] || { horas50: 0, horas200: 0, aguinaldoManual: 0, otrosIngresos: 0, otrasDeducciones: 0 };
          const res = resultados[emp.id];
          const vales = getValesEmpleado(emp.id);
          const incidencias = getIncidenciasEmpleado(emp.id);
          const hrsDeducidas = calcularHorasIncidencias(incidencias, emp.horario);
          
          return (
            <div key={emp.id} className={`payroll-card ${res ? 'payroll-card--processed' : ''}`}>
              {/* Employee header */}
              <div className="flex items-center gap-md mb-3">
                <div className="employee-avatar" style={{ background: `linear-gradient(135deg, ${getAvatarColor(emp.nombre)}, ${getAvatarColor(emp.nombre)}cc)` }}>
                  {getInitials(emp.nombre)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold">{emp.nombre}</div>
                  <div className="text-xs text-muted">{emp.puesto} · {calcularHorasMensuales(emp.horario)}h/mes</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold" style={{ color: 'var(--accent-400)', fontSize: '1.0625rem' }}>{fmtC(emp.salarioBruto)}</div>
                  <div className="text-xs text-muted">Salario Bruto</div>
                </div>
              </div>

              {/* Info chips */}
              <div className="flex gap-sm flex-wrap mb-3">
                {vales > 0 && (
                  <span className="badge badge-warning">Vales: {fmtC(vales)}</span>
                )}
                {incidencias.length > 0 && (
                  <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.7rem' }}>
                    <AlertCircle size={10} /> Deducción: -{hrsDeducidas.toFixed(1)}h
                  </span>
                )}
                {res && (
                  <span className="badge badge-success">
                    <CheckCircle size={10} /> Calculada
                  </span>
                )}
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.875rem' }}>
                <div>
                  <label className="text-xs text-muted block mb-1">H. Extra 50%</label>
                  <input type="number" className="form-input" value={pd.horas50} onChange={e => updatePayrollField(emp.id, 'horas50', e.target.value)} min="0" style={{ padding: '0.5rem 0.625rem' }} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">H. Extra 100%</label>
                  <input type="number" className="form-input" value={pd.horas200} onChange={e => updatePayrollField(emp.id, 'horas200', e.target.value)} min="0" style={{ padding: '0.5rem 0.625rem' }} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Otros Ingresos</label>
                  <input type="number" className="form-input" value={pd.otrosIngresos} onChange={e => updatePayrollField(emp.id, 'otrosIngresos', e.target.value)} min="0" style={{ padding: '0.5rem 0.625rem' }} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Otras Deducc.</label>
                  <input type="number" className="form-input" value={pd.otrasDeducciones} onChange={e => updatePayrollField(emp.id, 'otrasDeducciones', e.target.value)} min="0" style={{ padding: '0.5rem 0.625rem' }} />
                </div>
                {isAguinaldoPeriod && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="text-xs block mb-1" style={{ color: 'var(--accent-400)' }}>Aguinaldo Manual (₡)</label>
                    <input type="number" className="form-input" value={pd.aguinaldoManual} onChange={e => updatePayrollField(emp.id, 'aguinaldoManual', e.target.value)} min="0" style={{ padding: '0.5rem 0.625rem', borderColor: 'var(--accent-500)' }} />
                  </div>
                )}
              </div>

              {/* Result + Actions */}
              <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '0.875rem' }}>
                <div>
                  <div className="text-xs text-muted uppercase">Líquido a Pagar</div>
                  <div className="font-mono font-bold" style={{ fontSize: '1.25rem', color: res ? 'var(--accent-400)' : 'var(--text-muted)' }}>
                    {res ? fmtC(res.liquidoPagar) : '—'}
                  </div>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-outline btn-sm" onClick={() => calcularIndividual(emp)} data-tooltip="Calcular">
                    <Calculator size={15} /> Calcular
                  </button>
                  {res && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-400)' }} onClick={() => setBoletaDetalle(res)}>
                      <Eye size={15} /> Ver
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals Footer */}
      {todosCalculados && (
        <div className="card mt-3" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-md">
              <CheckCircle size={24} style={{ color: 'var(--accent-400)' }} />
              <div>
                <div className="font-semibold">Nómina Completa Calculada</div>
                <div className="text-sm text-muted">{empleadosActivos.length} empleados procesados</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted uppercase">Total a Depositar</div>
              <div className="font-mono font-bold" style={{ fontSize: '1.5rem', color: 'var(--accent-400)' }}>
                {fmtC(Object.values(resultados).reduce((sum, r) => sum + r.liquidoPagar, 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {boletaDetalle && (
        <Modal 
          isOpen={!!boletaDetalle} 
          onClose={() => setBoletaDetalle(null)} 
          title="Desglose de Pago"
          size="lg"
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
             <BoletaImpresion 
               boleta={boletaDetalle} 
               periodo={periodoActual || { fechaInicio: '---', fechaFin: '---' }} 
               empleado={state.empleados.find(e => e.id === boletaDetalle.empleadoId)} 
             />
          </div>
          
          <div className="mt-4 flex justify-end">
            <button 
                className="btn btn-primary" 
                onClick={() => {
                  const qLabel = periodoActual?.tipo === 'primera_quincena' ? '1ra-Q' : '2da-Q';
                  exportMultipleToPDF('boleta-single-print', `Boleta-${boletaDetalle.empleadoNombre.replace(/\s+/g, '-')}-${qLabel}-${periodoActual?.mes.replace(/\s+/g, '-')}.pdf`);
                }}
              >
                <Download size={16} /> Descargar PDF
            </button>
          </div>

          <div id="boleta-single-print" style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
             <BoletaImpresion 
               boleta={boletaDetalle} 
               periodo={periodoActual || { fechaInicio: '---', fechaFin: '---' }} 
               empleado={state.empleados.find(e => e.id === boletaDetalle.empleadoId)} 
             />
          </div>
        </Modal>
      )}

      {/* Hidden container for batch printing */}
      <div id="boletas-print-container" style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
        {Object.values(resultados).map((res) => (
          <BoletaImpresion 
             key={res.empleadoId} 
             boleta={res} 
             periodo={periodoActual || { fechaInicio: '---', fechaFin: '---' }} 
             empleado={state.empleados.find(e => e.id === res.empleadoId)} 
          />
        ))}
      </div>
    </div>
  );
}

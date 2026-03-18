'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, Plus, Filter, Trash2, Save, Clock, FileText, CheckCircle, Eye, Download } from 'lucide-react';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { exportMultipleToPDF } from '@/lib/pdf-export';
import IncidenciaImpresion from '@/components/planilla/IncidenciaImpresion';
import { calcularHorasIncidencias } from '@/lib/calculo-engine';

const TIPOS_INCIDENCIA = [
  { id: 'ausencia', label: 'Ausencia Injustificada (Día completo)' },
  { id: 'incapacidad', label: 'Incapacidad Médica (Rango de fechas)' },
  { id: 'salida_temprana', label: 'Salida Temprana' },
  { id: 'llegada_tarde', label: 'Llegada Tardía' },
  { id: 'permiso', label: 'Permiso sin goce de salario (Manual)' }
];

export default function IncidenciasPage() {
  const { state, dispatch, addActividad } = useData();
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [incidenciaDetalle, setIncidenciaDetalle] = useState(null);
  const [filterEmpleado, setFilterEmpleado] = useState('');
  const [filterEstado, setFilterEstado] = useState('pendientes');
  
  const [form, setForm] = useState({ 
    empleadoId: '', 
    tipo: 'ausencia', 
    fechaInicio: new Date().toISOString().split('T')[0], 
    fechaFin: new Date().toISOString().split('T')[0],
    horaEntrada: '',
    horaSalida: '',
    horasManuales: '',
    justificacion: '' 
  });

  const empleadosActivos = state.empleados.filter(e => e.activo);

  const incidenciasList = useMemo(() => {
    let list = [...state.incidencias].sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
    if (filterEmpleado) list = list.filter(i => i.empleadoId === filterEmpleado);
    if (filterEstado === 'pendientes') list = list.filter(i => !i.procesada);
    if (filterEstado === 'procesadas') list = list.filter(i => i.procesada);
    return list;
  }, [state.incidencias, filterEmpleado, filterEstado]);

  const pendientesCount = state.incidencias.filter(i => !i.procesada).length;

  function getEmpleado(id) {
    return state.empleados.find(e => e.id === id);
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!form.empleadoId || !form.justificacion.trim()) {
      addToast('Complete el empleado y la justificación obligatoria', 'error');
      return;
    }

    if (form.tipo === 'permiso') {
      const horas = parseFloat(form.horasManuales);
      if (isNaN(horas) || horas <= 0) {
        addToast('La cantidad de horas debe ser mayor a 0', 'error');
        return;
      }
    }
    
    const emp = getEmpleado(form.empleadoId);
    
    const data = {
      empleadoId: form.empleadoId,
      tipo: form.tipo,
      fechaInicio: form.fechaInicio,
      justificacion: form.justificacion,
      procesada: false
    };

    if (form.tipo === 'incapacidad') data.fechaFin = form.fechaFin;
    if (form.tipo === 'llegada_tarde') data.horaLlegada = form.horaEntrada;
    if (form.tipo === 'salida_temprana') data.horaSalida = form.horaSalida;
    if (form.tipo === 'permiso') data.horasDeducidas = parseFloat(form.horasManuales) || 0;

    const dedCalculated = calcularHorasIncidencias([data], emp.horario);

    dispatch({ type: 'ADD_INCIDENCIA', payload: { ...data, horasEstimadas: dedCalculated } });
    addActividad('Incidencia registrada', `${emp.nombre} — ${TIPOS_INCIDENCIA.find(t=>t.id===form.tipo).label}`, 'warning');
    addToast(`Incidencia registrada (${dedCalculated.toFixed(1)} hrs est.)`, 'success');
    
    setForm({ ...form, justificacion: '' });
    setModalOpen(false);
  }

  function handleDelete(inc) {
    if (inc.procesada) {
      addToast('No puede eliminar incidencias ya procesadas', 'error');
      setConfirmDelete(null);
      return;
    }
    dispatch({ type: 'DELETE_INCIDENCIA', payload: inc.id });
    addActividad('Incidencia eliminada', 'Registro removido', 'info');
    addToast('Incidencia eliminada', 'success');
    setConfirmDelete(null);
  }

  async function handleDescargarIncidencia(inc) {
    addToast('Generando comprobante PDF...', 'info');
    setTimeout(async () => {
      const emp = getEmpleado(inc.empleadoId);
      const success = await exportMultipleToPDF(
        `incidencia-print-container-${inc.id}`, 
        `Incidencia-${emp?.nombre?.replace(/\s+/g, '-')}-${inc.fechaInicio}.pdf`
      );
      if (success) {
        addToast('PDF generado correctamente.', 'success');
        setIncidenciaDetalle(null);
      } else {
        addToast('Error al generar PDF.', 'error');
      }
    }, 100);
  }

  function renderFormSpecifics() {
    switch (form.tipo) {
      case 'incapacidad':
        return (
          <div className="form-group animate-fade">
            <label className="form-label">Fecha Fin</label>
            <input type="date" className="form-input" value={form.fechaFin} onChange={e => setForm({ ...form, fechaFin: e.target.value })} min={form.fechaInicio} />
            <span className="text-muted text-xs mt-1 block">Rango de fechas de incapacidad.</span>
          </div>
        );
      case 'salida_temprana':
        return (
          <div className="form-group animate-fade">
            <label className="form-label">Hora de salida real</label>
            <input type="time" className="form-input" value={form.horaSalida} onChange={e => setForm({ ...form, horaSalida: e.target.value })} required />
            <span className="text-muted text-xs mt-1 block">Diferencia desde su fin de turno.</span>
          </div>
        );
      case 'llegada_tarde':
        return (
          <div className="form-group animate-fade">
            <label className="form-label">Hora de llegada real</label>
            <input type="time" className="form-input" value={form.horaEntrada} onChange={e => setForm({ ...form, horaEntrada: e.target.value })} required />
            <span className="text-muted text-xs mt-1 block">Diferencia desde su inicio de turno.</span>
          </div>
        );
      case 'permiso':
        return (
          <div className="form-group animate-fade">
            <label className="form-label">Horas a descontar *</label>
            <input type="number" className="form-input" step="0.5" min="0.5" value={form.horasManuales} onChange={e => setForm({ ...form, horasManuales: e.target.value })} required />
          </div>
        );
      default:
        return <p className="text-sm text-muted mb-2">Descuenta las horas del turno programado para este día.</p>;
    }
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="page-title">Incidencias</h1>
          <p className="page-subtitle">Ausencias, incapacidades y tardías con impacto en planilla</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Registrar Incidencia
        </button>
      </div>

      {/* Summary */}
      <div className="stats-grid mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <div className="card" style={{ borderLeftColor: 'var(--status-warning)', borderLeftWidth: '3px', borderLeftStyle: 'solid' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--status-warning), #d97706)' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="card-value" style={{ color: pendientesCount > 0 ? 'var(--status-warning)' : 'var(--accent-400)' }}>{pendientesCount}</div>
          <div className="card-label">Pendientes por descontar</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--status-info), #2563eb)' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="card-value">{state.incidencias.length}</div>
          <div className="card-label">Total Registradas</div>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-3" style={{ padding: '0.625rem 1rem' }}>
        <div className="flex items-center gap-md">
          <Filter size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <select className="form-select" value={filterEmpleado} onChange={e => setFilterEmpleado(e.target.value)} style={{ maxWidth: '280px' }}>
            {[
              <option key="all" value="">Todos los empleados</option>,
              ...empleadosActivos.map(e => <option key={e.id || 'none'} value={e.id}>{e.nombre}</option>)
            ]}
          </select>
          <select className="form-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={{ maxWidth: '200px' }}>
            {[
              <option key="pendientes" value="pendientes">Pendientes</option>,
              <option key="procesadas" value="procesadas">Procesadas</option>,
              <option key="todas" value="todas">Todas</option>
            ]}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Tipo</th>
              <th>Fecha(s)</th>
              <th>Justificación</th>
              <th>Hrs Est.</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {incidenciasList.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <FileText size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.4 }} />
                  <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>No hay incidencias</div>
                  <div className="text-sm text-muted mt-1">Registro limpio.</div>
                </td>
              </tr>
            ) : incidenciasList.map((inc) => {
              const emp = getEmpleado(inc.empleadoId);
              const labelTipo = TIPOS_INCIDENCIA.find(t=>t.id===inc.tipo)?.label || inc.tipo;
              return (
                <tr key={inc.id} style={{ opacity: inc.procesada ? 0.6 : 1 }}>
                  <td className="font-medium">{emp?.nombre || 'Desconocido'}</td>
                  <td>
                    <span className="badge badge-info">{labelTipo.split(' (')[0]}</span>
                    {inc.tipo === 'salida_temprana' && <div className="text-xs text-muted mt-1">Salió {inc.horaSalida}</div>}
                    {inc.tipo === 'llegada_tarde' && <div className="text-xs text-muted mt-1">Llegó {inc.horaLlegada}</div>}
                  </td>
                  <td className="font-mono text-sm">
                    {inc.tipo === 'incapacidad' ? `${inc.fechaInicio} — ${inc.fechaFin}` : inc.fechaInicio}
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    <div className="truncate text-sm" title={inc.justificacion} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      &ldquo;{inc.justificacion}&rdquo;
                    </div>
                  </td>
                  <td className="font-mono text-xs text-muted">~{inc.horasEstimadas?.toFixed(1) || '?'}h</td>
                  <td>
                    {inc.procesada ? (
                      <span className="badge badge-success"><CheckCircle size={11} /> Descontada</span>
                    ) : (
                      <span className="badge badge-warning"><Clock size={11} /> Pendiente</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-sm justify-end">
                      <button className="btn btn-outline btn-sm" onClick={() => setIncidenciaDetalle(inc)}>
                        <Eye size={14} /> Ver
                      </button>
                      {!inc.procesada && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => setConfirmDelete(inc)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div id={`incidencia-print-container-${inc.id}`} style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
                      <IncidenciaImpresion incidencia={inc} empleado={emp} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Incidencia">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Empleado *</label>
            <select className="form-select" value={form.empleadoId} onChange={e => setForm({ ...form, empleadoId: e.target.value })}>
              {[
                <option key="placeholder" value="">Seleccionar empleado...</option>,
                ...empleadosActivos.map(e => <option key={e.id || 'new'} value={e.id}>{e.nombre}</option>)
              ]}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Tipo *</label>
            <select className="form-select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS_INCIDENCIA.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{form.tipo === 'incapacidad' ? 'Fecha Inicio *' : 'Fecha *'}</label>
            <input type="date" className="form-input" value={form.fechaInicio} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} required />
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            {renderFormSpecifics()}
          </div>

          <div className="form-group">
            <label className="form-label">Justificación (Obligatoria) *</label>
            <textarea 
              className="form-input" 
              value={form.justificacion} 
              onChange={e => setForm({ ...form, justificacion: e.target.value })} 
              placeholder="Ej: Incapacidad CCSS #123456 / Cita médica..." 
              required
              rows={3}
              style={{ resize: 'vertical' }}
            />
            <span className="text-xs text-muted mt-1 block">
              Aparecerá en la boleta de pago como respaldo.
            </span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Save size={16} /> Guardar</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Eliminar Registro"
        message={confirmDelete ? `¿Eliminar la incidencia para ${getEmpleado(confirmDelete.empleadoId)?.nombre}?` : ''}
        confirmText="Eliminar"
        danger
      />

      {incidenciaDetalle && (
        <Modal 
          isOpen={!!incidenciaDetalle} 
          onClose={() => setIncidenciaDetalle(null)} 
          title="Registro de Incidencia"
          size="lg"
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '10px', background: '#f9fafb' }}>
             <IncidenciaImpresion 
               incidencia={incidenciaDetalle} 
               empleado={getEmpleado(incidenciaDetalle.empleadoId)} 
             />
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm text-muted">Imprima y recolecte las firmas.</span>
            <button className="btn btn-primary" onClick={() => handleDescargarIncidencia(incidenciaDetalle)}>
                <Download size={16} /> Descargar PDF
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

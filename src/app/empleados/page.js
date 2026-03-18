'use client';

import { useState, useMemo } from 'react';
import { Users, Plus, Search, UserCheck, UserX, Pencil, Clock, Save, CalendarDays } from 'lucide-react';
import { useData, DEFAULT_HORARIO } from '@/lib/DataContext';
import { useToast } from '@/components/ui/Toast';
import { calcularHorasSemanales, calcularHorasMensuales } from '@/lib/calculo-engine';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

function getAvatarColor(name) {
  const colors = ['#ef4444','#f97316','#f59e0b','#10b981','#14b8a6','#3b82f6','#6366f1','#8b5cf6','#ec4899','#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function EmpleadosPage() {
  const { state, dispatch, addActividad } = useData();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ cedula: '', nombre: '', puesto: '', salarioBruto: '', fechaIngreso: '' });

  const empleados = useMemo(() => {
    const q = search.toLowerCase();
    return state.empleados.filter(e =>
      e.nombre.toLowerCase().includes(q) || e.cedula.includes(q)
    );
  }, [state.empleados, search]);

  const activos = state.empleados.filter(e => e.activo).length;

  function openCreate() {
    setEditingId(null);
    setForm({ cedula: '', nombre: '', puesto: '', salarioBruto: '', fechaIngreso: '' });
    setModalOpen(true);
  }

  function openEdit(emp) {
    setEditingId(emp.id);
    setForm({
      cedula: emp.cedula,
      nombre: emp.nombre,
      puesto: emp.puesto || '',
      salarioBruto: emp.salarioBruto.toString(),
      fechaIngreso: emp.fechaIngreso || '',
    });
    setModalOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    if (!form.cedula.trim() || !form.nombre.trim() || !form.salarioBruto) {
      addToast('Complete todos los campos marcados con *', 'error');
      return;
    }

    const cedulaClean = form.cedula.trim();
    const cedulaRegex = /^[1-9]-\d{4}-\d{4}$|^\d{9,12}$/;
    if (!cedulaRegex.test(cedulaClean)) {
      addToast('Formato de cédula inválido. Use X-XXXX-XXXX o solo números (9-12 dígitos).', 'error');
      return;
    }

    const salario = parseFloat(form.salarioBruto);
    if (isNaN(salario) || salario <= 0) {
      addToast('El salario bruto mensual debe ser un número mayor a 0.', 'error');
      return;
    }

    const data = {
      cedula: cedulaClean,
      nombre: form.nombre.trim(),
      puesto: form.puesto.trim(),
      salarioBruto: salario,
      fechaIngreso: form.fechaIngreso,
      activo: true,
      ...(editingId ? {} : { horario: { ...DEFAULT_HORARIO } }),
    };
    if (editingId) {
      dispatch({ type: 'UPDATE_EMPLEADO', payload: { id: editingId, ...data } });
      addActividad('Empleado actualizado', `${data.nombre} — datos modificados`, 'info');
      addToast(`${data.nombre} actualizado correctamente`, 'success');
    } else {
      if (state.empleados.some(emp => emp.cedula === data.cedula)) {
        addToast('Ya existe un empleado con esa cédula', 'error');
        return;
      }
      dispatch({ type: 'ADD_EMPLEADO', payload: data });
      addActividad('Empleado creado', `${data.nombre} — ${data.puesto}`, 'success');
      addToast(`${data.nombre} agregado correctamente`, 'success');
    }
    setModalOpen(false);
  }

  function handleToggle(emp) {
    dispatch({ type: 'TOGGLE_EMPLEADO', payload: emp.id });
    const action = emp.activo ? 'desactivado' : 'activado';
    addActividad(`Empleado ${action}`, emp.nombre, emp.activo ? 'warning' : 'success');
    addToast(`${emp.nombre} ${action}`, emp.activo ? 'warning' : 'success');
    setConfirmToggle(null);
  }

  function openSchedule(emp) {
    setScheduleModal({ ...emp, newHorario: JSON.parse(JSON.stringify(emp.horario || DEFAULT_HORARIO)) });
  }

  function updateScheduleDay(dia, field, value) {
    setScheduleModal(prev => ({
      ...prev,
      newHorario: {
        ...prev.newHorario,
        [dia]: { ...prev.newHorario[dia], [field]: value }
      }
    }));
  }

  function applyPreset(type) {
    if (!scheduleModal) return;
    const h = { ...DEFAULT_HORARIO };
    switch (type) {
      case 'completa':
        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].forEach(d => {
          h[d] = { trabaja: true, inicio: '06:00', fin: '14:00' };
        });
        ['domingo'].forEach(d => { h[d] = { trabaja: false, inicio: '', fin: '' }; });
        break;
    }
    setScheduleModal(prev => ({ ...prev, newHorario: h }));
  }

  function saveSchedule() {
    if (!scheduleModal) return;
    dispatch({ type: 'UPDATE_EMPLEADO', payload: { id: scheduleModal.id, horario: scheduleModal.newHorario } });
    const hrs = calcularHorasMensuales(scheduleModal.newHorario);
    addActividad('Horario personalizado', `${scheduleModal.nombre} — ${hrs} hrs/mes`, 'info');
    addToast(`Horario de ${scheduleModal.nombre} actualizado correctamente`, 'success');
    setScheduleModal(null);
  }

  function formatColones(n) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 }).format(n);
  }

  const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const DIAS_LABELS = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="page-subtitle">
            {activos} activos de {state.empleados.length} registrados
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nuevo Empleado
        </button>
      </div>

      {/* Search */}
      <div className="card mb-3" style={{ padding: '0.625rem 1rem' }}>
        <div className="flex items-center gap-sm">
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '0.375rem' }}
          />
        </div>
      </div>

      {/* Employee Cards */}
      {empleados.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Users size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
          <div className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No se encontraron empleados</div>
          <div className="text-sm text-muted mt-1">Ajuste la búsqueda o registre uno nuevo.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }} className="stagger-children">
          {empleados.map((emp, idx) => {
            const semHrs = calcularHorasSemanales(emp.horario);
            const mesHrs = calcularHorasMensuales(emp.horario);

            return (
              <div key={emp.id || idx} className="employee-card" style={{ flexDirection: 'column', alignItems: 'stretch', opacity: emp.activo ? 1 : 0.55 }}>
                <div className="flex items-center gap-md">
                  <div className="employee-avatar" style={{ background: `linear-gradient(135deg, ${getAvatarColor(emp.nombre)}, ${getAvatarColor(emp.nombre)}bb)` }}>
                    {getInitials(emp.nombre)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="font-semibold" style={{ fontSize: '0.9375rem' }}>{emp.nombre}</div>
                    <div className="text-xs text-muted">{emp.puesto || 'Sin puesto'} · {emp.cedula}</div>
                  </div>
                  <div>
                    {emp.activo ? (
                      <span className="badge badge-success"><UserCheck size={11} /> Activo</span>
                    ) : (
                      <span className="badge badge-danger"><UserX size={11} /> Inactivo</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', margin: '1rem 0', padding: '0.75rem', background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div className="text-xs text-muted uppercase">Salario</div>
                    <div className="font-mono font-semibold text-sm" style={{ color: 'var(--accent-400)' }}>{formatColones(emp.salarioBruto)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted uppercase">Horario</div>
                    <div className="font-mono text-sm">{semHrs}h/sem</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted uppercase">Mensual</div>
                    <div className="font-mono text-sm">{mesHrs}h/mes</div>
                  </div>
                </div>

                {/* Day schedule visual */}
                <div className="flex gap-xs mb-3">
                  {DIAS.map(dia => {
                    const dConf = emp.horario?.[dia];
                    const trabaja = dConf?.trabaja;
                    return (
                      <div key={dia} style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-xs)',
                        background: trabaja ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.08)',
                        border: `1px solid ${trabaja ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: trabaja ? 'var(--accent-400)' : 'var(--text-muted)',
                      }}>
                        {DIAS_LABELS[dia]}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-sm justify-end">
                  <button className="btn btn-ghost btn-sm" onClick={() => openSchedule(emp)}>
                    <CalendarDays size={14} /> Horario
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: emp.activo ? 'var(--status-danger)' : 'var(--status-success)' }}
                    onClick={() => setConfirmToggle(emp)}
                  >
                    {emp.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Empleado' : 'Nuevo Empleado'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Cédula *</label>
              <input 
                className="form-input" 
                value={form.cedula} 
                onChange={e => setForm({ ...form, cedula: e.target.value })} 
                placeholder="1-1234-5678" 
                required
              />
              <span className="text-xs text-muted block mt-1">Formato: X-XXXX-XXXX</span>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Ingreso</label>
              <input type="date" className="form-input" value={form.fechaIngreso} onChange={e => setForm({ ...form, fechaIngreso: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nombre Completo *</label>
            <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre y apellidos" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Puesto</label>
              <input className="form-input" value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })} placeholder="Ej: Asistente de Cuidado" />
            </div>
            <div className="form-group">
              <label className="form-label">Salario Bruto Mensual (₡) *</label>
              <input 
                type="number" 
                className="form-input" 
                value={form.salarioBruto} 
                onChange={e => setForm({ ...form, salarioBruto: e.target.value })} 
                placeholder="300000" 
                step="1" 
                min="1" 
                max="10000000"
                required
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> {editingId ? 'Guardar Cambios' : 'Crear Empleado'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={!!scheduleModal} onClose={() => setScheduleModal(null)} title="Horario Semanal" size="lg">
        {scheduleModal && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted">
                Turnos para <strong style={{ color: 'var(--text-primary)' }}>{scheduleModal.nombre}</strong>
              </p>
              <div className="flex gap-sm">
                <button className="btn btn-outline btn-sm" onClick={() => applyPreset('completa')}>Llenar L-S (Completa)</button>
              </div>
            </div>

            <div className="table-container mb-3" style={{ overflow: 'visible' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Labora</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                  </tr>
                </thead>
                <tbody>
                  {DIAS.map(dia => {
                    const dConf = scheduleModal.newHorario[dia];
                    return (
                      <tr key={dia} style={{ background: dConf.trabaja ? 'transparent' : 'rgba(0,0,0,0.15)' }}>
                        <td style={{ fontWeight: 500, color: dConf.trabaja ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {{ lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }[dia]}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={dConf.trabaja}
                            onChange={(e) => updateScheduleDay(dia, 'trabaja', e.target.checked)}
                            style={{ cursor: 'pointer', transform: 'scale(1.2)', accentColor: 'var(--accent-500)' }}
                          />
                        </td>
                        <td>
                          <input type="time" className="form-input" value={dConf.inicio || ''} onChange={(e) => updateScheduleDay(dia, 'inicio', e.target.value)} disabled={!dConf.trabaja} style={{ padding: '0.375rem 0.5rem' }} />
                        </td>
                        <td>
                          <input type="time" className="form-input" value={dConf.fin || ''} onChange={(e) => updateScheduleDay(dia, 'fin', e.target.value)} disabled={!dConf.trabaja} style={{ padding: '0.375rem 0.5rem' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between" style={{ padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.5)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div className="text-xs text-muted uppercase">Horas Calculadas</div>
                <div className="text-sm text-muted">Para deducciones de ausencias</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-mono font-bold" style={{ fontSize: '1.25rem', color: 'var(--accent-400)' }}>
                  {calcularHorasSemanales(scheduleModal.newHorario).toFixed(1)} <span className="text-sm text-muted font-normal">hrs/sem</span>
                </div>
                <div className="font-mono text-sm text-secondary">
                  ≈ {calcularHorasMensuales(scheduleModal.newHorario)} hrs/mes
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setScheduleModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveSchedule}>
                <Clock size={16} /> Guardar Horario
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        title={confirmToggle?.activo ? 'Desactivar Empleado' : 'Activar Empleado'}
        message={confirmToggle?.activo
          ? `¿Desactivar a ${confirmToggle?.nombre}? No se incluirá en futuras planillas.`
          : `¿Activar a ${confirmToggle?.nombre}? Se incluirá en futuras planillas.`
        }
        confirmText={confirmToggle?.activo ? 'Desactivar' : 'Activar'}
        danger={confirmToggle?.activo}
      />
    </div>
  );
}

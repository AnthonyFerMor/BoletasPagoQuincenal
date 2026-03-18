'use client';

import { useState, useMemo } from 'react';
import { Receipt, Plus, Filter, DollarSign, Trash2, Save, Printer, Eye, Download } from 'lucide-react';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { exportMultipleToPDF } from '@/lib/pdf-export';
import ValeImpresion from '@/components/planilla/ValeImpresion';

export default function ValesPage() {
  const { state, dispatch, addActividad } = useData();
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [valeDetalle, setValeDetalle] = useState(null);
  const [filterEmpleado, setFilterEmpleado] = useState('');
  const [form, setForm] = useState({ empleadoId: '', monto: '', fecha: new Date().toISOString().split('T')[0], descripcion: '' });

  const empleadosActivos = state.empleados.filter(e => e.activo);

  const valesFiltrados = useMemo(() => {
    let v = [...state.vales].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    if (filterEmpleado) v = v.filter(vale => vale.empleadoId === filterEmpleado);
    return v;
  }, [state.vales, filterEmpleado]);

  const totalVales = valesFiltrados.reduce((sum, v) => sum + v.monto, 0);

  function getEmpleadoNombre(id) {
    return state.empleados.find(e => e.id === id)?.nombre || 'Desconocido';
  }

  function formatColones(n) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 }).format(n);
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!form.empleadoId || !form.monto) {
      addToast('Seleccione empleado y monto', 'error');
      return;
    }
    const monto = parseFloat(form.monto);
    if (monto <= 0) {
      addToast('El monto debe ser mayor a 0', 'error');
      return;
    }
    dispatch({ type: 'ADD_VALE', payload: { empleadoId: form.empleadoId, monto, fecha: form.fecha, descripcion: form.descripcion } });
    const nombre = getEmpleadoNombre(form.empleadoId);
    addActividad('Vale registrado', `${nombre} — ${formatColones(monto)}`, 'warning');
    addToast(`Vale de ${formatColones(monto)} registrado para ${nombre}`, 'success');
    setForm({ empleadoId: '', monto: '', fecha: new Date().toISOString().split('T')[0], descripcion: '' });
    setModalOpen(false);
  }

  function handleDelete(vale) {
    dispatch({ type: 'DELETE_VALE', payload: vale.id });
    addActividad('Vale eliminado', `${getEmpleadoNombre(vale.empleadoId)} — ${formatColones(vale.monto)}`, 'danger');
    addToast('Vale eliminado', 'success');
    setConfirmDelete(null);
  }

  async function handleDescargarVale(vale) {
    addToast('Generando comprobante PDF...', 'info');
    setTimeout(async () => {
      const success = await exportMultipleToPDF(`vale-print-container-${vale.id}`, `Vale-${getEmpleadoNombre(vale.empleadoId).replace(/\s+/g, '-')}-${vale.fecha}.pdf`);
      if (success) {
        addToast('PDF generado correctamente.', 'success');
        setValeDetalle(null);
      } else {
        addToast('Error al generar PDF.', 'error');
      }
    }, 100);
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="page-title">Vales y Adelantos</h1>
          <p className="page-subtitle">Registro de adelantos de salario — {state.vales.length} vales</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Registrar Vale
        </button>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-icon"><DollarSign size={20} /></div>
          </div>
          <div className="card-value">{formatColones(totalVales)}</div>
          <div className="card-label">{filterEmpleado ? 'Total del Empleado' : 'Total Registrado'}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--status-warning), #d97706)' }}><Receipt size={20} /></div>
          </div>
          <div className="card-value">{valesFiltrados.length}</div>
          <div className="card-label">Vales</div>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-3" style={{ padding: '0.625rem 1rem' }}>
        <div className="flex items-center gap-md">
          <Filter size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <select className="form-select" value={filterEmpleado} onChange={e => setFilterEmpleado(e.target.value)} style={{ maxWidth: '280px' }}>
            {[
              <option key="all" value="">Todos los empleados</option>,
              ...empleadosActivos.map(e => <option key={e.id || 'err'} value={e.id}>{e.nombre}</option>)
            ]}
          </select>
          {filterEmpleado && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilterEmpleado('')}>Limpiar</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {valesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Receipt size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.4 }} />
                  <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>No hay vales registrados</div>
                  <div className="text-sm text-muted mt-1">Haga clic en &quot;Registrar Vale&quot; para agregar uno.</div>
                </td>
              </tr>
            ) : valesFiltrados.map((vale) => (
              <tr key={vale.id}>
                <td className="font-medium">{getEmpleadoNombre(vale.empleadoId)}</td>
                <td className="font-mono" style={{ color: 'var(--status-warning)', fontWeight: 600 }}>{formatColones(vale.monto)}</td>
                <td className="text-muted text-sm">{vale.fecha}</td>
                <td className="text-sm">{vale.descripcion || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="flex gap-sm justify-end">
                    <button className="btn btn-outline btn-sm" onClick={() => setValeDetalle(vale)}>
                      <Eye size={14} /> Ver PDF
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => setConfirmDelete(vale)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div id={`vale-print-container-${vale.id}`} style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
                    <ValeImpresion vale={vale} empleado={state.empleados.find(e => e.id === vale.empleadoId)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Vale">
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Monto (₡) *</label>
              <input type="number" className="form-input" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder="25000" min="0" step="500" />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-input" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Motivo del adelanto (opcional)" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Save size={16} /> Registrar</button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Eliminar Vale"
        message={confirmDelete ? `¿Eliminar el vale de ${formatColones(confirmDelete.monto)} para ${getEmpleadoNombre(confirmDelete.empleadoId)}?` : ''}
        confirmText="Eliminar"
        danger
      />

      {/* View/Print Modal */}
      {valeDetalle && (
        <Modal 
          isOpen={!!valeDetalle} 
          onClose={() => setValeDetalle(null)} 
          title="Comprobante de Adelanto Salarial"
          size="lg"
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '10px', background: '#f9fafb' }}>
             <ValeImpresion 
               vale={valeDetalle} 
               empleado={state.empleados.find(e => e.id === valeDetalle.empleadoId)} 
             />
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm text-muted">Imprima y recolecte las firmas requeridas.</span>
            <button className="btn btn-primary" onClick={() => handleDescargarVale(valeDetalle)}>
                <Download size={16} /> Descargar PDF
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

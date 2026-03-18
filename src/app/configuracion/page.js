'use client';

import { useState } from 'react';
import { Settings, Save, RotateCcw, CheckCircle, Gift, Sliders, Lock, User, Eye, EyeOff, Shield } from 'lucide-react';
import { useData, DEFAULT_PARAMETROS } from '@/lib/DataContext';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function ConfiguracionPage() {
  const { state, dispatch, addActividad } = useData();
  const { user, changePassword } = useAuth();
  const { addToast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [localParams, setLocalParams] = useState({ ...state.parametros });
  const [hasChanges, setHasChanges] = useState(false);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  if (!localParams.aguinaldo_mes) localParams.aguinaldo_mes = 12;
  if (!localParams.aguinaldo_quincena) localParams.aguinaldo_quincena = 'primera_quincena';

  const paramConfig = [
    { clave: 'ccss_obrero', descripcion: 'Porcentaje CCSS obrero', unidad: '%', step: '0.01', tipo: 'number' },
    { clave: 'factor_extra_50', descripcion: 'Factor horas extra 50%', unidad: 'x', step: '0.1', tipo: 'number' },
    { clave: 'factor_extra_100', descripcion: 'Factor horas extra dobles', unidad: 'x', step: '0.1', tipo: 'number' },
    { clave: 'dias_quincena', descripcion: 'Días en quincena estándar', unidad: 'días', step: '1', tipo: 'number' },
  ];

  function handleChange(clave, value, isNumber = true) {
    setLocalParams({ ...localParams, [clave]: isNumber ? parseFloat(value) || 0 : value });
    setHasChanges(true);
  }

  function handleSave() {
    dispatch({ type: 'UPDATE_PARAMETROS', payload: localParams });
    addActividad('Parámetros actualizados', 'Configuración global modificada', 'info');
    addToast('Parámetros guardados correctamente', 'success');
    setHasChanges(false);
  }

  function handleReset() {
    dispatch({ type: 'RESET_PARAMETROS' });
    setLocalParams({ ...DEFAULT_PARAMETROS });
    addActividad('Parámetros restaurados', 'Restaurados a valores por defecto', 'warning');
    addToast('Parámetros restaurados', 'success');
    setHasChanges(false);
    setConfirmReset(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPass || !newPass) {
      setPassError('Complete todos los campos');
      return;
    }
    if (newPass.length < 6) {
      setPassError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Las contraseñas no coinciden');
      return;
    }

    const result = await changePassword(currentPass, newPass);
    if (result.success) {
      setPassSuccess('Contraseña actualizada correctamente');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      addToast('Contraseña actualizada', 'success');
    } else {
      setPassError(result.error);
    }
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Parámetros globales del sistema de planilla</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={15} /> Restaurar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!hasChanges}
            style={{ opacity: hasChanges ? 1 : 0.5 }}
          >
            {hasChanges ? <Save size={16} /> : <CheckCircle size={16} />}
            {hasChanges ? 'Guardar Cambios' : 'Sin cambios'}
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="flex items-center gap-sm mb-3">
          <Sliders size={20} style={{ color: 'var(--accent-400)' }} />
          <h2 className="section-title" style={{ marginBottom: 0 }}>Parámetros de Cálculo</h2>
        </div>

        <div className="responsive-cards-grid">
          {paramConfig.map((p) => {
            const isCustom = localParams[p.clave] !== DEFAULT_PARAMETROS[p.clave];
            return (
              <div key={p.clave} style={{ padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-sm)', border: isCustom ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent' }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">{p.descripcion}</label>
                  <span className="text-xs text-muted">{p.unidad}</span>
                </div>
                <div className="flex items-center gap-sm">
                  <input
                    type="number"
                    className="form-input"
                    value={localParams[p.clave]}
                    onChange={e => handleChange(p.clave, e.target.value)}
                    step={p.step}
                    style={{ borderColor: isCustom ? 'var(--accent-500)' : undefined }}
                  />
                  {isCustom && (
                    <span className="text-xs text-muted">Default: {DEFAULT_PARAMETROS[p.clave]}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mb-3">
        <div className="flex items-center gap-sm mb-3">
          <Gift size={20} style={{ color: 'var(--accent-400)' }} />
          <h2 className="section-title" style={{ marginBottom: 0 }}>Aguinaldo</h2>
        </div>
        <p className="text-sm text-muted mb-3">
          Configure en qué mes y quincena se procesará el aguinaldo anualmente.
        </p>

        <div className="responsive-grid-2" style={{ maxWidth: '600px' }}>
          <div className="form-group">
            <label className="form-label">Mes de Pago</label>
            <select 
              className="form-select" 
              value={localParams.aguinaldo_mes} 
              onChange={e => handleChange('aguinaldo_mes', e.target.value)}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>Mes {m} ({new Date(2000, m - 1).toLocaleString('es-CR', { month: 'long' })})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quincena de Pago</label>
            <select 
              className="form-select" 
              value={localParams.aguinaldo_quincena} 
              onChange={e => handleChange('aguinaldo_quincena', e.target.value, false)}
            >
              <option key="p1" value="primera_quincena">1ra Quincena (1-15)</option>
              <option key="p2" value="segunda_quincena">2da Quincena (16-final)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="card">
        <div className="flex items-center gap-sm mb-3">
          <Shield size={20} style={{ color: 'var(--accent-400)' }} />
          <h2 className="section-title" style={{ marginBottom: 0 }}>Seguridad</h2>
        </div>

        <div className="responsive-grid-2" style={{ gap: '2rem' }}>
          {/* Current User Info */}
          <div>
            <div className="text-sm text-muted mb-2">Usuario Actual</div>
            <div style={{ padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-center gap-sm mb-2">
                <User size={16} style={{ color: 'var(--accent-400)' }} />
                <span className="font-semibold">{user?.nombre || 'Desconocido'}</span>
              </div>
              <div className="text-xs text-muted">Usuario: {user?.username}</div>
              <div className="text-xs text-muted">Rol: {user?.rol || 'admin'}</div>
              <div className="text-xs text-muted mt-1">
                {user?.source === 'supabase' ? '✓ Conectado a Supabase' : '⚠ Usando credenciales locales'}
              </div>
            </div>
            <p className="text-xs text-muted mt-2">
              Para gestionar usuarios desde Supabase, cree la tabla <strong>usuarios</strong> con las columnas: 
              id, username, nombre, rol, password_hash.
            </p>
          </div>

          {/* Change Password Form */}
          <div>
            <div className="text-sm text-muted mb-2">Cambiar Contraseña</div>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Contraseña actual"
                  value={currentPass}
                  onChange={e => { setCurrentPass(e.target.value); setPassError(''); setPassSuccess(''); }}
                />
                <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  value={newPass}
                  onChange={e => { setNewPass(e.target.value); setPassError(''); setPassSuccess(''); }}
                />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <input
                type="password"
                className="form-input"
                placeholder="Confirmar nueva contraseña"
                value={confirmPass}
                onChange={e => { setConfirmPass(e.target.value); setPassError(''); setPassSuccess(''); }}
              />
              {passError && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.8125rem' }}>
                  {passError}
                </div>
              )}
              {passSuccess && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-400)', fontSize: '0.8125rem' }}>
                  {passSuccess}
                </div>
              )}
              <button type="submit" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
                <Lock size={14} /> Cambiar Contraseña
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Restaurar Parámetros"
        message="¿Restaurar todos los parámetros a sus valores por defecto?"
        confirmText="Restaurar"
        danger
      />
    </div>
  );
}

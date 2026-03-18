'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor complete todos los campos');
      return;
    }
    setIsLoading(true);
    setError('');

    // Small delay for visual feedback
    await new Promise(r => setTimeout(r, 400));

    const result = login(username, password);
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb--1" />
        <div className="login-bg-orb login-bg-orb--2" />
        <div className="login-bg-orb login-bg-orb--3" />
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Building2 size={28} />
          </div>
          <h1 className="login-title">SCPSC</h1>
          <p className="login-subtitle">Sistema de Comprobantes de Pago</p>
          <p className="login-org">Residencia Santa Clara S.R.L.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label" htmlFor="username">
              <User size={14} /> Usuario
            </label>
            <input
              id="username"
              type="text"
              className="login-input"
              placeholder="Ingrese su usuario"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">
              <Lock size={14} /> Contraseña
            </label>
            <div className="login-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle-pass"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="login-spinner" />
            ) : (
              <>
                Iniciar Sesión
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>CJ: 3-102-754033 · v2.0</span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

// Fallback credentials when Supabase is not configured or table doesn't exist
const FALLBACK_USERS = [
  { username: 'admin', password: 'SantaClara2026', nombre: 'Administrador', rol: 'admin' },
  { username: 'contabilidad', password: 'Contabilidad2026', nombre: 'Contabilidad', rol: 'usuario' },
];

// Simple hash for password comparison (not crypto-grade, but sufficient for internal tool)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useSupabase, setUseSupabase] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    async function init() {
      const saved = localStorage.getItem('scpsc_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setUser(parsed.user);
          } else {
            localStorage.removeItem('scpsc_session');
          }
        } catch { /* ignore */ }
      }
      // Wait for Supabase check before finishing load
      await checkSupabaseAuth();
      setIsLoading(false);
    }
    init();
  }, []);

  async function checkSupabaseAuth() {
    try {
      // Test connection to the table
      const { data, error } = await supabase.from('usuarios').select('id').limit(1);
      
      if (error) {
        console.warn('Supabase Auth check failed:', error);
        // If it's a 404, it means the table really isn't there
        if (error.code === '42P01') {
          console.error('La tabla "usuarios" no existe en Supabase. Ejecute el script SQL.');
        }
        setUseSupabase(false);
        return;
      }
      
      console.log('✓ Supabase "usuarios" table detected successfully');
      setUseSupabase(true);
    } catch (e) {
      console.error('Unexpected error checking Supabase:', e);
      setUseSupabase(false);
    }
  }

  async function login(username, password) {
    // Try Supabase first
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (!error && data) {
          // Check password  
          if (data.password_hash === simpleHash(password)) {
            const userData = { 
              id: data.id,
              username: data.username, 
              nombre: data.nombre, 
              rol: data.rol,
              source: 'supabase'
            };
            setUser(userData);
            localStorage.setItem('scpsc_session', JSON.stringify({ user: userData, timestamp: Date.now() }));
            return { success: true };
          }
          return { success: false, error: 'Contraseña incorrecta' };
        }
      } catch { /* fall through to fallback */ }
    }

    // Fallback to hardcoded users
    const found = FALLBACK_USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!found) return { success: false, error: 'Usuario o contraseña incorrectos' };

    const userData = { username: found.username, nombre: found.nombre, rol: found.rol, source: 'local' };
    setUser(userData);
    localStorage.setItem('scpsc_session', JSON.stringify({ user: userData, timestamp: Date.now() }));
    return { success: true };
  }

  async function changePassword(currentPassword, newPassword) {
    if (!user) return { success: false, error: 'No autenticado' };

    if (user.source === 'supabase') {
      // Verify current password
      const { data } = await supabase
        .from('usuarios')
        .select('password_hash')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!data || data.password_hash !== simpleHash(currentPassword)) {
        return { success: false, error: 'Contraseña actual incorrecta' };
      }

      // Update password
      const { error } = await supabase
        .from('usuarios')
        .update({ password_hash: simpleHash(newPassword) })
        .eq('id', user.id);

      if (error) return { success: false, error: 'Error al actualizar contraseña' };
      return { success: true };
    }

    // Local fallback — verify current password
    const found = FALLBACK_USERS.find(
      u => u.username.toLowerCase() === user.username.toLowerCase()
    );
    if (!found || found.password !== currentPassword) {
      return { success: false, error: 'Contraseña actual incorrecta' };
    }
    // Can't change hardcoded passwords — but acknowledge it
    return { success: false, error: 'Para cambiar contraseñas, configure la tabla "usuarios" en Supabase' };
  }

  async function resetPassword(username) {
    if (!useSupabase) {
      return { success: false, error: 'Recuperación de contraseña requiere la tabla "usuarios" en Supabase' };
    }

    // Reset to a default password
    const defaultPassword = 'Reset2026';
    const { data, error } = await supabase
      .from('usuarios')
      .update({ password_hash: simpleHash(defaultPassword) })
      .eq('username', username.toLowerCase())
      .select()
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    return { success: true, tempPassword: defaultPassword };
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('scpsc_session');
  }

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, login, logout, changePassword, resetPassword,
      isAuthenticated: !!user, useSupabase 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

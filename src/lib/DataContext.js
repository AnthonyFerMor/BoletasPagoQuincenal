'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { supabase } from './supabase';

const DataContext = createContext(null);

// === Default Schedule ===
const DEFAULT_HORARIO = {
  lunes:     { trabaja: true, inicio: '07:00', fin: '16:00' },
  martes:    { trabaja: true, inicio: '07:00', fin: '16:00' },
  miercoles: { trabaja: true, inicio: '07:00', fin: '16:00' },
  jueves:    { trabaja: true, inicio: '07:00', fin: '16:00' },
  viernes:   { trabaja: true, inicio: '07:00', fin: '12:00' },
  sabado:    { trabaja: false, inicio: '', fin: '' },
  domingo:   { trabaja: false, inicio: '', fin: '' },
};

// === Default Data ===
const DEFAULT_PARAMETROS = {
  ccss_obrero: 10.85,
  factor_extra_50: 1.5,
  factor_extra_100: 2.0,
  dias_quincena: 15,
  aguinaldo_mes: 12,
  aguinaldo_quincena: 'primera_quincena',
};

const DEFAULT_EMPLEADOS = [
  { id: '1', cedula: '1-1234-0567', nombre: 'María López Hernández', puesto: 'Asistente de Cuidado', salarioNeto: 350000, horario: { ...DEFAULT_HORARIO }, fechaIngreso: '2023-03-15', activo: true },
  { id: '2', cedula: '2-0456-0789', nombre: 'Juan Pérez Solano', puesto: 'Cocina', salarioNeto: 300000, horario: { ...DEFAULT_HORARIO }, fechaIngreso: '2022-01-10', activo: true },
  { id: '3', cedula: '1-0789-0123', nombre: 'Carlos Ramírez Mora', puesto: 'Mantenimiento', salarioNeto: 280000, horario: {
    lunes: { trabaja: true, inicio: '06:00', fin: '14:00' },
    martes: { trabaja: true, inicio: '06:00', fin: '14:00' },
    miercoles: { trabaja: true, inicio: '06:00', fin: '14:00' },
    jueves: { trabaja: true, inicio: '06:00', fin: '14:00' },
    viernes: { trabaja: true, inicio: '06:00', fin: '10:00' },
    sabado: { trabaja: true, inicio: '06:00', fin: '10:00' },
    domingo: { trabaja: false, inicio: '', fin: '' },
  }, fechaIngreso: '2024-06-01', activo: true },
  { id: '4', cedula: '3-0321-0654', nombre: 'Ana Solís Vargas', puesto: 'Asistente de Cuidado', salarioNeto: 350000, horario: { ...DEFAULT_HORARIO }, fechaIngreso: '2023-08-20', activo: true },
  { id: '5', cedula: '1-0654-0987', nombre: 'Pedro Jiménez Castro', puesto: 'Seguridad Nocturna', salarioNeto: 275000, horario: {
    lunes: { trabaja: true, inicio: '22:00', fin: '06:00' },
    martes: { trabaja: true, inicio: '22:00', fin: '06:00' },
    miercoles: { trabaja: true, inicio: '22:00', fin: '06:00' },
    jueves: { trabaja: true, inicio: '22:00', fin: '06:00' },
    viernes: { trabaja: false, inicio: '', fin: '' },
    sabado: { trabaja: false, inicio: '', fin: '' },
    domingo: { trabaja: true, inicio: '22:00', fin: '06:00' },
  }, fechaIngreso: '2021-11-01', activo: false },
];

const DEFAULT_VALES = [
  { id: '1', empleadoId: '2', monto: 25000, fecha: '2026-03-05', descripcion: 'Adelanto personal' },
  { id: '2', empleadoId: '4', monto: 15000, fecha: '2026-03-07', descripcion: 'Emergencia médica' },
  { id: '3', empleadoId: '1', monto: 30000, fecha: '2026-03-02', descripcion: 'Adelanto quincenal' },
];

const DEFAULT_PERIODOS = [];

// === Auto-generate quincenas up to current date ===
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function generatePeriodosHastaHoy(existingPeriodos) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-based
  const currentDay = today.getDate();
  
  const newPeriodos = [...existingPeriodos];
  const existingKeys = new Set(existingPeriodos.map(p => `${p.fechaInicio}_${p.fechaFin}`));
  
  // Generate from Jan of current year up to current date
  // We could go further back, but keeping it to current year for simplicity
  const startYear = currentYear;
  const startMonth = 0; // January
  
  for (let y = startYear; y <= currentYear; y++) {
    const maxMonth = (y === currentYear) ? currentMonth : 11;
    for (let m = startMonth; m <= maxMonth; m++) {
      const lastDay = getLastDayOfMonth(y, m);
      const mesLabel = `${MESES[m]} ${y}`;
      
      // 1ra quincena: 1-15
      const q1Start = `${y}-${String(m+1).padStart(2,'0')}-01`;
      const q1End = `${y}-${String(m+1).padStart(2,'0')}-15`;
      const q1Key = `${q1Start}_${q1End}`;
      
      if (!existingKeys.has(q1Key)) {
        // Only generate if the end date is in the past or current
        if (y < currentYear || m < currentMonth || (m === currentMonth && 15 <= currentDay)) {
          newPeriodos.push({
            id: `auto_${y}_${m+1}_q1`,
            fechaInicio: q1Start,
            fechaFin: q1End,
            tipo: 'primera_quincena',
            mes: mesLabel,
            estado: 'abierto'
          });
          existingKeys.add(q1Key);
        }
      }
      
      // 2da quincena: 16-last
      const q2Start = `${y}-${String(m+1).padStart(2,'0')}-16`;
      const q2End = `${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
      const q2Key = `${q2Start}_${q2End}`;
      
      if (!existingKeys.has(q2Key)) {
        if (y < currentYear || m < currentMonth || (m === currentMonth && 16 <= currentDay)) {
          newPeriodos.push({
            id: `auto_${y}_${m+1}_q2`,
            fechaInicio: q2Start,
            fechaFin: q2End,
            tipo: 'segunda_quincena',
            mes: mesLabel,
            estado: 'abierto'
          });
          existingKeys.add(q2Key);
        }
      }
    }
  }

  // Generate next month's periods if we are late in the current month (past the 20th)
  if (currentDay >= 20) {
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nmY = nextMonthDate.getFullYear();
    const nmM = nextMonthDate.getMonth();
    const lastDayNM = getLastDayOfMonth(nmY, nmM);
    const mesLabelNM = `${MESES[nmM]} ${nmY}`;

    // 1ra next month
    const nq1Start = `${nmY}-${String(nmM+1).padStart(2,'0')}-01`;
    const nq1End = `${nmY}-${String(nmM+1).padStart(2,'0')}-15`;
    const nq1Key = `${nq1Start}_${nq1End}`;
    if (!existingKeys.has(nq1Key)) {
      newPeriodos.push({ id: `auto_${nmY}_${nmM+1}_q1`, fechaInicio: nq1Start, fechaFin: nq1End, tipo: 'primera_quincena', mes: mesLabelNM, estado: 'abierto' });
    }

    // 2da next month
    const nq2Start = `${nmY}-${String(nmM+1).padStart(2,'0')}-16`;
    const nq2End = `${nmY}-${String(nmM+1).padStart(2,'0')}-${String(lastDayNM).padStart(2,'0')}`;
    const nq2Key = `${nq2Start}_${nq2End}`;
    if (!existingKeys.has(nq2Key)) {
      newPeriodos.push({ id: `auto_${nmY}_${nmM+1}_q2`, fechaInicio: nq2Start, fechaFin: nq2End, tipo: 'segunda_quincena', mes: mesLabelNM, estado: 'abierto' });
    }
  }
  
  // Sort by fecha descending (most recent first)
  newPeriodos.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
  
  return newPeriodos;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// === Reducer ===
function dataReducer(state, action) {
  switch (action.type) {
    case 'INIT_STATE':
      return { ...state, ...action.payload };
    // Empleados
    case 'ADD_EMPLEADO':
      return { ...state, empleados: [...state.empleados, { ...action.payload, id: action.payload.id || generateId() }] };
    case 'UPDATE_EMPLEADO':
      return { ...state, empleados: state.empleados.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e) };
    case 'TOGGLE_EMPLEADO':
      return { ...state, empleados: state.empleados.map(e => e.id === action.payload ? { ...e, activo: !e.activo } : e) };
    
    // Vales
    case 'ADD_VALE':
      return { ...state, vales: [...state.vales, { ...action.payload, id: generateId() }] };
    case 'DELETE_VALE':
      return { ...state, vales: state.vales.filter(v => v.id !== action.payload) };
    
    // Incidencias
    case 'ADD_INCIDENCIA':
      return { ...state, incidencias: [...state.incidencias, { ...action.payload, id: generateId(), createdAt: new Date().toISOString() }] };
    case 'DELETE_INCIDENCIA':
      return { ...state, incidencias: state.incidencias.filter(i => i.id !== action.payload) };
    
    // Parámetros
    case 'UPDATE_PARAMETROS':
      return { ...state, parametros: { ...state.parametros, ...action.payload } };
    case 'RESET_PARAMETROS':
      return { ...state, parametros: { ...DEFAULT_PARAMETROS } };
    
    // Periodos
    case 'ADD_PERIODO':
      return { ...state, periodos: [{ ...action.payload, id: generateId() }, ...state.periodos] };
    case 'UPDATE_PERIODO':
      return { ...state, periodos: state.periodos.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'SET_PERIODOS':
      return { ...state, periodos: action.payload };
    
    // Boletas
    case 'ADD_BOLETAS':
      return { ...state, boletas: [...state.boletas.filter(b => !action.payload.find(nb => nb.empleadoId === b.empleadoId && nb.periodoId === b.periodoId)), ...action.payload] };
    
    // Mark incidencias as processed
    case 'MARK_INCIDENCIAS_PROCESSED':
      return { ...state, incidencias: state.incidencias.map(i => action.payload.includes(i.id) ? { ...i, procesada: true, periodoId: action.meta } : i) };
    
    // Payroll edit data — persist inputs per period
    case 'SAVE_PAYROLL_DATA':
      return { ...state, payrollEdits: { ...state.payrollEdits, [action.payload.periodoId]: action.payload.data } };

    // Atomic payroll closure — marks incidencias by empleadoId+fechaInicio (not unreliable client IDs)
    case 'CLOSE_PAYROLL': {
      const closePeriodoId = action.payload.periodoId;
      const closePeriodo = state.periodos.find(p => p.id === closePeriodoId);
      const closeIncIds = action.payload.incidenciasToMark; // array of {empleadoId, fechaInicio}
      return { 
        ...state, 
        boletas: [...state.boletas.filter(b => !action.payload.boletas.find(nb => nb.empleadoId === b.empleadoId && nb.periodoId === b.periodoId)), ...action.payload.boletas],
        incidencias: state.incidencias.map(i => {
          const match = closeIncIds.find(m => m.empleadoId === i.empleadoId && m.fechaInicio === i.fechaInicio);
          return match ? { ...i, procesada: true, periodoId: closePeriodoId } : i;
        }),
        periodos: state.periodos.map(p => p.id === closePeriodoId ? { ...p, estado: 'procesado' } : p)
      };
    }
    
    // ID Synchronization for optimistic updates
    case 'UPDATE_ID':
      const { entity, oldId, newId } = action.payload;
      return { 
        ...state, 
        [entity]: state[entity].map(item => item.id === oldId ? { ...item, id: newId } : item) 
      };
    
    // Actividad
    case 'ADD_ACTIVIDAD':
      return { ...state, actividad: [{ ...action.payload, id: generateId(), timestamp: new Date().toISOString() }, ...state.actividad].slice(0, 50) };
    
    default:
      return state;
  }
}

// === Provider ===
export function DataProvider({ children }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [state, dispatch] = useReducer(dataReducer, {
    empleados: [],
    vales: [],
    parametros: DEFAULT_PARAMETROS,
    periodos: [],
    incidencias: [],
    boletas: [],
    actividad: [],
    payrollEdits: {},
  });

  // Load from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [
          { data: emps },
          { data: vales },
          { data: params },
          { data: perios },
          { data: incids },
          { data: bols }
        ] = await Promise.all([
          supabase.from('planilla_empleados').select('*').order('nombre'),
          supabase.from('planilla_vales').select('*'),
          supabase.from('core_parametros').select('*'),
          supabase.from('planilla_periodos').select('*').order('fecha_inicio', { ascending: false }),
          supabase.from('planilla_incidencias').select('*'),
          supabase.from('planilla_boletas').select('*')
        ]);

        // Transform core_parametros to object
        const paramsObj = { ...DEFAULT_PARAMETROS };
        params?.forEach(p => {
          paramsObj[p.clave] = p.valor_texto !== null ? p.valor_texto : Number(p.valor);
        });

        // Map underscore fields from Supabase to camelCase in app
        const mappedEmps = emps?.map(e => ({
          ...e,
          salarioBruto: Number(e.salario_neto_pactado),
          fechaIngreso: e.fecha_ingreso,
          horario: e.horario || DEFAULT_HORARIO
        })) || DEFAULT_EMPLEADOS;

        const mappedVales = vales?.map(v => ({
          ...v,
          empleadoId: v.empleado_id,
          periodoId: v.periodo_id
        })) || DEFAULT_VALES;

        const mappedIncids = incids?.map(i => ({
          ...i,
          empleadoId: i.empleado_id,
          fechaInicio: i.fecha_inicio,
          fechaFin: i.fecha_fin,
          horaLlegada: i.hora_llegada,
          horaSalida: i.hora_salida,
          horasDeducidas: Number(i.horas_deducidas),
          horasEstimadas: Number(i.horas_estimadas),
          periodoId: i.periodo_id
        })) || [];

        const mappedBols = bols?.map(b => ({
          ...b,
          periodoId: b.periodo_id,
          empleadoId: b.empleado_id,
          empleadoNombre: emps?.find(e => e.id === b.empleado_id)?.nombre || 'Desconocido',
          salarioBrutoQuincenal: Number(b.salario_bruto_quincenal),
          liquidoPagar: Number(b.liquido_pagar),
          totalExtras: Number(b.total_extras),
          totalVales: Number(b.total_vales),
          deduccionCCSS: Number(b.deduccion_ccss),
          deduccionHoras: Number(b.deduccion_horas || 0),
          aguinaldo: Number(b.aguinaldo || 0),
          incidenciasDetalle: b.incidencias_detalle || []
        })) || [];

        const mappedPeriodos = generatePeriodosHastaHoy(perios?.map(p => {
          // Reconstruct 'mes' from fecha_inicio for DB periods that lack it
          const d = new Date(p.fecha_inicio + 'T12:00:00');
          const mesLabel = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
          return {
            ...p,
            fechaInicio: p.fecha_inicio,
            fechaFin: p.fecha_fin,
            mes: p.mes || mesLabel
          };
        }) || []);

        dispatch({ type: 'INIT_STATE', payload: {
          empleados: mappedEmps,
          vales: mappedVales,
          parametros: paramsObj,
          periodos: mappedPeriodos,
          incidencias: mappedIncids,
          boletas: mappedBols,
          actividad: [],
          payrollEdits: {} // local storage fallback for edits
        }});
      } catch (err) {
        console.error("Error loading from Supabase:", err);
      } finally {
        setIsLoading(false);
        setIsMounted(true);
      }
    }
    loadData();
  }, []);

  // Sync to local storage for backup (optional)
  useEffect(() => {
    if (state && isMounted) {
      localStorage.setItem('scpsc_data_v2', JSON.stringify(state));
    }
  }, [state, isMounted]);

  const addActividad = useCallback((accion, detalle, tipo = 'info') => {
    dispatch({ type: 'ADD_ACTIVIDAD', payload: { accion, detalle, tipo } });
  }, []);

  // Wrapper for dispatch that also syncs to Supabase
  const syncDispatch = async (action) => {
    // 1. Optimistic Update
    dispatch(action);

    // 2. Sync to Supabase
    try {
      const { type, payload } = action;
      switch (type) {
        case 'ADD_EMPLEADO':
          await supabase.from('planilla_empleados').insert([{
            cedula: payload.cedula,
            nombre: payload.nombre,
            puesto: payload.puesto,
            salario_neto_pactado: payload.salarioBruto,
            fecha_ingreso: payload.fechaIngreso,
            horario: payload.horario,
            activo: true
          }]);
          break;
        case 'UPDATE_EMPLEADO':
          await supabase.from('planilla_empleados').update({
            cedula: payload.cedula,
            nombre: payload.nombre,
            puesto: payload.puesto,
            salario_neto_pactado: payload.salarioBruto,
            fecha_ingreso: payload.fechaIngreso,
            horario: payload.horario,
            activo: payload.activo
          }).eq('id', payload.id);
          break;
        case 'TOGGLE_EMPLEADO':
          const emp = state.empleados.find(e => e.id === payload);
          await supabase.from('planilla_empleados').update({ activo: !emp.activo }).eq('id', payload);
          break;
        case 'ADD_VALE':
          const { data: newVal, error: valErr } = await supabase.from('planilla_vales').insert([{
            empleado_id: payload.empleadoId,
            monto: payload.monto,
            fecha: payload.fecha,
            descripcion: payload.descripcion
          }]).select();
          if (newVal?.[0]) {
            dispatch({ type: 'UPDATE_ID', payload: { entity: 'vales', oldId: payload.id, newId: newVal[0].id } });
          }
          break;
        case 'DELETE_VALE':
          await supabase.from('planilla_vales').delete().eq('id', payload);
          break;
        case 'ADD_INCIDENCIA':
          const { data: newInc, error: incErr } = await supabase.from('planilla_incidencias').insert([{
            empleado_id: payload.empleadoId,
            tipo: payload.tipo,
            fecha_inicio: payload.fechaInicio,
            fecha_fin: payload.fechaFin,
            hora_llegada: payload.horaLlegada,
            hora_salida: payload.horaSalida,
            horas_deducidas: payload.horasDeducidas,
            horas_estimadas: payload.horasEstimadas,
            justificacion: payload.justificacion,
            procesada: false
          }]).select();
          if (newInc?.[0]) {
            dispatch({ type: 'UPDATE_ID', payload: { entity: 'incidencias', oldId: payload.id, newId: newInc[0].id } });
          }
          break;
        case 'DELETE_INCIDENCIA':
          await supabase.from('planilla_incidencias').delete().eq('id', payload);
          break;
        case 'UPDATE_PARAMETROS':
          for (const [clave, valor] of Object.entries(payload)) {
            const isText = typeof valor === 'string';
            await supabase.from('core_parametros').upsert({
              clave,
              [isText ? 'valor_texto' : 'valor']: valor
            });
          }
          break;
        case 'ADD_BOLETAS':
          // Insert period if auto-generated and not in DB
          const periodIds = [...new Set(payload.map(b => b.periodoId))];
          for (const pid of periodIds) {
             const periodo = state.periodos.find(p => p.id === pid);
             if (periodo && periodo.id.startsWith('auto_')) {
                const { data: existing } = await supabase.from('planilla_periodos').select('id').eq('fecha_inicio', periodo.fechaInicio).eq('fecha_fin', periodo.fechaFin).single();
                if (!existing) {
                  const { data: newP } = await supabase.from('planilla_periodos').insert([{
                    fecha_inicio: periodo.fechaInicio,
                    fecha_fin: periodo.fechaFin,
                    tipo: periodo.tipo,
                    estado: 'cerrado'
                  }]).select().single();
                  // Correct periodIds in payload if we just created one
                  payload.forEach(b => { if(b.periodoId === pid) b.periodoId = newP.id; });
                } else {
                  payload.forEach(b => { if(b.periodoId === pid) b.periodoId = existing.id; });
                }
             }
          }
          // Insert boletas
          await supabase.from('planilla_boletas').insert(payload.map(b => ({
            periodo_id: b.periodoId,
            empleado_id: b.empleadoId,
            salario_neto_pactado: b.baseQuincenal + (b.deduccionHoras || 0),
            porcentaje_ccss_aplicado: b.porcentajeCCSSAplicado,
            salario_bruto_mensual: b.salarioBrutoQuincenal * 2, // approximation
            base_quincenal: b.baseQuincenal,
            valor_hora: b.valorHora,
            horas_extra_50: b.horas50,
            monto_extra_50: b.montoExtras50,
            horas_extra_100: b.horas200,
            monto_extra_100: b.montoExtras200,
            total_extras: b.totalExtras,
            deduccion_ccss: b.deduccionCCSS,
            total_vales: b.totalVales,
            deduccion_horas: b.deduccionHoras || 0,
            salario_bruto_quincenal: b.salarioBrutoQuincenal,
            salario_neto_quincenal: b.liquidoPagar,
            liquido_pagar: b.liquidoPagar,
            aguinaldo: b.aguinaldo || 0,
            incidencias_detalle: b.incidenciasDetalle
          })));
          break;
        case 'MARK_INCIDENCIAS_PROCESSED':
          await supabase.from('planilla_incidencias').update({ 
            procesada: true, 
            periodo_id: action.meta 
          }).in('id', payload);
          break;
        case 'CLOSE_PAYROLL': {
          const cpIncMarkers = payload.incidenciasToMark; // [{empleadoId, fechaInicio}]
          let cpPeriodId = payload.periodoId;
          const cpPeriodoDoc = state.periodos.find(p => p.id === cpPeriodId);
          
          // 1. Resolve/Create Period in DB
          if (cpPeriodoDoc && String(cpPeriodId).startsWith('auto_')) {
             const { data: cpExisting } = await supabase.from('planilla_periodos')
               .select('id')
               .eq('fecha_inicio', cpPeriodoDoc.fechaInicio)
               .eq('fecha_fin', cpPeriodoDoc.fechaFin)
               .maybeSingle();
               
             if (!cpExisting) {
                const { data: cpNewP } = await supabase.from('planilla_periodos').insert([{
                  fecha_inicio: cpPeriodoDoc.fechaInicio,
                  fecha_fin: cpPeriodoDoc.fechaFin,
                  tipo: cpPeriodoDoc.tipo,
                  mes: cpPeriodoDoc.mes,
                  estado: 'procesado'
                }]).select().single();
                if (cpNewP) cpPeriodId = cpNewP.id;
             } else {
                cpPeriodId = cpExisting.id;
                await supabase.from('planilla_periodos').update({ estado: 'procesado' }).eq('id', cpPeriodId);
             }
          } else {
             await supabase.from('planilla_periodos').update({ estado: 'procesado' }).eq('id', cpPeriodId);
          }

          // 2. Insert Boletas
          const cpBoletas = payload.boletas.map(b => ({
            periodo_id: cpPeriodId,
            empleado_id: b.empleadoId,
            salario_bruto_quincenal: b.salarioBrutoQuincenal,
            liquido_pagar: b.liquidoPagar,
            total_extras: b.totalExtras,
            total_vales: b.totalVales,
            deduccion_ccss: b.deduccionCCSS,
            deduccion_horas: b.deduccionHoras || 0,
            aguinaldo: b.aguinaldo || 0,
            incidencias_detalle: b.incidenciasDetalle,
            base_quincenal: b.baseQuincenal,
            valor_hora: b.valorHora,
            horas_extra_50: b.horas50,
            horas_extra_100: b.horas200
          }));
          await supabase.from('planilla_boletas').insert(cpBoletas);

          // 3. Mark Incidencias using empleado_id + fecha_inicio (reliable, not client IDs)
          if (cpIncMarkers.length > 0) {
            for (const marker of cpIncMarkers) {
              await supabase.from('planilla_incidencias').update({ 
                 procesada: true, 
                 periodo_id: cpPeriodId 
              })
              .eq('empleado_id', marker.empleadoId)
              .eq('fecha_inicio', marker.fechaInicio)
              .eq('procesada', false);
            }
          }
          break;
        }
        case 'UPDATE_PERIODO':
          await supabase.from('planilla_periodos').update({ 
            estado: payload.estado 
          }).eq('id', payload.id);
          break;
      }
    } catch (err) {
      console.error("Supabase Sync Error:", err);
      // Fallback: stay on local state, next mount will retry fetch
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8', gap: '1rem', flexDirection: 'column' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '0.875rem' }}>Conectando con Supabase...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{ state, dispatch: syncDispatch, addActividad }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}

export { DEFAULT_PARAMETROS, DEFAULT_HORARIO };

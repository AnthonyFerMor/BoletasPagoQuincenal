/**
 * Motor de Cálculo — SCPSC v2
 * Con soporte para horarios semanales e incidencias
 */

// === Schedule Helpers ===

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/**
 * Calculate hours for a single day from the schedule
 */
export function calcularHorasDia(dia) {
  if (!dia || !dia.trabaja || !dia.inicio || !dia.fin) return 0;
  const [h1, m1] = dia.inicio.split(':').map(Number);
  const [h2, m2] = dia.fin.split(':').map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins <= 0) mins += 24 * 60; // overnight shift
  return mins / 60;
}

/**
 * Calculate total weekly hours from a schedule
 */
export function calcularHorasSemanales(horario) {
  if (!horario) return 0;
  return Object.values(horario).reduce((sum, dia) => sum + calcularHorasDia(dia), 0);
}

/**
 * Calculate monthly hours from a schedule (weeks × 4.33)
 */
export function calcularHorasMensuales(horario) {
  return Math.round(calcularHorasSemanales(horario) * 4.33);
}

/**
 * Get the schedule for a specific date
 * @returns {object} { trabaja, inicio, fin }
 */
export function getHorarioFecha(horario, fecha) {
  const d = new Date(fecha + 'T12:00:00');
  const diaSemana = DIAS_SEMANA[d.getDay()];
  return horario[diaSemana] || { trabaja: false };
}

/**
 * Calculate hours for a specific date based on the employee schedule
 */
export function calcularHorasFecha(horario, fecha) {
  const dia = getHorarioFecha(horario, fecha);
  return calcularHorasDia(dia);
}

// === Incidencia Helpers ===

/**
 * Calculate deducted hours from incidencias
 * @param {Array} incidencias - list of incidencias for an employee
 * @param {Object} horario - employee schedule
 * @returns {number} total hours deducted
 */
export function calcularHorasIncidencias(incidencias, horario) {
  if (!incidencias || incidencias.length === 0) return 0;
  
  let totalHoras = 0;
  
  for (const inc of incidencias) {
    // Note: filtering (which incidencias to include) is now done upstream
    // in getIncidenciasEmpleado, so we process all passed-in incidencias here.
    
    switch (inc.tipo) {
      case 'ausencia': {
        // Full day absence — use schedule for that day
        totalHoras += calcularHorasFecha(horario, inc.fechaInicio);
        break;
      }
      case 'incapacidad': {
        // Date range — sum hours for each working day in range
        const start = new Date(inc.fechaInicio + 'T12:00:00');
        const end = new Date(inc.fechaFin + 'T12:00:00');
        const d = new Date(start);
        while (d <= end) {
          const dateStr = d.toISOString().split('T')[0];
          totalHoras += calcularHorasFecha(horario, dateStr);
          d.setDate(d.getDate() + 1);
        }
        break;
      }
      case 'salida_temprana': {
        // Left early — calculate difference
        const diaSchedule = getHorarioFecha(horario, inc.fechaInicio);
        if (diaSchedule.trabaja && diaSchedule.fin && inc.horaSalida) {
          const [hf, mf] = diaSchedule.fin.split(':').map(Number);
          const [hs, ms] = inc.horaSalida.split(':').map(Number);
          let diff = (hf * 60 + mf) - (hs * 60 + ms);
          if (diff < 0) diff = 0;
          totalHoras += diff / 60;
        }
        break;
      }
      case 'llegada_tarde': {
        // Arrived late — calculate difference
        const diaSchedule2 = getHorarioFecha(horario, inc.fechaInicio);
        if (diaSchedule2.trabaja && diaSchedule2.inicio && inc.horaLlegada) {
          const [hi, mi] = diaSchedule2.inicio.split(':').map(Number);
          const [hl, ml] = inc.horaLlegada.split(':').map(Number);
          let diff = (hl * 60 + ml) - (hi * 60 + mi);
          if (diff < 0) diff = 0;
          totalHoras += diff / 60;
        }
        break;
      }
      case 'permiso': {
        // Manual hours
        totalHoras += inc.horasDeducidas || 0;
        break;
      }
    }
  }
  
  return totalHoras;
}

// === Core Calculations ===

export function calcularSalarioBrutoMensual(salarioNeto, porcentajeCCSS = 0.1085) {
  if (salarioNeto <= 0) throw new Error('El salario neto debe ser mayor a 0');
  if (porcentajeCCSS < 0 || porcentajeCCSS >= 1) throw new Error('El porcentaje CCSS debe estar entre 0 y 1');
  return salarioNeto / (1 - porcentajeCCSS);
}

export function calcularBaseQuincenal(salarioBruto) {
  return salarioBruto / 2;
}

export function calcularValorHora(salarioBruto, horasMensuales = 240) {
  if (horasMensuales <= 0) throw new Error('Las horas mensuales deben ser mayor a 0');
  return salarioBruto / horasMensuales;
}

export function calcularExtras(valorHora, horas50 = 0, horas200 = 0, factor50 = 1.5, factor200 = 2.0) {
  const montoExtras50 = valorHora * horas50 * factor50;
  const montoExtras200 = valorHora * horas200 * factor200;
  return { montoExtras50, montoExtras200, totalExtras: montoExtras50 + montoExtras200 };
}

export function calcularDeduccionCCSS(baseQuincenal, totalExtras, porcentajeCCSS = 0.1085) {
  return (baseQuincenal + totalExtras) * porcentajeCCSS;
}

/**
 * Calcular boleta completa v2 — con soporte para incidencias
 */
export function calcularBoleta({
  salarioBruto,
  porcentajeCCSS = 0.1085,
  horasMensuales = 240,
  horas50 = 0,
  horas200 = 0,
  factor50 = 1.5,
  factor200 = 2.0,
  totalVales = 0,
  horasDeducidas = 0,
  incidenciasDetalle = [],
  aguinaldo = 0,
  otrosIngresos = 0,
  otrasDeducciones = 0,
}) {
  const salarioBrutoMensual = salarioBruto;
  let baseQuincenal = salarioBrutoMensual / 2;
  
  // Deduction by hours (from incidencias)
  const valorHora = calcularValorHora(salarioBrutoMensual, horasMensuales);
  const deduccionHoras = valorHora * horasDeducidas;
  baseQuincenal = baseQuincenal - deduccionHoras;
  
  const extras = calcularExtras(valorHora, horas50, horas200, factor50, factor200);
  const salarioBrutoQuincenal = baseQuincenal + extras.totalExtras + otrosIngresos;
  const deduccionCCSS = (baseQuincenal + extras.totalExtras) * porcentajeCCSS;
  const salarioNetoQuincenal = salarioBrutoQuincenal - deduccionCCSS;
  const liquidoPagar = salarioNetoQuincenal - totalVales - otrasDeducciones + aguinaldo;
  
  return {
    salarioNetoPactado: salarioBruto,
    porcentajeCCSSAplicado: porcentajeCCSS,
    salarioBrutoMensual: r(salarioBrutoMensual),
    baseQuincenal: r(baseQuincenal),
    valorHora: r(valorHora),
    horasMensuales,
    
    horas50, horas200,
    montoExtras50: r(extras.montoExtras50),
    montoExtras200: r(extras.montoExtras200),
    totalExtras: r(extras.totalExtras),
    
    horasDeducidas: r(horasDeducidas),
    deduccionHoras: r(deduccionHoras),
    incidenciasDetalle,
    deduccionCCSS: r(deduccionCCSS),
    totalVales: r(totalVales),
    aguinaldo: r(aguinaldo),
    otrosIngresos: r(otrosIngresos),
    otrasDeducciones: r(otrasDeducciones),
    
    salarioBrutoQuincenal: r(salarioBrutoQuincenal),
    salarioNetoQuincenal: r(salarioNetoQuincenal),
    liquidoPagar: r(liquidoPagar),
  };
}

function r(n) { return Math.round(n * 100) / 100; }

export function formatColones(amount) {
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 2 }).format(amount);
}

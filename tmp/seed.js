const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manual .env.local parsing
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_HORARIO = {
  lunes:     { trabaja: true, inicio: '07:00', fin: '16:00' },
  martes:    { trabaja: true, inicio: '07:00', fin: '16:00' },
  miercoles: { trabaja: true, inicio: '07:00', fin: '16:00' },
  jueves:    { trabaja: true, inicio: '07:00', fin: '16:00' },
  viernes:   { trabaja: true, inicio: '07:00', fin: '12:00' },
  sabado:    { trabaja: false, inicio: '', fin: '' },
  domingo:   { trabaja: false, inicio: '', fin: '' },
};

const EMPLEADOS = [
  { cedula: '1-1234-0567', nombre: 'María López Hernández', puesto: 'Asistente de Cuidado', salario_neto_pactado: 350000, horario: DEFAULT_HORARIO, fecha_ingreso: '2023-03-15', activo: true },
  { cedula: '2-0456-0789', nombre: 'Juan Pérez Solano', puesto: 'Cocina', salario_neto_pactado: 300000, horario: DEFAULT_HORARIO, fecha_ingreso: '2022-01-10', activo: true },
  { cedula: '1-0789-0123', nombre: 'Carlos Ramírez Mora', puesto: 'Mantenimiento', salario_neto_pactado: 280000, horario: {
    ...DEFAULT_HORARIO,
    viernes: { trabaja: true, inicio: '06:00', fin: '10:00' },
    sabado: { trabaja: true, inicio: '06:00', fin: '10:00' }
  }, fecha_ingreso: '2024-06-01', activo: true },
  { cedula: '3-0321-0654', nombre: 'Ana Solís Vargas', puesto: 'Asistente de Cuidado', salario_neto_pactado: 350000, horario: DEFAULT_HORARIO, fecha_ingreso: '2023-08-20', activo: true }
];

async function seed() {
  console.log("Iniciando carga de datos de ejemplo...");

  // 1. Empleados
  console.log("Insertando empleados...");
  const { data: emps, error: empErr } = await supabase.from('planilla_empleados').upsert(EMPLEADOS, { onConflict: 'cedula' }).select();
  if (empErr) {
    console.error("Error insertando empleados:", empErr.message);
    return;
  }
  console.log(`✓ ${emps.length} empleados insertados/actualizados.`);

  // 2. Vales
  console.log("Insertando vales...");
  const vales = [
    { empleado_id: emps[1].id, monto: 25000, fecha: '2026-03-05', descripcion: 'Adelanto personal' },
    { empleado_id: emps[3].id, monto: 15000, fecha: '2026-03-07', descripcion: 'Emergencia médica' },
    { empleado_id: emps[0].id, monto: 30000, fecha: '2026-03-02', descripcion: 'Adelanto quincenal' }
  ];
  const { error: valeErr } = await supabase.from('planilla_vales').insert(vales);
  if (valeErr) console.warn("Nota: Error insertando vales (posiblemente ya existen los IDs de prueba).", valeErr.message);
  else console.log("✓ Vales insertados.");

  // 3. Parámetros (Asegurar que existan todos)
  const params = [
    { clave: 'ccss_obrero', valor: 10.85, descripcion: 'Porcentaje CCSS' },
    { clave: 'factor_extra_50', valor: 1.5, descripcion: 'Factor 50%' },
    { clave: 'factor_extra_100', valor: 2.0, descripcion: 'Factor Doble' },
    { clave: 'dias_quincena', valor: 15, descripcion: 'Días quincena' },
    { clave: 'aguinaldo_mes', valor: 12, descripcion: 'Mes aguinaldo' },
    { clave: 'aguinaldo_quincena', valor_texto: 'primera_quincena', descripcion: 'Quincena aguinaldo' }
  ];
  const { error: paramErr } = await supabase.from('core_parametros').upsert(params, { onConflict: 'clave' });
  if (paramErr) console.error("Error insertando parámetros:", paramErr.message);
  else console.log("✓ Parámetros configurados.");

  console.log("\nProceso completado con éxito.");
}

seed();

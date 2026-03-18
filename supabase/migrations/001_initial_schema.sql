-- ============================================
-- SCPSC — Schema Inicial
-- Residencia Santa Clara S.R.L.
-- ============================================

-- 1. Parámetros del sistema
CREATE TABLE IF NOT EXISTS core_parametros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  valor NUMERIC NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar parámetros por defecto
INSERT INTO core_parametros (clave, valor, descripcion) VALUES
  ('ccss_obrero', 10.85, 'Porcentaje CCSS obrero (%)'),
  ('horas_mensuales', 240, 'Horas mensuales ordinarias'),
  ('factor_extra_50', 1.5, 'Factor multiplicador horas extra 50%'),
  ('factor_extra_100', 2.0, 'Factor multiplicador horas extra dobles'),
  ('dias_quincena', 15, 'Días en una quincena estándar')
ON CONFLICT (clave) DO NOTHING;

-- 2. Empleados
CREATE TABLE IF NOT EXISTS planilla_empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cedula TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  puesto TEXT,
  salario_neto_pactado NUMERIC NOT NULL DEFAULT 0,
  fecha_ingreso DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Vales / Adelantos
CREATE TABLE IF NOT EXISTS planilla_vales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES planilla_empleados(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT,
  periodo_id UUID REFERENCES planilla_periodos(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Periodos de pago
CREATE TABLE IF NOT EXISTS planilla_periodos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  tipo TEXT CHECK (tipo IN ('primera_quincena', 'segunda_quincena')) NOT NULL,
  estado TEXT CHECK (estado IN ('abierto', 'procesado', 'cerrado')) DEFAULT 'abierto',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- No permitir periodos superpuestos
  CONSTRAINT no_overlap_periodos EXCLUDE USING gist (
    daterange(fecha_inicio, fecha_fin, '[]') WITH &&
  )
);

-- 5. Boletas de pago
CREATE TABLE IF NOT EXISTS planilla_boletas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES planilla_periodos(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES planilla_empleados(id) ON DELETE CASCADE,
  
  -- Snapshot de parámetros al momento del cálculo
  salario_neto_pactado NUMERIC NOT NULL,
  porcentaje_ccss_aplicado NUMERIC NOT NULL,
  
  -- Cálculos
  salario_bruto_mensual NUMERIC NOT NULL,
  base_quincenal NUMERIC NOT NULL,
  valor_hora NUMERIC NOT NULL,
  
  -- Extras
  horas_extra_50 NUMERIC DEFAULT 0,
  monto_extra_50 NUMERIC DEFAULT 0,
  horas_extra_100 NUMERIC DEFAULT 0,
  monto_extra_100 NUMERIC DEFAULT 0,
  total_extras NUMERIC DEFAULT 0,
  
  -- Deducciones
  dias_no_laborados INTEGER DEFAULT 0,
  deduccion_dias NUMERIC DEFAULT 0,
  deduccion_ccss NUMERIC NOT NULL,
  total_vales NUMERIC DEFAULT 0,
  
  -- Resultados
  salario_bruto_quincenal NUMERIC NOT NULL,
  salario_neto_quincenal NUMERIC NOT NULL,
  liquido_pagar NUMERIC NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(periodo_id, empleado_id)
);

-- 6. Log de auditoría
CREATE TABLE IF NOT EXISTS planilla_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  accion TEXT CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vales_empleado ON planilla_vales(empleado_id);
CREATE INDEX IF NOT EXISTS idx_vales_periodo ON planilla_vales(periodo_id);
CREATE INDEX IF NOT EXISTS idx_boletas_periodo ON planilla_boletas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_boletas_empleado ON planilla_boletas(empleado_id);
CREATE INDEX IF NOT EXISTS idx_audit_tabla ON planilla_audit_log(tabla, registro_id);

-- ============================================
-- SCPSC — Actualización de Schema (002)
-- ============================================

-- 1. Agregar 'horario' a la tabla de empleados
ALTER TABLE planilla_empleados 
ADD COLUMN IF NOT EXISTS horario JSONB DEFAULT '{}'::jsonb;

-- 2. Modificar core_parametros para soportar valores de texto (necesario para aguinaldo_quincena)
ALTER TABLE core_parametros 
ALTER COLUMN valor DROP NOT NULL,
ADD COLUMN IF NOT EXISTS valor_texto TEXT;

-- Insertar parámetros faltantes
INSERT INTO core_parametros (clave, valor, descripcion) 
VALUES ('aguinaldo_mes', 12, 'Mes en el que se paga el aguinaldo') 
ON CONFLICT (clave) DO NOTHING;

INSERT INTO core_parametros (clave, valor_texto, descripcion) 
VALUES ('aguinaldo_quincena', 'primera_quincena', 'Quincena de pago de aguinaldo') 
ON CONFLICT (clave) DO NOTHING;

-- 3. Actualizar planilla_boletas con campos faltantes
ALTER TABLE planilla_boletas 
ADD COLUMN IF NOT EXISTS aguinaldo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS incidencias_detalle JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS factor_extra_50 NUMERIC DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS factor_extra_100 NUMERIC DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS deduccion_horas NUMERIC DEFAULT 0;

-- 4. Nueva tabla para Incidencias
CREATE TABLE IF NOT EXISTS planilla_incidencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES planilla_empleados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  hora_llegada TIME,
  hora_salida TIME,
  horas_deducidas NUMERIC DEFAULT 0,
  horas_estimadas NUMERIC DEFAULT 0,
  justificacion TEXT NOT NULL,
  procesada BOOLEAN DEFAULT false,
  periodo_id UUID REFERENCES planilla_periodos(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para la tabla de incidencias
CREATE INDEX IF NOT EXISTS idx_incidencias_empleado ON planilla_incidencias(empleado_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_periodo ON planilla_incidencias(periodo_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_procesada ON planilla_incidencias(procesada);

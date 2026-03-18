import React from 'react';

export default function IncidenciaImpresion({ incidencia, empleado }) {
  if (!incidencia || !empleado) return null;

  const formatFecha = (f) => {
    if (!f) return '---';
    if (f.includes('/')) return f; 
    const [y, m, d] = f.split('-');
    if (!y || !m || !d) return f;
    return `${d}/${m}/${y}`;
  };

  const tipoLabels = {
    'ausencia': 'Ausencia (Día Completo)',
    'llegada_tarde': 'Llegada Tardía',
    'salida_temprana': 'Salida Temprana',
    'incapacidad': 'Incapacidad Médica (CCSS/INS)',
    'permiso': 'Permiso sin Goce de Salario',
    'llegada_tardia': 'Llegada Tardía',
    'ausencia_injustificada': 'Ausencia Injustificada',
    'ausencia_justificada': 'Ausencia Justificada',
    'vacaciones': 'Día(s) de Vacaciones',
    'permiso_con_goce': 'Permiso (Con goce salarial)',
    'permiso_sin_goce': 'Permiso (Sin goce salarial)',
  };

  const S = {
    page: { width: '210mm', minHeight: '297mm', padding: '18mm 20mm', background: 'white', color: '#111', fontFamily: '"Times New Roman", Times, serif', boxSizing: 'border-box', fontSize: '10.5pt', lineHeight: '1.5', position: 'relative' },
    header: { textAlign: 'center', marginBottom: '20px', borderBottom: '3px double #111', paddingBottom: '12px' },
    h1: { margin: '0 0 4px 0', fontSize: '16pt', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' },
    cj: { margin: '0 0 6px 0', fontSize: '10pt', color: '#444' },
    docTitle: { margin: '0', fontWeight: 'bold', fontSize: '13pt' },
    infoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '20px' },
    infoCellLabel: { padding: '5px 8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #ccc', width: '28%' },
    infoCellValue: { padding: '5px 8px', border: '1px solid #ccc' },
    sectionTitle: { fontSize: '11pt', fontWeight: 'bold', margin: '18px 0 8px 0', padding: '4px 8px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '2px' },
  };

  return (
    <div className="boleta-page" style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>Residencia Santa Clara S.R.L.</h1>
        <div style={S.cj}>Cédula Jurídica: 3-102-754033</div>
        <div style={S.docTitle}>REGISTRO DE INCIDENCIA / PERMISO</div>
      </div>

      <table style={S.infoTable}>
        <tbody>
          <tr>
            <td style={S.infoCellLabel}>Trabajador:</td>
            <td style={S.infoCellValue}>{empleado.nombre}</td>
            <td style={S.infoCellLabel}>Cédula:</td>
            <td style={S.infoCellValue}>{empleado.cedula || 'N/A'}</td>
          </tr>
          <tr>
            <td style={S.infoCellLabel}>Puesto:</td>
            <td style={S.infoCellValue}>{empleado.puesto || 'Colaborador'}</td>
            <td style={S.infoCellLabel}>Área:</td>
            <td style={S.infoCellValue}>{empleado.departamento || 'General'}</td>
          </tr>
        </tbody>
      </table>

      <div style={S.sectionTitle}>1. Detalles de la Incidencia</div>
      <table style={{ ...S.infoTable, marginBottom: '16px' }}>
        <tbody>
          <tr>
            <td style={{ ...S.infoCellLabel, width: '30%' }}>Tipo de Evento</td>
            <td style={{ ...S.infoCellValue, textTransform: 'uppercase', fontWeight: 'bold' }}>{tipoLabels[incidencia.tipo] || incidencia.tipo}</td>
          </tr>
          <tr>
            <td style={S.infoCellLabel}>Fecha(s)</td>
            <td style={S.infoCellValue}>
              {incidencia.fechaInicio === incidencia.fechaFin || !incidencia.fechaFin
                ? formatFecha(incidencia.fechaInicio)
                : `Del ${formatFecha(incidencia.fechaInicio)} al ${formatFecha(incidencia.fechaFin)}`
              }
            </td>
          </tr>
          {(incidencia.horaLlegada || incidencia.horaSalida) && (
            <tr>
              <td style={S.infoCellLabel}>Hora Registrada</td>
              <td style={S.infoCellValue}>
                {incidencia.horaLlegada && `Llegada real: ${incidencia.horaLlegada}`}
                {incidencia.horaSalida && `Salida real: ${incidencia.horaSalida}`}
              </td>
            </tr>
          )}
          {incidencia.horasEstimadas > 0 && (
            <tr>
              <td style={S.infoCellLabel}>Horas Deducibles</td>
              <td style={S.infoCellValue}>{incidencia.horasEstimadas?.toFixed(1) || incidencia.horasDeducidas || '0'} horas</td>
            </tr>
          )}
          <tr>
            <td style={S.infoCellLabel}>Estado de Pago</td>
            <td style={S.infoCellValue}>
              {incidencia.tipo === 'ausencia' || incidencia.tipo === 'llegada_tarde' || incidencia.tipo === 'salida_temprana' || incidencia.tipo === 'permiso'
                ? 'Implica deducción salarial'
                : (incidencia.tipo === 'incapacidad' ? 'Subsidio CCSS/INS' : 'Con Goce Salarial')}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={S.sectionTitle}>2. Justificación / Motivo</div>
      <div style={{ minHeight: '80px', border: '1px solid #ccc', padding: '12px', borderRadius: '2px', whiteSpace: 'pre-wrap', fontSize: '10pt', marginBottom: '20px' }}>
        {incidencia.justificacion || 'No se adjuntó justificación para este evento.'}
      </div>

      {/* Firmas */}
      <div style={S.sectionTitle}>3. Constancias y Firmas</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', padding: '0 10px' }}>
        <div style={{ width: '42%', textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111', marginTop: '55px', paddingTop: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Firma del Trabajador</div>
          <div style={{ fontSize: '8pt', marginTop: '3px', color: '#555' }}>Conforme con lo reportado</div>
          <div style={{ fontSize: '8pt', color: '#888' }}>Cédula: {empleado.cedula}</div>
        </div>
        <div style={{ width: '42%', textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111', marginTop: '55px', paddingTop: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Jefatura / Recursos Humanos</div>
          <div style={{ fontSize: '8pt', marginTop: '3px', color: '#555' }}>Aprobación / Recepción</div>
          <div style={{ fontSize: '8pt', color: '#888' }}>Cédula: _______________</div>
        </div>
      </div>
      
      <div style={{ position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm', fontSize: '7.5pt', color: '#999', borderTop: '1px solid #ddd', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Ref: INC-{incidencia.id.substring(0,6).toUpperCase()} · Procesada: {incidencia.procesada ? 'SÍ' : 'NO'}</span>
        <span>Impreso: {new Date().toLocaleDateString('es-CR')}</span>
      </div>
    </div>
  );
}

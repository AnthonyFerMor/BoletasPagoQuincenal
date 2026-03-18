import React from 'react';
import { formatColones } from '@/lib/calculo-engine';

export default function BoletaImpresion({ boleta, periodo, empleado }) {
  if (!boleta || !periodo || !empleado) return null;

  const fmt = (n) => formatColones(n);
  
  const formatFecha = (f) => {
    if (!f || f === '---') return '---';
    if (f.includes('/')) return f;
    const [y, m, d] = f.split('-');
    if (!y || !m || !d) return f;
    return `${d}/${m}/${y}`;
  };
  
  const fechaPago = formatFecha(boleta.fechaPago || periodo.fechaFin);
  const periodoInicio = formatFecha(periodo.fechaInicio);
  const periodoFin = formatFecha(periodo.fechaFin);
  
  const totalDeducciones = (boleta.deduccionCCSS || 0) + (boleta.deduccionHoras || 0) + (boleta.totalVales || 0) + (boleta.otrasDeducciones || 0);

  const S = {
    page: { width: '210mm', minHeight: '297mm', padding: '18mm 20mm', background: 'white', color: '#111', fontFamily: '"Times New Roman", Times, serif', boxSizing: 'border-box', fontSize: '10.5pt', lineHeight: '1.5', pageBreakAfter: 'always', position: 'relative' },
    header: { textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #111', paddingBottom: '16px' },
    h1: { margin: '0 0 4px 0', fontSize: '17pt', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' },
    cj: { margin: '0 0 8px 0', fontSize: '10pt', color: '#444' },
    docTitle: { margin: '0', fontWeight: 'bold', fontSize: '13pt', letterSpacing: '0.5px' },
    infoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '20px' },
    infoCellLabel: { padding: '5px 8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #ccc', width: '22%' },
    infoCellValue: { padding: '5px 8px', border: '1px solid #ccc' },
    sectionTitle: { fontSize: '11pt', fontWeight: 'bold', margin: '20px 0 8px 0', padding: '4px 8px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '2px' },
    dataTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '8px' },
    dataRow: { borderBottom: '1px solid #e5e5e5' },
    dataConcept: { padding: '5px 8px', width: '65%' },
    dataAmount: { padding: '5px 8px', width: '35%', textAlign: 'right', fontFamily: '"Courier New", monospace' },
    totalRow: { borderTop: '2px solid #111', fontWeight: 'bold' },
    totalCell: { padding: '8px', fontWeight: 'bold' },
    netoBox: { border: '2px solid #111', padding: '12px 16px', textAlign: 'center', margin: '16px 0 20px 0', borderRadius: '4px', background: '#fafafa' },
    netoLabel: { fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', color: '#333' },
    netoValue: { fontSize: '16pt', fontWeight: 'bold', color: '#111' },
    firmaContainer: { display: 'flex', justifyContent: 'space-between', marginTop: '50px', padding: '0 10px' },
    firmaBlock: { width: '45%', textAlign: 'center' },
    firmaLinea: { borderTop: '1px solid #111', marginTop: '50px', paddingTop: '4px', fontWeight: 'bold', fontSize: '9pt' },
    firmaSub: { fontSize: '8pt', color: '#666', marginTop: '2px' },
    firmaCedula: { fontSize: '8pt', color: '#888', marginTop: '1px', fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm', fontSize: '7.5pt', color: '#999', borderTop: '1px solid #ddd', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' },
    note: { fontSize: '8.5pt', color: '#666', marginTop: '10px', fontStyle: 'italic', lineHeight: '1.4' },
  };

  return (
    <div className="boleta-page" style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>Residencia Santa Clara S.R.L.</h1>
        <div style={S.cj}>Cédula Jurídica: 3-102-754033</div>
        <div style={S.docTitle}>COMPROBANTE DE PAGO SALARIAL QUINCENAL</div>
      </div>

      {/* Employee Info */}
      <table style={S.infoTable}>
        <tbody>
          <tr>
            <td style={S.infoCellLabel}>Trabajador:</td>
            <td style={S.infoCellValue}>{boleta.empleadoNombre}</td>
            <td style={S.infoCellLabel}>Cédula:</td>
            <td style={S.infoCellValue}>{empleado?.cedula || 'N/A'}</td>
          </tr>
          <tr>
            <td style={S.infoCellLabel}>Puesto:</td>
            <td style={S.infoCellValue}>{empleado?.puesto || 'Colaborador'}</td>
            <td style={S.infoCellLabel}>Período:</td>
            <td style={S.infoCellValue}>Del {periodoInicio} al {periodoFin}</td>
          </tr>
          <tr>
            <td style={S.infoCellLabel}>Fecha de Pago:</td>
            <td style={S.infoCellValue}>{fechaPago}</td>
            <td style={S.infoCellLabel}>Horas/Mes:</td>
            <td style={S.infoCellValue}>{boleta.horasMensuales}</td>
          </tr>
        </tbody>
      </table>

      {/* I. INGRESOS */}
      <div style={S.sectionTitle}>I. INGRESOS</div>
      <table style={S.dataTable}>
        <thead>
          <tr style={{ borderBottom: '1px solid #999' }}>
            <th style={{ ...S.dataConcept, textAlign: 'left', fontSize: '9pt', fontWeight: '600', color: '#555' }}>Concepto</th>
            <th style={{ ...S.dataAmount, fontSize: '9pt', fontWeight: '600', color: '#555' }}>Monto (₡)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Salario Base Quincenal</td>
            <td style={S.dataAmount}>{fmt(boleta.baseQuincenal + boleta.deduccionHoras)}</td>
          </tr>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Horas Extra al 50%{boleta.horas50 > 0 ? ` (${boleta.horas50}h)` : ''}</td>
            <td style={S.dataAmount}>{boleta.montoExtras50 > 0 ? fmt(boleta.montoExtras50) : '—'}</td>
          </tr>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Horas Extra Dobles{boleta.horas200 > 0 ? ` (${boleta.horas200}h)` : ''}</td>
            <td style={S.dataAmount}>{boleta.montoExtras200 > 0 ? fmt(boleta.montoExtras200) : '—'}</td>
          </tr>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Aguinaldo / Bonificaciones</td>
            <td style={S.dataAmount}>{boleta.aguinaldo > 0 ? fmt(boleta.aguinaldo) : '—'}</td>
          </tr>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Otros Ingresos</td>
            <td style={S.dataAmount}>{boleta.otrosIngresos > 0 ? fmt(boleta.otrosIngresos) : '—'}</td>
          </tr>
          <tr style={S.totalRow}>
            <td style={{ ...S.dataConcept, ...S.totalCell }}>TOTAL SALARIO BRUTO</td>
            <td style={{ ...S.dataAmount, ...S.totalCell }}>{fmt(boleta.salarioBrutoQuincenal || 0)}</td>
          </tr>
        </tbody>
      </table>

      {/* II. DEDUCCIONES */}
      <div style={S.sectionTitle}>II. DEDUCCIONES</div>
      <table style={S.dataTable}>
        <thead>
          <tr style={{ borderBottom: '1px solid #999' }}>
            <th style={{ ...S.dataConcept, textAlign: 'left', fontSize: '9pt', fontWeight: '600', color: '#555' }}>Concepto</th>
            <th style={{ ...S.dataAmount, fontSize: '9pt', fontWeight: '600', color: '#555' }}>Monto (₡)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>CCSS Obrero ({(boleta.porcentajeCCSSAplicado * 100).toFixed(2)}%)</td>
            <td style={S.dataAmount}>{fmt(boleta.deduccionCCSS)}</td>
          </tr>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Ausencias / Llegadas Tardías{boleta.horasDeducidas > 0 ? ` (${boleta.horasDeducidas}h)` : ''}</td>
            <td style={S.dataAmount}>{boleta.deduccionHoras > 0 ? fmt(boleta.deduccionHoras) : '—'}</td>
          </tr>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Adelantos Salariales (Vales)</td>
            <td style={S.dataAmount}>{boleta.totalVales > 0 ? fmt(boleta.totalVales) : '—'}</td>
          </tr>
          <tr style={S.dataRow}>
            <td style={S.dataConcept}>Otras Deducciones Autorizadas</td>
            <td style={S.dataAmount}>{boleta.otrasDeducciones > 0 ? fmt(boleta.otrasDeducciones) : '—'}</td>
          </tr>
          <tr style={S.totalRow}>
            <td style={{ ...S.dataConcept, ...S.totalCell }}>TOTAL DEDUCCIONES</td>
            <td style={{ ...S.dataAmount, ...S.totalCell }}>{fmt(totalDeducciones)}</td>
          </tr>
        </tbody>
      </table>

      {/* III. NETO A RECIBIR */}
      <div style={S.netoBox}>
        <div style={S.netoLabel}>III. Salario Neto a Recibir</div>
        <div style={S.netoValue}>{fmt(boleta.liquidoPagar)}</div>
      </div>

      {boleta.incidenciasDetalle && boleta.incidenciasDetalle.length > 0 && (
        <div style={S.note}>
          * Nota: Se aplicaron rebajos por: {boleta.incidenciasDetalle.map(i => i.justificacion).join('; ')}.
        </div>
      )}

      {/* FIRMAS — 2 espacios */}
      <div style={S.firmaContainer}>
        <div style={S.firmaBlock}>
          <div style={S.firmaLinea}>Firma del Trabajador</div>
          <div style={S.firmaSub}>{boleta.empleadoNombre}</div>
          <div style={S.firmaCedula}>Cédula: {empleado?.cedula || '_______________'}</div>
        </div>
        <div style={S.firmaBlock}>
          <div style={S.firmaLinea}>Representante Legal</div>
          <div style={S.firmaSub}>Residencia Santa Clara S.R.L.</div>
          <div style={S.firmaCedula}>CJ: 3-102-754033</div>
        </div>
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <span>Documento generado por SCPSC — Sistema de Comprobantes de Pago</span>
        <span>Impreso: {new Date().toLocaleDateString('es-CR')}</span>
      </div>
    </div>
  );
}

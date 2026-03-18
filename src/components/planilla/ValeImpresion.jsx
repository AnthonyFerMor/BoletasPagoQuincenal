import React from 'react';
import { formatColones } from '@/lib/calculo-engine';

export default function ValeImpresion({ vale, empleado }) {
  if (!vale || !empleado) return null;

  const fmt = (n) => formatColones(n);

  const formatFecha = (f) => {
    if (!f) return '---';
    if (f.includes('/')) return f; 
    const [y, m, d] = f.split('-');
    if (!y || !m || !d) return f;
    return `${d}/${m}/${y}`;
  };

  const fechaVale = formatFecha(vale.fecha);

  const S = {
    page: { width: '210mm', minHeight: '148.5mm', padding: '18mm 20mm', background: 'white', color: '#111', fontFamily: '"Times New Roman", Times, serif', boxSizing: 'border-box', fontSize: '10.5pt', lineHeight: '1.5', position: 'relative' },
    header: { textAlign: 'center', marginBottom: '20px', borderBottom: '3px double #111', paddingBottom: '12px' },
    h1: { margin: '0 0 4px 0', fontSize: '16pt', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' },
    cj: { margin: '0 0 6px 0', fontSize: '10pt', color: '#444' },
    docTitle: { margin: '0', fontWeight: 'bold', fontSize: '13pt' },
    infoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '20px' },
    infoCellLabel: { padding: '5px 8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', border: '1px solid #ccc', width: '22%' },
    infoCellValue: { padding: '5px 8px', border: '1px solid #ccc' },
  };

  return (
    <div className="boleta-page" style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>Residencia Santa Clara S.R.L.</h1>
        <div style={S.cj}>Cédula Jurídica: 3-102-754033</div>
        <div style={S.docTitle}>COMPROBANTE DE ADELANTO SALARIAL (VALE)</div>
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
            <td style={S.infoCellLabel}>Fecha Emisión:</td>
            <td style={S.infoCellValue}>{fechaVale}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#fafafa', border: '1px solid #ddd', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: '10.5pt' }}>
          Por medio del presente documento, hago constar que he recibido de <strong>RESIDENCIA SANTA CLARA S.R.L.</strong> la cantidad de:
        </p>
        <div style={{ fontSize: '18pt', fontWeight: 'bold', textAlign: 'center', margin: '16px 0', padding: '12px', border: '2px solid #111', borderRadius: '4px', background: 'white' }}>
          {fmt(vale.monto)}
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '10pt' }}>
          <strong>En concepto de:</strong> Adelanto de salario (Vale).<br/>
          <strong>Motivo:</strong> {vale.descripcion || 'Adelanto salarial regular.'}
        </p>
        <p style={{ margin: '12px 0 0 0', fontSize: '9pt', fontStyle: 'italic', color: '#555' }}>
          * Autorizo expresamente que este monto me sea deducido de mi próximo pago quincenal correspondiente.
        </p>
      </div>

      {/* Firmas — 2 espacios */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 20px' }}>
        <div style={{ width: '42%', textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111', marginTop: '50px', paddingTop: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Firma del Trabajador</div>
          <div style={{ fontSize: '8pt', marginTop: '3px', color: '#555' }}>{empleado.nombre}</div>
          <div style={{ fontSize: '8pt', color: '#888' }}>Cédula: {empleado.cedula}</div>
        </div>
        <div style={{ width: '42%', textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111', marginTop: '50px', paddingTop: '5px', fontWeight: 'bold', fontSize: '9pt' }}>Aprobado por (Gerencia)</div>
          <div style={{ fontSize: '8pt', marginTop: '3px', color: '#555' }}>Residencia Santa Clara S.R.L.</div>
          <div style={{ fontSize: '8pt', color: '#888' }}>CJ: 3-102-754033</div>
        </div>
      </div>
      
      <div style={{ position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm', fontSize: '7.5pt', color: '#999', borderTop: '1px solid #ddd', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Ref: VALE-{vale.id.substring(0,6).toUpperCase()}</span>
        <span>Impreso: {new Date().toLocaleDateString('es-CR')}</span>
      </div>
    </div>
  );
}

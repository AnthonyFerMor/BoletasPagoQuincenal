/**
 * Calculate the estimated Aguinaldo based on historical boleta data
 * Aguinaldo is typically the sum of all gross salaries from Dec to Nov divided by 12.
 * @param {string} empleadoId
 * @param {Array} todasBoletas
 * @returns {number} The estimated aguinaldo amount
 */
export function estimarAguinaldoHistorico(empleadoId, todasBoletas) {
  if (!todasBoletas || todasBoletas.length === 0) return 0;
  
  // Filter boletas for this employee from the last 12 months roughly
  // In a real scenario, this would filter by the specific strictly defined period (Dec 1st - Nov 30th)
  // Since we don't have exact dates on boletas (they rely on periodoId), we sum all available
  // up to 24 quincenas (1 year).
  
  const boletasEmpleado = todasBoletas
    .filter(b => b.empleadoId === empleadoId)
    // Sort descending by creation/period assuming newer is first, if not we take all
    .slice(0, 24); 

  if (boletasEmpleado.length === 0) return 0;

  const totalBrutoAnual = boletasEmpleado.reduce((sum, b) => sum + (b.salarioBrutoQuincenal || 0), 0);
  
  // Divide by 12 months
  return Math.round(totalBrutoAnual / 12 * 100) / 100;
}

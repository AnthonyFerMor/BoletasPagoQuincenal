import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures an HTML element and downloads it as a PDF
 * @param {string} elementId - The ID of the HTML element to capture
 * @param {string} filename - The desired filename for the downloaded PDF
 */
export async function exportToPDF(elementId, filename = 'boleta-pago.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  try {
    // Save original styles that might affect rendering
    const originalStyle = element.style.cssText;
    
    // Temporarily adjust styles for better PDF rendering (remove shadows, adjust background)
    element.style.background = 'white';
    element.style.padding = '20px';
    element.style.boxShadow = 'none';
    element.style.borderRadius = '0';
    element.style.position = 'relative'; // Ensure proper positioning context
    element.style.zIndex = '9999'; // Bring to front

    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true, // Allow external images if any
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    // Restore original styles
    element.style.cssText = originalStyle;

    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions in mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

/**
 * Captures multiple HTML elements (pages) and downloads them as a single multi-page PDF
 * @param {string} containerId - The ID of the container holding elements with class 'boleta-page'
 * @param {string} filename - The desired filename for the downloaded PDF
 */
export async function exportMultipleToPDF(containerId, filename = 'boletas.pdf') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found.`);
    return false;
  }

  const pages = container.querySelectorAll('.boleta-page');
  if (pages.length === 0) {
    console.error('No .boleta-page elements found inside container.');
    return false;
  }

  try {
    // A4 format
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Temporary visibility fix for html2canvas
    const originalStyle = container.style.cssText;
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.opacity = '1';
    container.style.zIndex = '-9999';

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      
      // Wait for layout
      await new Promise(r => setTimeout(r, 50));

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // Approx A4 width in px at 96 DPI
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85); // use jpeg to reduce size if memory becomes issue

      if (i > 0) {
        pdf.addPage();
      }

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    // Restore container visibility
    container.style.cssText = originalStyle;

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating multi-page PDF:', error);
    return false;
  }
}


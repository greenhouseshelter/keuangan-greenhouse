import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Utility helper to export data to CSV format
 */
export function exportToCSV(headers: string[], rows: any[][], fileName: string) {
  // Map rows to strings, making sure to handle commas/quotes if any of the cells are objects or already quoted
  const formattedRows = rows.map(r => 
    r.map(val => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // If contains comma, double-quote, or newline, wrap in double quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  const csvContent = '\uFEFF' + [headers.join(','), ...formattedRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Utility helper to export data to Excel (.xlsx) format using SheetJS
 */
export function exportToExcel(headers: string[], rows: any[][], sheetName: string, fileName: string) {
  // Strip quotes wrappers if they were added for CSV mapping
  const cleanedRows = rows.map(r => 
    r.map(val => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1).replace(/""/g, '"');
      }
      return str;
    })
  );

  const data = [headers, ...cleanedRows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Save worksheet to binary
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

/**
 * Utility helper to export data to PDF (.pdf) format using jsPDF & jsPDF-AutoTable
 */
export function exportToPDF(
  title: string,
  headers: string[],
  rows: any[][],
  fileName: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  subtitle?: string
) {
  // Strip quotes wrappers if any
  const cleanedRows = rows.map(r => 
    r.map(val => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1).replace(/""/g, '"');
      }
      return str;
    })
  );

  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  });

  // Calculate generic page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Style section
  doc.setFillColor(15, 23, 42); // slate-900 background matching theme
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 16);

  // Subtitle / Date stamp
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  if (subtitle) {
    doc.text(subtitle, 14, 23);
  }
  doc.text(`Dicetak Pada: ${new Date().toLocaleString('id-ID')} (WIB/Lokal)`, 14, 28);
  doc.text(`Kas Greenhouse Modern - Sistem Pencatatan Terintegrasi`, 14, 33);

  // AutoTable insertion
  autoTable(doc, {
    head: [headers],
    body: cleanedRows,
    startY: 48,
    margin: { left: 10, right: 10 },
    theme: 'striped',
    styles: {
      fontSize: orientation === 'landscape' ? 7 : 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900 header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50 alternate background
    },
  });

  // Save pdf
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

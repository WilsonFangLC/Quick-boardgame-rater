// CSV utility functions to handle proper escaping and formatting

/**
 * Escapes a CSV field value by wrapping it in quotes if it contains commas, quotes, or newlines
 * @param {string|number} value - The value to escape
 * @returns {string} - The properly escaped CSV field
 */
export const escapeCsvField = (value) => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape existing quotes by doubling them
    const escapedValue = stringValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }
  
  return stringValue;
};

/**
 * Converts an array of objects to CSV format with proper escaping
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Array<string>} headers - Optional custom headers, defaults to keys of first object
 * @returns {string} - The CSV string
 */
export const arrayToCsv = (data, headers = null) => {
  if (!data || data.length === 0) return '';
  
  const csvHeaders = headers || Object.keys(data[0]);
  const headerRow = csvHeaders.map(escapeCsvField).join(',');
  
  const dataRows = data.map(row => 
    csvHeaders.map(header => escapeCsvField(row[header])).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Creates and downloads a CSV file
 * @param {string} csvContent - The CSV content
 * @param {string} filename - The filename for the download
 */
export const downloadCsv = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
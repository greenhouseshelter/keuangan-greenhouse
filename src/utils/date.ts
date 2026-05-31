/**
 * Utility: Format YYYY-MM-DD date to Indonesian dd-mmm-yyyy format without time
 */
export const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  // Split by 'T' or whitespace to strip time portions if present
  const baseDate = dateStr.split(/[T\s]/)[0];
  const parts = baseDate.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const days = parts[2];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthName = months[monthIdx] || parts[1];
  return `${days}-${monthName}-${year}`;
};

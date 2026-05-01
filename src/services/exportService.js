const { getSheetData } = require('../config/spreadsheet');
const { formatDate } = require('../utils/dateHelper');
const { verifyUser } = require('./authService');
const { getMonitoringRealtime } = require('./monitoringService');

async function getExportData(type, filters) {
  const data = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
  
  if (type === 'laporan_absensi') {
    const result = [];
    const fStart = filters.tanggalMulai || "";
    const fEnd = filters.tanggalAkhir || "";
    const fKelas = filters.kelas || "";
    
    let no = 1;
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      
      let rawDate = new Date(data[i][0]);
      let tanggalStr = formatDate(rawDate, process.env.TIMEZONE || 'Asia/Jakarta', 'dd-MM-yyyy');
      let dateForFilter = formatDate(rawDate, process.env.TIMEZONE || 'Asia/Jakarta', 'yyyy-MM-dd');
      let rowKelas = data[i][3];

      let match = true;
      if (fStart && dateForFilter < fStart) match = false;
      if (fEnd && dateForFilter > fEnd) match = false;
      if (fKelas && rowKelas != fKelas) match = false;

      if (match) {
        let jamDatang = data[i][4];
        let jamPulang = data[i][5] || '-';
        
        result.push([
          no++,
          tanggalStr,
          "'" + data[i][1],
          data[i][2],
          rowKelas,
          jamDatang,
          jamPulang,
          data[i][6] || '-',
          data[i][7] || '-'
        ]);
      }
    }
    return result;
  } else if (type === 'monitoring') {
    const realtimeData = await getMonitoringRealtime(filters.token, filters.kelas);
    if (!realtimeData.success) return [];
    
    const monitoringData = realtimeData.data;
    const result = [];
    
    monitoringData.forEach((item, index) => {
      result.push([
        index + 1,
        item.nama,
        "'" + item.nisn,
        item.kelas,
        item.jamDatang,
        item.jamPulang,
        item.keterangan,
        item.status
      ]);
    });
    
    return result;
  }
  
  return [];
}

async function generateExcel(token, type, filters) {
  try {
    await verifyUser(token, 'guru');
    
    const Excel = require('exceljs');
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Absensi');
    
    let headers = [];
    let fileName = "";
    let timestamp = formatDate(new Date(), process.env.TIMEZONE || 'Asia/Jakarta', 'dd-MM-yyyy HHmm');
    
    if (type === 'laporan_absensi') {
      fileName = `Laporan Absensi - ${timestamp}.xlsx`;
      headers = ["No", "Tanggal", "NISN", "Nama Siswa", "Kelas", "Jam Datang", "Jam Pulang", "Keterangan Waktu", "Status Kehadiran"];
    } else if (type === 'monitoring') {
      fileName = `Monitoring Harian - ${timestamp}.xlsx`;
      headers = ["No", "Nama Siswa", "NISN", "Kelas", "Jam Datang", "Jam Pulang", "Keterangan Waktu", "Status Terkini"];
    }
    
    // Add headers
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Get data
    filters.token = token;
    const data = await getExportData(type, filters);
    
    // Add data rows
    data.forEach(row => {
      const dataRow = worksheet.addRow(row);
      dataRow.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle' };
        
        // Special formatting for status column
        if (colNumber === headers.length && row[headers.length - 1]) {
          const status = row[headers.length - 1];
          if (status === 'Hadir') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            cell.font = { color: { argb: 'FF166534' }, bold: true };
          } else if (status === 'Sakit') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
            cell.font = { color: { argb: 'FF854D0E' }, bold: true };
          } else if (status === 'Izin') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
            cell.font = { color: { argb: 'FF1E40AF' }, bold: true };
          } else if (status === 'Alpa') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { color: { argb: 'FF991B1B' }, bold: true };
          }
        }
      });
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 30);
    });
    
    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    return { success: true, buffer, fileName };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

module.exports = {
  getExportData,
  generateExcel
};
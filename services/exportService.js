const Excel = require('exceljs');
const { getSheetData } = require('./googleSheetsService');
const { verifyToken } = require('./authService');
const { getRealtime } = require('./monitoringService');

async function generateExcel(token, type, filters) {
  try {
    await verifyToken(token);
    
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');
    
    let headers = [];
    let data = [];
    
    if (type === 'laporan_absensi') {
      headers = ['No', 'Tanggal', 'NISN', 'Nama', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan', 'Status'];
      const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
      
      let no = 1;
      for (let i = 1; i < absensiData.length; i++) {
        if (absensiData[i][0]) {
          data.push([
            no++,
            new Date(absensiData[i][0]).toISOString().split('T')[0],
            absensiData[i][1],
            absensiData[i][2],
            absensiData[i][3],
            absensiData[i][4] || '-',
            absensiData[i][5] || '-',
            absensiData[i][6] || '-',
            absensiData[i][7] || '-'
          ]);
        }
      }
    } else if (type === 'monitoring') {
      headers = ['No', 'Nama', 'NISN', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan', 'Status'];
      const monitoring = await getRealtime(token, filters?.kelas);
      if (monitoring.success) {
        monitoring.data.forEach((item, idx) => {
          data.push([
            idx + 1,
            item.nama,
            item.nisn,
            item.kelas,
            item.jamDatang,
            item.jamPulang,
            item.keterangan,
            item.status
          ]);
        });
      }
    }
    
    // Add header row
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Add data rows
    data.forEach(row => {
      worksheet.addRow(row);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const length = cell.value ? cell.value.toString().length : 10;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(maxLength + 2, 30);
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return { success: true, buffer, fileName };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { generateExcel };

const { google } = require('googleapis');

let authClient = null;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function getAuthClient() {
  if (authClient) return authClient;
  
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  authClient = new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  
  return authClient;
}

async function getSheets() {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

async function getSheetData(sheetName) {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Error reading ${sheetName}:`, error.message);
    return [];
  }
}

async function appendToSheet(sheetName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [values] },
  });
}

async function updateSheetCell(sheetName, row, column, value) {
  const sheets = await getSheets();
  const colLetter = String.fromCharCode(64 + column);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colLetter}${row}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[value]] },
  });
}

async function updateSheetRange(sheetName, row, startCol, values) {
  const sheets = await getSheets();
  const startColLetter = String.fromCharCode(64 + startCol);
  const endColLetter = String.fromCharCode(64 + startCol + values[0].length - 1);
  const range = `${sheetName}!${startColLetter}${row}:${endColLetter}${row + values.length - 1}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: values },
  });
}

async function deleteSheetRow(sheetName, rowIndex) {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    includeGridData: false,
  });
  
  const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    }
  });
}

module.exports = {
  getSheetData,
  appendToSheet,
  updateSheetCell,
  updateSheetRange,
  deleteSheetRow
};

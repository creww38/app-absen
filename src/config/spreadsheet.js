const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

let authClient = null;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Menggunakan Service Account Authentication
async function getAuthClient() {
  if (authClient) return authClient;
  
  try {
    // Parse private key yang mengandung \n
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    authClient = new google.auth.JWT(
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    return authClient;
  } catch (error) {
    console.error('Error creating auth client:', error);
    throw error;
  }
}

async function getSheets() {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

async function getSheetData(sheetName) {
  const sheets = await getSheets();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    return response.data.values || [];
  } catch (error) {
    if (error.code === 404) {
      return [];
    }
    throw error;
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

async function updateSheetRange(sheetName, startRow, startCol, values) {
  const sheets = await getSheets();
  const startColLetter = String.fromCharCode(64 + startCol);
  const endColLetter = String.fromCharCode(64 + startCol + values[0].length - 1);
  const range = `${sheetName}!${startColLetter}${startRow}:${endColLetter}${startRow + values.length - 1}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: values },
  });
}

async function updateSheetCell(sheetName, row, column, value) {
  await updateSheetRange(sheetName, row, column, [[value]]);
}

async function deleteSheetRow(sheetName, rowIndex) {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [sheetName],
    includeGridData: false,
  });
  
  const sheetId = response.data.sheets[0].properties.sheetId;
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    }
  });
}

async function batchUpdate(sheetName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: values.map(item => ({
        range: `${sheetName}!${item.range}`,
        values: item.values
      }))
    }
  });
}

module.exports = {
  getSheetData,
  appendToSheet,
  updateSheetRange,
  updateSheetCell,
  deleteSheetRow,
  batchUpdate,
  SPREADSHEET_ID
};
const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v2.xlsx');
const workbook = xlsx.readFile(filePath);

console.log('Sheets available:', workbook.SheetNames);

const sheetName = workbook.SheetNames.find(name => name.includes('เกณฑ์'));
if (sheetName) {
  console.log('\n--- Content of ' + sheetName + ' ---');
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(JSON.stringify(data, null, 2));
} else {
  console.log('Sheet containing "เกณฑ์" not found.');
}

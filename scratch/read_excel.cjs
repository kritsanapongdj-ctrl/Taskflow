const xlsx = require('xlsx');

const workbook = xlsx.readFile('rpg-performance-tracker-v2.xlsx');
console.log("Sheet Names:", workbook.SheetNames);

const sheetName = workbook.SheetNames.includes('ประเมินผลทีม') ? 'ประเมินผลทีม' : workbook.SheetNames[1];
const worksheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log("\nSample Data (First 10 rows):");
console.log(JSON.stringify(data.slice(0, 10), null, 2));

import xlsx from 'xlsx';
import fs from 'fs';

const workbook = xlsx.readFile('./alimentos.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

const mappedData = data.map((row, index) => ({
    id: `excel-${index}`,
    name: row['Denominacion Legal'] || 'Unknown',
    kcal: parseFloat(row['Energía \n(Kcal x 100g)']) || 0,
    p: parseFloat(row['Proteínas \n']) || 0,
    c: parseFloat(row['Hidratos de carbono \n']) || 0,
    f: parseFloat(row['Grasa total ']) || 0
}));

fs.writeFileSync('./apps/web/data/foodDatabase.json', JSON.stringify(mappedData, null, 2));
console.log(`Saved ${mappedData.length} food items to database.`);

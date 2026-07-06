const fs = require('fs');

const code = fs.readFileSync('src/views/Relatorio.tsx', 'utf-8');

const startIdx = code.indexOf('<table className="w-full text-left text-xs border-collapse font-sans">');
const endStr = '</table>\n            </div>\n          </div>\n        </div>\n      )}\n\n      {activeSubTab === \'logs\' && (';
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const newTable = '<DynamicTable id="relatorio-producao" data={filteredProductionMovements} columns={productionColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />';
  const newCode = code.substring(0, startIdx) + newTable + '\n' + code.substring(endIdx + '</table>'.length);
  fs.writeFileSync('src/views/Relatorio.tsx', newCode);
  console.log('Successfully replaced table in Relatorio.tsx');
} else {
  console.log('Could not find start or end index for table replacement.');
  console.log('startIdx:', startIdx, 'endIdx:', endIdx);
}

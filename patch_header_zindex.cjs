const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  '<header className="relative z-10 flex justify-between items-center p-6 pb-2">',
  '<header className="relative z-50 flex justify-between items-center p-6 pb-2">'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched header z-index");

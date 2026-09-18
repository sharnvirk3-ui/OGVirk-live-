const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const saveAnchor = `        name: hubEdit.name || '',
        title: hubEdit.title || '',`;
const saveReplace = `        name: hubEdit.name || '',
        title: hubEdit.title || '',
        backgroundType: hubEdit.backgroundType || 'default',
        backgroundUrl: hubEdit.backgroundUrl || '',`;
code = code.replace(saveAnchor, saveReplace);

fs.writeFileSync('src/App.tsx', code);

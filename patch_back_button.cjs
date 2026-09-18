const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `{(tabHistory.length > 0 || (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen))) && (`
const replace = `{activeTab !== 'hub' && (tabHistory.length > 0 || (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen))) && (`

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
console.log("Replaced back button target");

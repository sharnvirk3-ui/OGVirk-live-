const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetFunc = `  const handlePurgeErrors = async () => {
    if (!isAdminAuth) return;
    try {
      for (const log of errorLogs) {
        await deleteDoc(doc(db, 'errorLogs', log.id));
      }
    } catch (err) { console.error(err); }
  };`;

if (code.includes(targetFunc)) {
  code = code.replace(targetFunc, '');
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully removed handlePurgeErrors.");
} else {
  console.log("Could not find handlePurgeErrors.");
}

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add isSyncing state
const stateTarget = "const [chatInput, setChatInput] = useState('');";
const stateReplace = "const [chatInput, setChatInput] = useState('');\n  const [isSyncing, setIsSyncing] = useState(false);";
if (code.includes(stateTarget)) {
  code = code.replace(stateTarget, stateReplace);
}

// 2. Update handleForceSync
const funcTarget = `  const handleForceSync = async () => {
    try {
      await setDoc(doc(db, 'config', 'hub'), { lastSync: serverTimestamp() }, { merge: true });
      showToast('Global sync triggered successfully!', 'success');
    } catch(err) {
      console.error(err);
      showToast('Sync failed', 'error');
    }
  };`;

const funcReplace = `  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await setDoc(doc(db, 'config', 'hub'), { lastSync: serverTimestamp() }, { merge: true });
      
      // Keep spinning for 1.5s for visual confirmation
      setTimeout(() => {
        setIsSyncing(false);
        showToast('Global sync triggered successfully!', 'success');
      }, 1500);
    } catch(err) {
      console.error(err);
      setIsSyncing(false);
      showToast('Sync failed', 'error');
    }
  };`;
if (code.includes(funcTarget)) {
  code = code.replace(funcTarget, funcReplace);
}

// 3. Update Sync Button
const btnTarget = `<button onClick={handleForceSync} className="text-xs font-bold text-green-400 hover:text-white flex items-center bg-green-900/30 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-600/50 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                        <RefreshCw className="w-3 h-3 mr-1" /> SYNC
                      </button>`;
const btnReplace = `<button onClick={handleForceSync} disabled={isSyncing} className="text-xs font-bold text-green-400 hover:text-white flex items-center bg-green-900/30 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-600/50 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.2)] disabled:opacity-50">
                        <RefreshCw className={\`w-3 h-3 mr-1 \${isSyncing ? 'animate-spin' : ''}\`} /> {isSyncing ? 'SYNCING...' : 'SYNC'}
                      </button>`;
if (code.includes(btnTarget)) {
  code = code.replace(btnTarget, btnReplace);
}

fs.writeFileSync('src/App.tsx', code);
console.log("Sync button updated.");

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add activeUsersCount state
const stateTarget = "const [chatInput, setChatInput] = useState('');";
const stateReplace = "const [chatInput, setChatInput] = useState('');\n  const [activeUsersCount, setActiveUsersCount] = useState(0);";
if (code.includes(stateTarget)) {
  code = code.replace(stateTarget, stateReplace);
}

// 2. Add Presence UseEffects
const effectsTarget = `  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);`;

const effectsReplace = `  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Presence logic
  useEffect(() => {
    if (!user) return;
    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'presence', user.uid), {
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error('Presence error:', e);
      }
    };
    
    updatePresence();
    const intervalId = setInterval(updatePresence, 60000);
    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'presence'), (snap) => {
      const now = Date.now();
      let count = 0;
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isOnline && data.lastSeen) {
          const lastSeenMs = data.lastSeen.toMillis ? data.lastSeen.toMillis() : Date.now();
          if (now - lastSeenMs < 180000) { // 3 minutes
            count++;
          }
        }
      });
      setActiveUsersCount(count > 0 ? count : 1); // at least 1 if user is logged in (optimistic)
    });
    return () => unsub();
  }, []);`;

if (code.includes(effectsTarget)) {
  code = code.replace(effectsTarget, effectsReplace);
}

// 3. Update Chat UI
const uiTarget = `              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="w-6 h-6 text-[#FF6B00]" />
                <h2 className="text-xl font-black text-white tracking-wide uppercase">Global Chat</h2>
              </div>`;

const uiReplace = `              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-6 h-6 text-[#FF6B00]" />
                  <h2 className="text-xl font-black text-white tracking-wide uppercase">Global Chat</h2>
                </div>
                <div className="flex items-center space-x-1.5 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-gray-300">{activeUsersCount} Online</span>
                </div>
              </div>`;

if (code.includes(uiTarget)) {
  code = code.replace(uiTarget, uiReplace);
}

fs.writeFileSync('src/App.tsx', code);
console.log("Presence patched.");

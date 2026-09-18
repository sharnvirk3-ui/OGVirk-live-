const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The original state was:
// const [activeUsersCount, setActiveUsersCount] = useState(0);

// I added:
const addedEffects = `  // Presence logic
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

if(code.includes(addedEffects)) {
    code = code.replace(addedEffects, '');
    fs.writeFileSync('src/App.tsx', code);
    console.log('Removed duplicate effects.');
} else {
    console.log('Duplicate effects not found.');
}

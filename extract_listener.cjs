const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  useEffect(() => {
    if (!user) return;

    // Update presence
    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'presence', user.uid), {
          lastActive: Date.now()
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update presence', err);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000); // every minute

    // Listen to presence
    const presenceUnsub = onSnapshot(collection(db, 'presence'), (snap) => {
      const now = Date.now();
      const activeCount = snap.docs.filter(doc => {
        const data = doc.data();
        return data.lastActive && (now - data.lastActive < 300000); // active in last 5 minutes
      }).length;
      setActiveUsersCount(activeCount);
    });

    return () => {
      clearInterval(interval);
      presenceUnsub();
    };
  }, [user]);`;

const replace = `  // Listen to presence (always run)
  useEffect(() => {
    const presenceUnsub = onSnapshot(collection(db, 'presence'), (snap) => {
      const now = Date.now();
      const activeCount = snap.docs.filter(doc => {
        const data = doc.data();
        return data.lastActive && (now - data.lastActive < 300000); // active in last 5 minutes
      }).length;
      setActiveUsersCount(activeCount);
    }, (error) => {
      console.error("Presence listen error", error);
    });
    return () => presenceUnsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Update presence
    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'presence', user.uid), {
          lastActive: Date.now()
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update presence', err);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000); // every minute

    return () => clearInterval(interval);
  }, [user]);`;

if (code.includes(target)) {
    code = code.replace(target, replace);
    fs.writeFileSync('src/App.tsx', code);
    console.log('Extracted presence listener.');
} else {
    console.log('Target not found for extraction.');
}

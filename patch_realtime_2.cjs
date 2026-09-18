const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldSub = code.substring(code.indexOf("const gamesUnsub ="), code.indexOf("return () => {") - 6);

const newSub = `const gamesUnsub = onSnapshot(query(collection(db, 'games'), orderBy('createdAt', 'desc')), (snap) => {
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const errorsUnsub = onSnapshot(query(collection(db, 'errorLogs'), orderBy('createdAt', 'desc')), (snap) => {
      const newErrors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setErrorLogs(newErrors);
      if (!initialErrors.current) {
        if (newErrors.length > errorsCount.current) {
          showToast('New Error Report Submitted!', 'error');
          if (isAdminRef.current) playNotificationSound();
        }
      } else {
        initialErrors.current = false;
      }
      errorsCount.current = newErrors.length;
    });

    const ratingsUnsub = onSnapshot(query(collection(db, 'ratings'), orderBy('createdAt', 'desc')), (snap) => {
      const newRatings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRatings(newRatings);
      if (!initialRatings.current) {
        if (newRatings.length > ratingsCount.current) {
          showToast('New User Feedback Received!', 'success');
          if (isAdminRef.current) playNotificationSound();
        }
      } else {
        initialRatings.current = false;
      }
      ratingsCount.current = newRatings.length;
    });

    const videosUnsub = onSnapshot(query(collection(db, 'youtubeVideos'), orderBy('createdAt', 'desc')), (snap) => {
      setYoutubeVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const hubUnsub = onSnapshot(doc(db, 'config', 'hub'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHubConfig(data);
        setHubEdit(data);
        if (data.layout) {
          setHubLayout(prev => ({
            ...prev,
            ...data.layout,
            photo: { ...prev.photo, ...data.layout.photo },
            nameText: { ...prev.nameText, ...(data.layout.nameText || data.layout.text) },
            titleText: { ...prev.titleText, ...(data.layout.titleText || data.layout.text) },
            buttons: { ...prev.buttons, ...data.layout.buttons },
            stats: { ...prev.stats, ...data.layout.stats }
          }));
        }
        if (!initialHub.current) {
           showToast('System Layout/Config updated live!', 'info');
        } else {
           initialHub.current = false;
        }
      } else {
        // Set defaults if no config exists
        setHubEdit({
          name: 'Sharn Virk',
          title: 'DEVELOPER & FOUNDER',
          profilePhotoUrl: '',
          callNumber: '',
          whatsappNumber: '',
          instagramUrl: '',
          instagramLabel: '',
          youtubeProfileUrl: '',
          youtubeLabel: '',
          youtubeSubscribers: '0'
        });
      }
    });`;

code = code.replace(oldSub, newSub);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched subscriptions successfully");

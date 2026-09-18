const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add AnimatePresence
code = code.replace("import { motion } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';");

// Insert refs and toast state
const hooksTarget = `  const [hubEdit, setHubEdit] = useState<any>({});`;
const hooksReplace = `  const [hubEdit, setHubEdit] = useState<any>({});

  // Real-time notifications state
  const [toast, setToast] = useState<{message: string, type: 'info'|'success'|'error', id: number} | null>(null);
  const showToast = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };
  const playNotificationSound = () => {
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
    audio.volume = 0.6;
    audio.play().catch(e => console.log('Audio play failed', e));
  };

  const initialHub = useRef(true);
  const initialRatings = useRef(true);
  const initialErrors = useRef(true);
  const ratingsCount = useRef(0);
  const errorsCount = useRef(0);
  const isAdminRef = useRef(isAdminAuth);

  useEffect(() => {
    isAdminRef.current = isAdminAuth;
  }, [isAdminAuth]);`;

code = code.replace(hooksTarget, hooksReplace);

// Update subscriptions
const subTarget = `    const gamesUnsub = onSnapshot(query(collection(db, 'games'), orderBy('createdAt', 'desc')), (snap) => {
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const errorsUnsub = onSnapshot(query(collection(db, 'errorLogs'), orderBy('createdAt', 'desc')), (snap) => {
      setErrorLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const ratingsUnsub = onSnapshot(query(collection(db, 'ratings'), orderBy('createdAt', 'desc')), (snap) => {
      setRatings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
            buttons: { ...prev.buttons, ...data.layout.buttons },
            stats: { ...prev.stats, ...data.layout.stats }
          }));
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

const subReplace = `    const gamesUnsub = onSnapshot(query(collection(db, 'games'), orderBy('createdAt', 'desc')), (snap) => {
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

code = code.replace(subTarget, subReplace);

// Render Toast
const jsxTarget = `  return (
    <div 
      className="h-screen w-full flex flex-col bg-cover bg-center overflow-hidden relative select-none"
      style={{ backgroundImage: \`url('\${hubConfig?.backgroundUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'}')\` }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      <div className="relative z-10 h-full max-w-2xl mx-auto w-full flex flex-col bg-[#0A0D14]/30 shadow-2xl backdrop-blur-sm border-x border-gray-800/50">`;

const jsxReplace = `  return (
    <div 
      className="h-screen w-full flex flex-col bg-cover bg-center overflow-hidden relative select-none"
      style={{ backgroundImage: \`url('\${hubConfig?.backgroundUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'}')\` }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Global Real-time Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={\`absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border \${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
              toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
              'bg-blue-500/20 border-blue-500/50 text-blue-400'
            }\`}
          >
            <BellRing className="w-5 h-5 mr-3" />
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 h-full max-w-2xl mx-auto w-full flex flex-col bg-[#0A0D14]/30 shadow-2xl backdrop-blur-sm border-x border-gray-800/50">`;

code = code.replace(jsxTarget, jsxReplace);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched realtime");

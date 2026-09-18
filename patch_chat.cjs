const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add states
const statesTarget = "const [youtubeSearch, setYoutubeSearch] = useState('');";
const statesReplace = `const [youtubeSearch, setYoutubeSearch] = useState('');

  // Chat States
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);`;
if(code.includes(statesTarget)) { code = code.replace(statesTarget, statesReplace); } else { console.log('statesTarget not found'); }

// 2. Add subscription
const subTarget = `    const videosUnsub = onSnapshot(query(collection(db, 'youtubeVideos'), orderBy('createdAt', 'desc')), (snap) => {
      setYoutubeVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });`;
const subReplace = `    const videosUnsub = onSnapshot(query(collection(db, 'youtubeVideos'), orderBy('createdAt', 'desc')), (snap) => {
      setYoutubeVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const chatUnsub = onSnapshot(query(collection(db, 'chatMessages'), orderBy('createdAt', 'asc')), (snap) => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    });`;
if(code.includes(subTarget)) { code = code.replace(subTarget, subReplace); } else { console.log('subTarget not found'); }

// 3. Add unsubscribe
const unsubTarget = `      videosUnsub();
      hubUnsub();
    };`;
const unsubReplace = `      videosUnsub();
      chatUnsub();
      hubUnsub();
    };`;
if(code.includes(unsubTarget)) { code = code.replace(unsubTarget, unsubReplace); } else { console.log('unsubTarget not found'); }

// 4. Add handleSendMessage
const funcTarget = "  const handleForceSync = async () => {";
const funcReplace = `  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) {
        if(!user) showToast('Please login to chat', 'error');
        return;
    }
    try {
      await addDoc(collection(db, 'chatMessages'), {
        text: chatInput.trim(),
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        isAdmin: isAdminAuth,
        createdAt: serverTimestamp()
      });
      setChatInput('');
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Failed to send message', err);
      showToast('Failed to send message', 'error');
    }
  };

  const handleForceSync = async () => {`;
if(code.includes(funcTarget)) { code = code.replace(funcTarget, funcReplace); } else { console.log('funcTarget not found'); }

// 5. Add UI logic
const uiTarget = `          {activeTab === 'admin' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={\`w-full flex flex-col mt-4 flex-1 items-center \${!isAdminAuth ? 'justify-center' : 'justify-start'} min-h-[350px]\`}>`;
const uiReplace = `          {activeTab === 'chat' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col mt-4 flex-1 h-[calc(100vh-200px)]">
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="w-6 h-6 text-[#FF6B00]" />
                <h2 className="text-xl font-black text-white tracking-wide uppercase">Global Chat</h2>
              </div>
              
              <div 
                ref={chatScrollRef}
                className="flex-1 bg-[#151A27]/80 backdrop-blur-md rounded-2xl p-4 border border-gray-800/50 overflow-y-auto mb-4 space-y-4 shadow-inner"
                style={{ scrollbarWidth: 'none' }}
              >
                {chatMessages.length === 0 ? (
                   <p className="text-gray-500 text-xs text-center font-bold mt-10">No messages yet. Say hello!</p>
                ) : (
                  chatMessages.map(msg => {
                    const isMe = user && msg.uid === user.uid;
                    return (
                      <div key={msg.id} className={\`flex w-full \${isMe ? 'justify-end' : 'justify-start'}\`}>
                        <div className={\`flex max-w-[80%] \${isMe ? 'flex-row-reverse' : 'flex-row'}\`}>
                          {/* Avatar */}
                          <div className={\`w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-800 flex items-center justify-center \${isMe ? 'ml-2' : 'mr-2'}\`}>
                            {msg.photoURL ? (
                               <img src={msg.photoURL} alt={msg.displayName} className="w-full h-full object-cover" />
                            ) : (
                               <User className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          
                          {/* Message Bubble */}
                          <div className="flex flex-col">
                            <span className={\`text-[10px] font-bold mb-1 \${isMe ? 'text-right text-gray-400' : (msg.isAdmin ? 'text-[#FF6B00]' : 'text-gray-400')}\`}>
                              {msg.displayName} {msg.isAdmin && '✓'}
                            </span>
                            <div className={\`p-3 rounded-2xl \${isMe ? 'bg-[#FF6B00] text-white rounded-tr-sm' : (msg.isAdmin ? 'bg-gray-800 border border-[#FF6B00]/30 text-white rounded-tl-sm' : 'bg-[#0A0D14] border border-gray-800 text-white rounded-tl-sm')}\`}>
                              <p className="text-sm break-words">{msg.text}</p>
                            </div>
                            <span className={\`text-[8px] text-gray-500 mt-1 font-bold uppercase \${isMe ? 'text-right' : 'text-left'}\`}>
                               {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="relative w-full">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={user ? "Type a message..." : "Login to chat..."}
                  disabled={!user}
                  className="w-full bg-[#0A0D14] border border-gray-700 rounded-full py-3.5 pl-5 pr-14 text-sm text-white focus:border-[#FF6B00] focus:outline-none disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!user || !chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FF6B00] text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={\`w-full flex flex-col mt-4 flex-1 items-center \${!isAdminAuth ? 'justify-center' : 'justify-start'} min-h-[350px]\`}>`;
if(code.includes(uiTarget)) { code = code.replace(uiTarget, uiReplace); } else { console.log('uiTarget not found'); }


// 6. Add nav button
const navTarget = `            <button 
              onClick={() => handleTabChange('youtube')}
              className={\`flex flex-col items-center p-2 transition-colors \${activeTab === 'youtube' ? 'text-[#FF6B00]' : 'text-gray-500 hover:text-gray-300'}\`}
            >
              <Youtube className={\`w-6 h-6 mb-1.5 \${activeTab === 'youtube' ? 'drop-shadow-[0_0_8px_rgba(255,107,0,0.8)]' : ''}\`} />
              <span className="text-[9px] font-bold tracking-widest">YOUTUBE</span>
            </button>
            <button 
              onClick={() => handleTabChange('admin')}`;
const navReplace = `            <button 
              onClick={() => handleTabChange('youtube')}
              className={\`flex flex-col items-center p-2 transition-colors \${activeTab === 'youtube' ? 'text-[#FF6B00]' : 'text-gray-500 hover:text-gray-300'}\`}
            >
              <Youtube className={\`w-6 h-6 mb-1.5 \${activeTab === 'youtube' ? 'drop-shadow-[0_0_8px_rgba(255,107,0,0.8)]' : ''}\`} />
              <span className="text-[9px] font-bold tracking-widest">YOUTUBE</span>
            </button>
            <button 
              onClick={() => handleTabChange('chat')}
              className={\`flex flex-col items-center p-2 transition-colors \${activeTab === 'chat' ? 'text-[#FF6B00]' : 'text-gray-500 hover:text-gray-300'}\`}
            >
              <MessageSquare className={\`w-6 h-6 mb-1.5 \${activeTab === 'chat' ? 'drop-shadow-[0_0_8px_rgba(255,107,0,0.8)]' : ''}\`} />
              <span className="text-[9px] font-bold tracking-widest">CHAT</span>
            </button>
            <button 
              onClick={() => handleTabChange('admin')}`;
if(code.includes(navTarget)) { code = code.replace(navTarget, navReplace); } else { console.log('navTarget not found'); }


fs.writeFileSync('src/App.tsx', code);
console.log("Patched Chat System.");

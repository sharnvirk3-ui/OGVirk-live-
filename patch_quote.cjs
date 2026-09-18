const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add quoteText to initial layout state
code = code.replace(
  "buttons: { x: 0, y: 0, scale: 1 },\n    stats: { x: 0, y: 0, scale: 1 }",
  "buttons: { x: 0, y: 0, scale: 1 },\n    stats: { x: 0, y: 0, scale: 1 },\n    quoteText: { x: 0, y: 0, scale: 1 }"
);

// 2. Add quoteText to onSnapshot sync
code = code.replace(
  "buttons: { ...prev.buttons, ...data.layout.buttons },\n            stats: { ...prev.stats, ...data.layout.stats }",
  "buttons: { ...prev.buttons, ...data.layout.buttons },\n            stats: { ...prev.stats, ...data.layout.stats },\n            quoteText: { ...prev.quoteText, ...data.layout.quoteText }"
);

// 3. Add customQuote to defaults
code = code.replace(
  "youtubeLabel: '',\n          youtubeSubscribers: '0'",
  "youtubeLabel: '',\n          youtubeSubscribers: '0',\n          customQuote: ''"
);

// 4. Add customQuote to handleUpdateHubConfig
code = code.replace(
  "youtubeSubscribers: hubEdit.youtubeSubscribers || '0',",
  "youtubeSubscribers: hubEdit.youtubeSubscribers || '0',\n        customQuote: hubEdit.customQuote || '',"
);

// 5. Add customQuote UI to admin profile settings
const settingsTarget = `                        <input 
                          value={hubEdit.youtubeSubscribers || '0'}
                          onChange={e => setHubEdit({...hubEdit, youtubeSubscribers: e.target.value})}
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                        />
                      </div>
                      
                      <button`;

const settingsReplace = `                        <input 
                          value={hubEdit.youtubeSubscribers || '0'}
                          onChange={e => setHubEdit({...hubEdit, youtubeSubscribers: e.target.value})}
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                        />
                      </div>

                      <div className="mt-3">
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Custom Text / Quote (Shayari)</label>
                        <textarea 
                          value={hubEdit.customQuote || ''} 
                          onChange={e => setHubEdit({...hubEdit, customQuote: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3 resize-none" 
                          rows={3}
                          placeholder="Write your custom text here..."
                        />
                      </div>
                      
                      <button`;
code = code.replace(settingsTarget, settingsReplace);

// 6. Add motion.div to Hub Screen
const renderTarget = `              </motion.div>

              {/* Recent Menu */}`;

const renderReplace = `              </motion.div>

              {hubConfig?.customQuote && (
                <motion.div 
                  drag={!isHubLocked}
                  dragMomentum={false}
                  onDragEnd={(e, info) => {
                    if (!isHubLocked) updateLayout('quoteText', { x: (hubLayout.quoteText?.x || 0) + info.offset.x, y: (hubLayout.quoteText?.y || 0) + info.offset.y });
                  }}
                  animate={{ x: hubLayout.quoteText?.x || 0, y: hubLayout.quoteText?.y || 0, scale: hubLayout.quoteText?.scale || 1 }}
                  className={\`relative z-40 flex flex-col items-center justify-center text-center mt-8 w-full max-w-[320px] \${!isHubLocked ? 'cursor-move p-4 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}\`}
                >
                  <p className="text-[13px] italic font-medium text-gray-300 tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: hubConfig?.fontFamily || 'system-ui, sans-serif' }}>
                    "{hubConfig.customQuote}"
                  </p>
                  {!isHubLocked && (
                    <div 
                      className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startScale = layoutRef.current.quoteText?.scale || 1;
                        
                        const onPointerMove = (me) => {
                          const delta = me.clientX - startX;
                          const newScale = Math.max(0.5, startScale + (delta * 0.01));
                          setHubLayout(prev => ({...prev, quoteText: {...prev.quoteText, scale: newScale}}));
                        };
                        
                        const onPointerUp = () => {
                          window.removeEventListener('pointermove', onPointerMove);
                          window.removeEventListener('pointerup', onPointerUp);
                          updateLayout('quoteText', { scale: layoutRef.current.quoteText?.scale || 1 });
                        };
                        
                        window.addEventListener('pointermove', onPointerMove);
                        window.addEventListener('pointerup', onPointerUp);
                      }}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Recent Menu */}`;
code = code.replace(renderTarget, renderReplace);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched custom quote.");

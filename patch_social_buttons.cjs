const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Imports
code = code.replace(
  "Smartphone } from 'lucide-react';",
  "Smartphone, Instagram } from 'lucide-react';"
);

// 2. hubConfig state
code = code.replace(
  `whatsappNumber: '',`,
  `whatsappNumber: '',
    instagramUrl: '',
    instagramLabel: '',
    youtubeProfileUrl: '',
    youtubeLabel: '',`
);

// 3. handleUpdateHubConfig
const updateTarget = `        whatsappNumber: hubEdit.whatsappNumber || '',`;
const updateReplace = `        whatsappNumber: hubEdit.whatsappNumber || '',
        instagramUrl: hubEdit.instagramUrl || '',
        instagramLabel: hubEdit.instagramLabel || '',
        youtubeProfileUrl: hubEdit.youtubeProfileUrl || '',
        youtubeLabel: hubEdit.youtubeLabel || '',`;
code = code.replace(updateTarget, updateReplace);

// 4. Admin Settings UI
const adminTarget = `                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">WhatsApp</label>
                          <input 
                            value={hubEdit.whatsappNumber || ''} 
                            onChange={e => setHubEdit({...hubEdit, whatsappNumber: e.target.value})} 
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                      </div>`;
const adminReplace = `                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">WhatsApp</label>
                          <input 
                            value={hubEdit.whatsappNumber || ''} 
                            onChange={e => setHubEdit({...hubEdit, whatsappNumber: e.target.value})} 
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Instagram URL</label>
                          <input 
                            value={hubEdit.instagramUrl || ''} 
                            onChange={e => setHubEdit({...hubEdit, instagramUrl: e.target.value})} 
                            placeholder="https://instagram.com/username"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Instagram Label</label>
                          <input 
                            value={hubEdit.instagramLabel || ''} 
                            onChange={e => setHubEdit({...hubEdit, instagramLabel: e.target.value})} 
                            placeholder="@username"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">YouTube Profile URL</label>
                          <input 
                            value={hubEdit.youtubeProfileUrl || ''} 
                            onChange={e => setHubEdit({...hubEdit, youtubeProfileUrl: e.target.value})} 
                            placeholder="https://youtube.com/@channel"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">YouTube Label</label>
                          <input 
                            value={hubEdit.youtubeLabel || ''} 
                            onChange={e => setHubEdit({...hubEdit, youtubeLabel: e.target.value})} 
                            placeholder="Channel Name"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                      </div>`;
code = code.replace(adminTarget, adminReplace);

// 5. Hub Screen UI
const hubTarget = `                <a href={hubConfig?.whatsappNumber ? \`https://wa.me/\${hubConfig.whatsappNumber}\` : '#'} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#151A27] border border-[#25D366]/50 text-[#25D366] font-bold tracking-wide py-3.5 px-4 rounded-xl hover:bg-[#151A27]/80 transition-colors active:scale-[0.98] flex items-center justify-center space-x-2">
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">WhatsApp</span>
                </a>
              </motion.div>`;
const hubReplace = `                <a href={hubConfig?.whatsappNumber ? \`https://wa.me/\${hubConfig.whatsappNumber}\` : '#'} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#151A27] border border-[#25D366]/50 text-[#25D366] font-bold tracking-wide py-3.5 px-4 rounded-xl hover:bg-[#151A27]/80 transition-colors active:scale-[0.98] flex items-center justify-center space-x-2">
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">WhatsApp</span>
                </a>
              </motion.div>

              {(hubConfig?.instagramUrl || hubConfig?.youtubeProfileUrl) && (
                <motion.div 
                  className={\`relative z-40 flex items-center justify-center space-x-4 mt-4 w-full max-w-[280px] \${!isHubLocked ? 'cursor-move p-4 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}\`}
                >
                  {hubConfig?.instagramUrl && (
                    <a href={hubConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white font-bold tracking-wide py-3.5 px-2 rounded-xl shadow-[0_4px_15px_rgba(238,42,123,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center space-x-2">
                      <Instagram className="w-4 h-4 shrink-0" />
                      <span className="text-xs truncate">{hubConfig.instagramLabel || 'Instagram'}</span>
                    </a>
                  )}
                  {hubConfig?.youtubeProfileUrl && (
                    <a href={hubConfig.youtubeProfileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#FF0000] text-white font-bold tracking-wide py-3.5 px-2 rounded-xl shadow-[0_4px_15px_rgba(255,0,0,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center space-x-2">
                      <Youtube className="w-4 h-4 shrink-0" />
                      <span className="text-xs truncate">{hubConfig.youtubeLabel || 'YouTube'}</span>
                    </a>
                  )}
                </motion.div>
              )}`;
code = code.replace(hubTarget, hubReplace);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched social buttons");

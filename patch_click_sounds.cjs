const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. handleTabChange
const tabChangeTarget = `  const handleTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setTabHistory(prev => [...prev, activeTab]);
      setActiveTab(tab);
    }
  };`;

const tabChangeReplace = `  const handleTabChange = (tab: string) => {
    if (hubConfig?.clickSoundType && hubConfig.clickSoundType !== 'none') {
      const audio = new Audio(
        hubConfig.clickSoundType === 'default1' ? 'https://www.soundjay.com/buttons/sounds/button-16.mp3' :
        hubConfig.clickSoundType === 'default2' ? 'https://www.soundjay.com/buttons/sounds/button-29.mp3' :
        hubConfig.clickSoundType === 'default3' ? 'https://www.soundjay.com/buttons/sounds/button-09.mp3' :
        hubConfig.customClickSoundUrl
      );
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed', e));
    }

    if (tab !== activeTab) {
      setTabHistory(prev => [...prev, activeTab]);
      setActiveTab(tab);
    }
  };`;
code = code.replace(tabChangeTarget, tabChangeReplace);

// 2. handleClickSoundUpload
const uploadTarget = `  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {`;
const uploadReplace = `  const handleClickSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert('Audio file is too large! Please upload a small MP3/WAV file smaller than 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setHubEdit({...hubEdit, customClickSoundUrl: reader.result as string, clickSoundType: 'custom'});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {`;
code = code.replace(uploadTarget, uploadReplace);

// 3. handleUpdateHubConfig
const updateTarget = `        fontFamily: hubEdit.fontFamily || 'system-ui, sans-serif',
        systemSoundType: hubEdit.systemSoundType || 'none',
        customSoundUrl: hubEdit.customSoundUrl || ''
      }, { merge: true });`;
const updateReplace = `        fontFamily: hubEdit.fontFamily || 'system-ui, sans-serif',
        systemSoundType: hubEdit.systemSoundType || 'none',
        customSoundUrl: hubEdit.customSoundUrl || '',
        clickSoundType: hubEdit.clickSoundType || 'none',
        customClickSoundUrl: hubEdit.customClickSoundUrl || ''
      }, { merge: true });`;
code = code.replace(updateTarget, updateReplace);


// 4. UI addition
const uiTarget = `                            {hubEdit.customSoundUrl && (
                              <audio controls src={hubEdit.customSoundUrl} className="w-full h-8 mt-2 opacity-50 hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        )}`;
const uiReplace = `                            {hubEdit.customSoundUrl && (
                              <audio controls src={hubEdit.customSoundUrl} className="w-full h-8 mt-2 opacity-50 hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        )}

                        {/* Navigation Click Sounds */}
                        <div className="space-y-2 mt-6 border-t border-gray-800 pt-6">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Navigation Click Sound</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'none'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${(hubEdit.clickSoundType || 'none') === 'none' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Off / None
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'default1'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${hubEdit.clickSoundType === 'default1' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Pop Click
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'default2'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${hubEdit.clickSoundType === 'default2' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Mechanical
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'default3'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${hubEdit.clickSoundType === 'default3' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Sci-Fi Beep
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'custom'})}
                              className={\`col-span-2 py-2 rounded-xl text-xs font-bold border transition-colors \${hubEdit.clickSoundType === 'custom' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Custom Audio
                            </button>
                          </div>
                        </div>

                        {hubEdit.clickSoundType === 'custom' && (
                          <div className="space-y-2 mt-4 p-4 border border-gray-800 rounded-xl bg-black/30">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Upload Custom Click Audio (Max 800KB)</label>
                            <label className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-[#FF6B00] transition-colors group relative">
                              <input type="file" accept="audio/*" onChange={handleClickSoundUpload} className="hidden" />
                              <div className="flex flex-col items-center">
                                <Music className="w-6 h-6 text-gray-500 mb-2 group-hover:text-[#FF6B00] transition-colors" />
                                <span className="text-xs text-gray-500 font-bold group-hover:text-gray-300">
                                  {hubEdit.customClickSoundUrl ? 'Audio Selected - Click to Change' : 'Click to Upload (.mp3, .wav)'}
                                </span>
                              </div>
                            </label>
                            {hubEdit.customClickSoundUrl && (
                              <audio controls src={hubEdit.customClickSoundUrl} className="w-full h-8 mt-2 opacity-50 hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        )}`;
code = code.replace(uiTarget, uiReplace);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched click sounds");

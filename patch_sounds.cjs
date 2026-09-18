const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add Icons
code = code.replace(
  "Trash2, Search, Star, ChevronLeft } from 'lucide-react';",
  "Trash2, Search, Star, ChevronLeft, Volume2, Music } from 'lucide-react';"
);

// 2. Add State
const stateTarget = `  const [isFeedbackReportsOpen, setIsFeedbackReportsOpen] = useState(false);`;
const stateReplace = `  const [isFeedbackReportsOpen, setIsFeedbackReportsOpen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);`;
code = code.replace(stateTarget, stateReplace);

// 3. handleBack logic
const backTarget1 = `if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen)) {`;
const backReplace1 = `if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen)) {`;
code = code.replace(backTarget1, backReplace1);

const backTarget2 = `      setIsBackgroundSettingsOpen(false);
      setIsFeedbackReportsOpen(false);
      return;`;
const backReplace2 = `      setIsBackgroundSettingsOpen(false);
      setIsFeedbackReportsOpen(false);
      setIsSoundSettingsOpen(false);
      return;`;
code = code.replace(backTarget2, backReplace2);

const backTarget3 = `{activeTab !== 'hub' && (tabHistory.length > 0 || (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen))) && (`
const backReplace3 = `{activeTab !== 'hub' && (tabHistory.length > 0 || (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen))) && (`
code = code.replace(backTarget3, backReplace3);

// 4. File Upload Handler
const uploadTarget = `  const handleUpdateHubConfig = async () => {`;
const uploadReplace = `  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert('Audio file is too large! Please upload a small MP3/WAV file smaller than 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setHubEdit({...hubEdit, customSoundUrl: reader.result as string, systemSoundType: 'custom'});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateHubConfig = async () => {`;
code = code.replace(uploadTarget, uploadReplace);

// 5. Update setDoc
const docTarget = `        youtubeApiKey: hubEdit.youtubeApiKey || '',
        fontFamily: hubEdit.fontFamily || 'system-ui, sans-serif'
      }, { merge: true });`;
const docReplace = `        youtubeApiKey: hubEdit.youtubeApiKey || '',
        fontFamily: hubEdit.fontFamily || 'system-ui, sans-serif',
        systemSoundType: hubEdit.systemSoundType || 'none',
        customSoundUrl: hubEdit.customSoundUrl || ''
      }, { merge: true });`;
code = code.replace(docTarget, docReplace);

// 6. Admin Panel UI
const adminUITarget = `                  {/* User Feedback & Reports */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">`;
const adminUIReplace = `                  {/* System Sound Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsSoundSettingsOpen(!isSoundSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <Volume2 className="w-4 h-4 mr-2" />
                        SYSTEM SOUND SETTINGS
                      </span>
                      <Plus className={\`w-4 h-4 transition-transform \${isSoundSettingsOpen ? 'rotate-45' : ''}\`} />
                    </button>
                    
                    {isSoundSettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Background Sound</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'none'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${(hubEdit.systemSoundType || 'none') === 'none' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Off / None
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'default1'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${hubEdit.systemSoundType === 'default1' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Ambient Drone
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'default2'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${hubEdit.systemSoundType === 'default2' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Cyberpunk Pulse
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'custom'})}
                              className={\`py-2 rounded-xl text-xs font-bold border transition-colors \${hubEdit.systemSoundType === 'custom' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}\`}
                            >
                              Custom Audio
                            </button>
                          </div>
                        </div>

                        {hubEdit.systemSoundType === 'custom' && (
                          <div className="space-y-2 mt-4 p-4 border border-gray-800 rounded-xl bg-black/30">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Upload Custom Audio (Max 800KB)</label>
                            <label className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-[#FF6B00] transition-colors group relative">
                              <input type="file" accept="audio/*" onChange={handleSoundUpload} className="hidden" />
                              <div className="flex flex-col items-center">
                                <Music className="w-6 h-6 text-gray-500 mb-2 group-hover:text-[#FF6B00] transition-colors" />
                                <span className="text-xs text-gray-500 font-bold group-hover:text-gray-300">
                                  {hubEdit.customSoundUrl ? 'Audio Selected - Click to Change' : 'Click to Upload (.mp3, .wav)'}
                                </span>
                              </div>
                            </label>
                            {hubEdit.customSoundUrl && (
                              <audio controls src={hubEdit.customSoundUrl} className="w-full h-8 mt-2 opacity-50 hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        )}

                        <button 
                          onClick={handleUpdateHubConfig}
                          className="w-full mt-4 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
                        >
                          Save Sound Settings
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Feedback & Reports */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">`;
code = code.replace(adminUITarget, adminUIReplace);

// 7. Add Audio Element for playback
const audioTarget = `    <div className="relative min-h-[100dvh] bg-[#0A0D14] flex flex-col font-sans selection:bg-orange-500/30 overflow-hidden">`;
const audioReplace = `    <div className="relative min-h-[100dvh] bg-[#0A0D14] flex flex-col font-sans selection:bg-orange-500/30 overflow-hidden">
      {hubConfig?.systemSoundType && hubConfig.systemSoundType !== 'none' && (
        <audio 
          autoPlay 
          loop 
          src={
            hubConfig.systemSoundType === 'default1' ? 'https://www.soundjay.com/misc/sounds/wind-chimes-1.mp3' :
            hubConfig.systemSoundType === 'default2' ? 'https://www.soundjay.com/buttons/sounds/button-30.mp3' :
            hubConfig.customSoundUrl
          } 
          className="hidden" 
        />
      )}`;
code = code.replace(audioTarget, audioReplace);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched sound settings successfully.");

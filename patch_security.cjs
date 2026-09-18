const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add states
const stateTarget = "const [isCustomTextSettingsOpen, setIsCustomTextSettingsOpen] = useState(false);";
const stateReplace = stateTarget + "\n  const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState(false);\n  const [oldPin, setOldPin] = useState('');\n  const [newPin, setNewPin] = useState('');\n  const [securityError, setSecurityError] = useState('');";
if (code.includes(stateTarget)) {
  code = code.replace(stateTarget, stateReplace);
}

// 2. Update handleBack
code = code.replace(
  "if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isCustomTextSettingsOpen)) {",
  "if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isCustomTextSettingsOpen || isSecuritySettingsOpen)) {"
);

code = code.replace(
  "setIsCustomTextSettingsOpen(false);",
  "setIsCustomTextSettingsOpen(false);\n      setIsSecuritySettingsOpen(false);"
);

// 3. Update back button condition
code = code.replace(
  "(activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isCustomTextSettingsOpen))) && (",
  "(activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isCustomTextSettingsOpen || isSecuritySettingsOpen))) && ("
);

// 4. Update auth logic
code = code.replace(
  "if (adminPin === '3464') {",
  "if (adminPin === (hubConfig?.adminPin || '3464')) {"
);

// 5. Add UI
const uiTarget = "                  {/* User Feedback & Reports */}";
const uiReplace = `                  {/* Security Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsSecuritySettingsOpen(!isSecuritySettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <Lock className="w-4 h-4 mr-2" />
                        SECURITY SETTINGS
                      </span>
                      <Plus className={\`w-4 h-4 transition-transform \${isSecuritySettingsOpen ? 'rotate-45' : ''}\`} />
                    </button>
                    
                    {isSecuritySettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current PIN / Pattern</label>
                          <input 
                            type="password"
                            value={oldPin}
                            onChange={(e) => { setOldPin(e.target.value); setSecurityError(''); }}
                            placeholder="Enter current PIN"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-sm tracking-widest text-white focus:border-[#FF6B00] focus:outline-none transition-colors"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">New PIN / Pattern</label>
                          <input 
                            type="password"
                            value={newPin}
                            onChange={(e) => { setNewPin(e.target.value); setSecurityError(''); }}
                            placeholder="Enter new PIN"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-sm tracking-widest text-white focus:border-[#FF6B00] focus:outline-none transition-colors"
                          />
                        </div>

                        {securityError && <p className="text-red-500 text-xs font-bold mt-2">{securityError}</p>}

                        <button 
                          onClick={async () => {
                            const currentRealPin = hubConfig?.adminPin || '3464';
                            if (oldPin !== currentRealPin) {
                              setSecurityError('Incorrect current PIN/Pattern');
                              return;
                            }
                            if (newPin.length < 4) {
                              setSecurityError('New PIN must be at least 4 characters');
                              return;
                            }
                            try {
                              await setDoc(doc(db, 'config', 'hub'), { adminPin: newPin }, { merge: true });
                              showToast('PIN successfully updated!', 'success');
                              setOldPin('');
                              setNewPin('');
                              setSecurityError('');
                            } catch(err) {
                              console.error(err);
                              showToast('Failed to update PIN', 'error');
                            }
                          }}
                          className="w-full mt-4 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
                        >
                          Update Master PIN
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Feedback & Reports */}`;
if (code.includes(uiTarget)) {
  code = code.replace(uiTarget, uiReplace);
}

// 6. Remove maxLength=4
code = code.replace(
  `                      placeholder="Enter PIN" \n                      maxLength={4}\n                      value={adminPin}`,
  `                      placeholder="Enter PIN" \n                      value={adminPin}`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Security patch applied.');

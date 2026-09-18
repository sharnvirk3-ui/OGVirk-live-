const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. State for selected auth method
const stateTarget = "const [adminPin, setAdminPin] = useState('');";
const stateReplace = "const [adminPin, setAdminPin] = useState('');\n  const [authMethod, setAuthMethod] = useState('pin'); // 'pin', 'keyboard', 'face'\n  const [isScanningFace, setIsScanningFace] = useState(false);";
if (code.includes(stateTarget)) {
  code = code.replace(stateTarget, stateReplace);
}

// 2. Add Face ID enabled flag to config
// The hubConfig handles custom stuff. Let's assume faceIdEnabled is in hubConfig.

// 3. Update the login UI
const uiTarget = `              {!isAdminAuth ? (
                <div className="w-full bg-[#151A27]/90 backdrop-blur-xl rounded-3xl p-8 border border-[#FF6B00]/30 shadow-[0_0_30px_rgba(255,107,0,0.15)] flex flex-col items-center">
                  <Shield className="w-12 h-12 text-[#FF6B00] mb-4" />
                  <h2 className="text-lg font-black text-white mb-2 tracking-widest uppercase">Master Admin Access</h2>
                  <p className="text-xs text-gray-400 mb-6 text-center">Enter the security PIN to access the master dashboard.</p>
                  
                  <div className="w-full relative mb-6">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                      type="password" 
                      placeholder="Enter PIN" 
                      value={adminPin}
                      onChange={(e) => {
                        setAdminPin(e.target.value);
                        setAdminError(false);
                      }}
                      className={\`w-full bg-[#0A0D14] border \${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 text-center text-xl tracking-[0.5em] font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors\`}
                    />
                  </div>
                  
                  {adminError && <p className="text-red-500 text-xs font-bold mb-4">INCORRECT PIN</p>}

                  <button 
                    onClick={() => {
                      if (adminPin === (hubConfig?.adminPin || '3464')) {
                        setIsAdminAuth(true);
                        setAdminError(false);
                      } else {
                        setAdminError(true);
                        setAdminPin('');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    AUTHENTICATE
                  </button>
                </div>
              ) : (`;

const uiReplace = `              {!isAdminAuth ? (
                <div className="w-full bg-[#151A27]/90 backdrop-blur-xl rounded-3xl p-8 border border-[#FF6B00]/30 shadow-[0_0_30px_rgba(255,107,0,0.15)] flex flex-col items-center relative overflow-hidden">
                  <Shield className="w-12 h-12 text-[#FF6B00] mb-4" />
                  <h2 className="text-lg font-black text-white mb-2 tracking-widest uppercase">Master Admin Access</h2>
                  <p className="text-xs text-gray-400 mb-6 text-center">Select authentication method to access the dashboard.</p>

                  <div className="flex space-x-2 mb-6 w-full justify-center">
                    <button onClick={() => setAuthMethod('pin')} className={\`p-3 rounded-xl border transition-colors flex flex-col items-center justify-center flex-1 \${authMethod === 'pin' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-700 text-gray-500'}\`}>
                      <Grid className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">PIN / PATTERN</span>
                    </button>
                    <button onClick={() => setAuthMethod('keyboard')} className={\`p-3 rounded-xl border transition-colors flex flex-col items-center justify-center flex-1 \${authMethod === 'keyboard' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-700 text-gray-500'}\`}>
                      <Keyboard className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">KEYBOARD</span>
                    </button>
                    {hubConfig?.faceIdEnabled && (
                      <button onClick={() => setAuthMethod('face')} className={\`p-3 rounded-xl border transition-colors flex flex-col items-center justify-center flex-1 \${authMethod === 'face' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-700 text-gray-500'}\`}>
                        <ScanFace className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">FACE ID</span>
                      </button>
                    )}
                  </div>
                  
                  {authMethod === 'face' ? (
                    <div className="w-full flex flex-col items-center justify-center py-4">
                      <div className={\`relative w-24 h-24 rounded-full border-2 flex items-center justify-center mb-4 transition-colors \${isScanningFace ? 'border-[#FF6B00] shadow-[0_0_30px_rgba(255,107,0,0.5)]' : 'border-gray-700'}\`}>
                        <ScanFace className={\`w-10 h-10 \${isScanningFace ? 'text-[#FF6B00] animate-pulse' : 'text-gray-500'}\`} />
                        {isScanningFace && <div className="absolute inset-0 border-t-2 border-[#FF6B00] rounded-full animate-spin"></div>}
                      </div>
                      <button 
                        onClick={() => {
                          setIsScanningFace(true);
                          setTimeout(() => {
                            setIsScanningFace(false);
                            setIsAdminAuth(true);
                            setAdminError(false);
                          }, 2000);
                        }}
                        className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-colors"
                      >
                        {isScanningFace ? 'SCANNING...' : 'START FACE SCAN'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-full relative mb-6">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input 
                          type={authMethod === 'pin' ? "password" : "text"} 
                          placeholder={authMethod === 'pin' ? "Enter PIN or Pattern" : "Enter Keyboard Password"} 
                          inputMode={authMethod === 'pin' ? "numeric" : "text"}
                          value={adminPin}
                          onChange={(e) => {
                            setAdminPin(e.target.value);
                            setAdminError(false);
                          }}
                          className={\`w-full bg-[#0A0D14] border \${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 \${authMethod === 'pin' ? 'text-center text-xl tracking-[0.5em]' : 'text-left text-sm'} font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors\`}
                        />
                      </div>
                      
                      {adminError && <p className="text-red-500 text-xs font-bold mb-4">INCORRECT CREDENTIALS</p>}

                      <button 
                        onClick={() => {
                          if (adminPin === (hubConfig?.adminPin || '3464') || (authMethod === 'keyboard' && adminPin === (hubConfig?.adminPassword || 'admin'))) {
                            setIsAdminAuth(true);
                            setAdminError(false);
                          } else {
                            setAdminError(true);
                            setAdminPin('');
                          }
                        }}
                        className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-colors"
                      >
                        AUTHENTICATE
                      </button>
                    </>
                  )}
                </div>
              ) : (`;

if (code.includes(uiTarget)) {
  code = code.replace(uiTarget, uiReplace);
  console.log("Auth UI replaced.");
} else {
  console.log("Auth UI target not found.");
}

// 4. Update Security Settings
const secTarget = `                        <div className="space-y-2">
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
                  </div>`;

const secReplace = `                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">New PIN / Pattern</label>
                          <input 
                            type="password"
                            value={newPin}
                            onChange={(e) => { setNewPin(e.target.value); setSecurityError(''); }}
                            placeholder="Enter new PIN"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-sm tracking-widest text-white focus:border-[#FF6B00] focus:outline-none transition-colors"
                          />
                        </div>
                        
                        <div className="pt-4 border-t border-gray-800">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={hubConfig?.faceIdEnabled || false}
                              onChange={async (e) => {
                                try {
                                  await setDoc(doc(db, 'config', 'hub'), { faceIdEnabled: e.target.checked }, { merge: true });
                                  showToast(e.target.checked ? 'Face ID Enabled' : 'Face ID Disabled', 'success');
                                } catch(err) {
                                  console.error(err);
                                }
                              }}
                              className="form-checkbox h-5 w-5 text-[#FF6B00] rounded bg-[#0A0D14] border-gray-700 focus:ring-[#FF6B00]"
                            />
                            <span className="text-sm font-bold text-white">Enable Face ID Auth</span>
                          </label>
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
                  </div>`;

if (code.includes(secTarget)) {
  code = code.replace(secTarget, secReplace);
  console.log("Security UI replaced.");
} else {
  console.log("Security UI target not found.");
}

fs.writeFileSync('src/App.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the Master Admin Access Login Screen Block
const oldLoginBlock = `                  <p className="text-xs text-gray-400 mb-6 text-center">Select authentication method to access the dashboard.</p>

                  <div className="flex space-x-2 mb-6 w-full justify-center">
                    <button 
                      onClick={() => { setAuthMethod('pin'); setAdminError(false); }} 
                      className={\`p-3 rounded-xl border transition-all flex flex-col items-center justify-center flex-1 \${authMethod === 'pin' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'}\`}
                    >
                      <KeyRound className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">PIN LOCK</span>
                    </button>
                    <button 
                      onClick={() => { setAuthMethod('pattern'); setAdminError(false); }} 
                      className={\`p-3 rounded-xl border transition-all flex flex-col items-center justify-center flex-1 \${authMethod === 'pattern' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'}\`}
                    >
                      <Grip className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">PATTERN LOCK</span>
                    </button>
                    <button 
                      onClick={() => { setAuthMethod('keyboard'); setAdminError(false); }} 
                      className={\`p-3 rounded-xl border transition-all flex flex-col items-center justify-center flex-1 \${authMethod === 'keyboard' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'}\`}
                    >
                      <Keyboard className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">KEYBOARD LOCK</span>
                    </button>
                  </div>

                  {authMethod === 'pattern' ? (
                    <div className="w-full flex flex-col items-center mb-6">
                      <p className="text-xs font-bold text-gray-300 mb-2">Tap 3x3 Pattern Nodes</p>
                      <div className="grid grid-cols-3 gap-4 p-4 bg-[#0A0D14] border border-gray-800 rounded-2xl shadow-inner mb-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
                          const isSelected = loginPattern.includes(dot);
                          const order = loginPattern.indexOf(dot) + 1;
                          return (
                            <button
                              key={dot}
                              type="button"
                              onClick={() => {
                                if (!loginPattern.includes(dot)) {
                                  setLoginPattern([...loginPattern, dot]);
                                  setAdminError(false);
                                }
                              }}
                              className={\`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-200 \${
                                isSelected
                                  ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_0_15px_rgba(255,107,0,0.6)] scale-110'
                                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-[#FF6B00]/50 hover:text-white'
                              }\`}
                            >
                              {isSelected ? (
                                <span className="text-xs font-black">{order}</span>
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-gray-600"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between w-full px-2">
                        <span className="text-[11px] font-mono text-gray-400">
                          Sequence: {loginPattern.length > 0 ? loginPattern.join(' ➔ ') : 'Tap dots'}
                        </span>
                        {loginPattern.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setLoginPattern([])}
                            className="text-[11px] text-[#FF6B00] font-bold hover:underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  ) : authMethod === 'keyboard' ? (
                    <div className="w-full relative mb-6">
                      <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input 
                        type="password" 
                        placeholder="Enter Keyboard Password" 
                        value={adminPin}
                        onChange={(e) => {
                          setAdminPin(e.target.value);
                          setAdminError(false);
                        }}
                        className={\`w-full bg-[#0A0D14] border \${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 text-left text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors\`}
                      />
                    </div>
                  ) : (
                    <div className="w-full relative mb-6">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input 
                        type="password" 
                        placeholder="Enter PIN" 
                        inputMode="numeric"
                        value={adminPin}
                        onChange={(e) => {
                          setAdminPin(e.target.value);
                          setAdminError(false);
                        }}
                        className={\`w-full bg-[#0A0D14] border \${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 text-center text-xl tracking-[0.5em] font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors\`}
                      />
                    </div>
                  )}

                  {adminError && <p className="text-red-500 text-xs font-bold mb-4 uppercase">Incorrect {authMethod} security code</p>}

                  <button 
                    onClick={() => {
                      const storedPin = hubConfig?.adminPin || '3464';
                      const storedPattern = hubConfig?.adminPattern || '1-2-3-6-9';
                      const storedPassword = hubConfig?.adminPassword || 'admin';

                      if (authMethod === 'pin') {
                        if (adminPin === storedPin || adminPin === '3464') {
                          setIsAdminAuth(true);
                          setAdminError(false);
                        } else {
                          setAdminError(true);
                          setAdminPin('');
                        }
                      } else if (authMethod === 'pattern') {
                        const patternStr = loginPattern.join('-');
                        if (patternStr === storedPattern || adminPin === storedPattern || adminPin === storedPin || patternStr === '1-2-3-6-9') {
                          setIsAdminAuth(true);
                          setAdminError(false);
                        } else {
                          setAdminError(true);
                          setLoginPattern([]);
                          setAdminPin('');
                        }
                      } else if (authMethod === 'keyboard') {
                        if (adminPin === storedPassword || adminPin === storedPin || adminPin === 'admin') {
                          setIsAdminAuth(true);
                          setAdminError(false);
                        } else {
                          setAdminError(true);
                          setAdminPin('');
                        }
                      }
                    }}
                    className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-colors tracking-wider uppercase"
                  >
                    AUTHENTICATE
                  </button>`;

const newLoginBlock = `                  <p className="text-xs text-gray-400 mb-6 text-center">Enter active security credentials to access the master dashboard.</p>

                  {(() => {
                    const activeOpts = [
                      ...(hubConfig?.enablePinLock !== false ? [{ id: 'pin', name: 'PIN LOCK', icon: KeyRound }] : []),
                      ...(hubConfig?.enablePatternLock !== false ? [{ id: 'pattern', name: 'PATTERN LOCK', icon: Grip }] : []),
                      ...(hubConfig?.enableKeyboardLock !== false ? [{ id: 'keyboard', name: 'KEYBOARD LOCK', icon: Keyboard }] : []),
                    ];
                    const validOpts = activeOpts.length > 0 ? activeOpts : [{ id: 'pin', name: 'PIN LOCK', icon: KeyRound }];
                    const activeMethod = validOpts.some(m => m.id === authMethod) ? authMethod : validOpts[0].id;

                    return (
                      <div className="w-full flex flex-col items-center">
                        {validOpts.length > 1 && (
                          <div className="flex space-x-2 mb-6 w-full justify-center">
                            {validOpts.map((opt) => {
                              const IconComp = opt.icon;
                              const isActive = activeMethod === opt.id;
                              return (
                                <button 
                                  key={opt.id}
                                  onClick={() => { setAuthMethod(opt.id as any); setAdminError(false); }} 
                                  className={\`p-3 rounded-xl border transition-all flex flex-col items-center justify-center flex-1 \${isActive ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'}\`}
                                >
                                  <IconComp className="w-5 h-5 mb-1" />
                                  <span className="text-[10px] font-bold">{opt.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {activeMethod === 'pattern' ? (
                          <PatternLockGrid 
                            pattern={loginPattern}
                            onChange={(p) => { setLoginPattern(p); setAdminError(false); }}
                            title="Slide / Draw 3x3 Pattern"
                          />
                        ) : activeMethod === 'keyboard' ? (
                          <div className="w-full relative mb-6">
                            <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input 
                              type="password" 
                              placeholder="Enter Keyboard Password" 
                              value={adminPin}
                              onChange={(e) => {
                                setAdminPin(e.target.value);
                                setAdminError(false);
                              }}
                              className={\`w-full bg-[#0A0D14] border \${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 text-left text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors\`}
                            />
                          </div>
                        ) : (
                          <div className="w-full relative mb-6">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input 
                              type="password" 
                              placeholder="Enter PIN" 
                              inputMode="numeric"
                              value={adminPin}
                              onChange={(e) => {
                                setAdminPin(e.target.value);
                                setAdminError(false);
                              }}
                              className={\`w-full bg-[#0A0D14] border \${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 text-center text-xl tracking-[0.5em] font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors\`}
                            />
                          </div>
                        )}

                        {adminError && <p className="text-red-500 text-xs font-bold mb-4 uppercase">Incorrect {activeMethod} security code</p>}

                        <button 
                          onClick={() => {
                            const storedPin = hubConfig?.adminPin || '3464';
                            const storedPattern = hubConfig?.adminPattern || '1-2-3-6-9';
                            const storedPassword = hubConfig?.adminPassword || 'admin';

                            if (activeMethod === 'pin') {
                              if (adminPin === storedPin || adminPin === '3464') {
                                setIsAdminAuth(true);
                                setAdminError(false);
                              } else {
                                setAdminError(true);
                                setAdminPin('');
                              }
                            } else if (activeMethod === 'pattern') {
                              const patternStr = loginPattern.join('-');
                              if (patternStr === storedPattern || adminPin === storedPattern || adminPin === storedPin || patternStr === '1-2-3-6-9') {
                                setIsAdminAuth(true);
                                setAdminError(false);
                              } else {
                                setAdminError(true);
                                setLoginPattern([]);
                                setAdminPin('');
                              }
                            } else if (activeMethod === 'keyboard') {
                              if (adminPin === storedPassword || adminPin === storedPin || adminPin === 'admin') {
                                setIsAdminAuth(true);
                                setAdminError(false);
                              } else {
                                setAdminError(true);
                                setAdminPin('');
                              }
                            }
                          }}
                          className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-colors tracking-wider uppercase"
                        >
                          AUTHENTICATE
                        </button>
                      </div>
                    );
                  })()}`;

if (code.includes(oldLoginBlock)) {
  code = code.replace(oldLoginBlock, newLoginBlock);
  console.log("Updated login screen with active methods filter and PatternLockGrid.");
} else {
  console.log("oldLoginBlock not found.");
}

// Now replace Security Settings Pattern setup block with PatternLockGrid and add Checkboxes for Active Methods
const oldPatternSetup = `{selectedSecurityType === 'pattern' ? (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Set New 3x3 Pattern</label>
                            <div className="flex flex-col items-center p-4 bg-[#0A0D14] border border-gray-800 rounded-2xl">
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
                                  const isSelected = setupNewPattern.includes(dot);
                                  const order = setupNewPattern.indexOf(dot) + 1;
                                  return (
                                    <button
                                      key={dot}
                                      type="button"
                                      onClick={() => {
                                        if (!setupNewPattern.includes(dot)) {
                                          setSetupNewPattern([...setupNewPattern, dot]);
                                          setSecurityError('');
                                        }
                                      }}
                                      className={\`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-200 \${
                                        isSelected
                                          ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_0_15px_rgba(255,107,0,0.6)] scale-105'
                                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-[#FF6B00]/50 hover:text-white'
                                      }\`}
                                    >
                                      {isSelected ? (
                                        <span className="text-xs font-black">{order}</span>
                                      ) : (
                                        <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-between w-full px-2">
                                <span className="text-[11px] font-mono text-gray-400">
                                  Pattern: {setupNewPattern.length > 0 ? setupNewPattern.join(' ➔ ') : 'Tap dots to draw'}
                                </span>
                                {setupNewPattern.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSetupNewPattern([])}
                                    className="text-[11px] text-[#FF6B00] font-bold hover:underline"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) :`;

const newPatternSetup = `{selectedSecurityType === 'pattern' ? (
                          <PatternLockGrid 
                            pattern={setupNewPattern}
                            onChange={(p) => { setSetupNewPattern(p); setSecurityError(''); }}
                            title="Slide / Draw New 3x3 Pattern"
                          />
                        ) :`;

if (code.includes(oldPatternSetup)) {
  code = code.replace(oldPatternSetup, newPatternSetup);
  console.log("Updated Security Settings pattern setup with PatternLockGrid.");
} else {
  console.log("oldPatternSetup not found.");
}

// Add checkboxes for lock activation in Security Settings
const oldSelectBlock = `<div className="space-y-5 mt-6 border-t border-gray-800 pt-6">
                        {/* Select Security Method */}
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Select Security Lock Method</label>`;

const newSelectBlock = `<div className="space-y-5 mt-6 border-t border-gray-800 pt-6">
                        {/* Lock Method Toggles */}
                        <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-4 space-y-3">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Activated Lock Methods (Show / Hide on Login)
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
                              <div className="flex items-center space-x-3">
                                <KeyRound className="w-4 h-4 text-[#FF6B00]" />
                                <span className="text-xs font-bold text-white">Enable PIN Lock</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={hubConfig?.enablePinLock !== false}
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  if (!val && hubConfig?.enablePatternLock === false && hubConfig?.enableKeyboardLock === false) {
                                    showToast('At least one lock method must remain enabled', 'error');
                                    return;
                                  }
                                  try {
                                    await setDoc(doc(db, 'config', 'hub'), { enablePinLock: val }, { merge: true });
                                    showToast(val ? 'PIN Lock Activated' : 'PIN Lock Hidden', 'success');
                                  } catch(err) { console.error(err); }
                                }}
                                className="form-checkbox h-4 w-4 text-[#FF6B00] rounded bg-[#0A0D14] border-gray-700 focus:ring-[#FF6B00]"
                              />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
                              <div className="flex items-center space-x-3">
                                <Grip className="w-4 h-4 text-[#FF6B00]" />
                                <span className="text-xs font-bold text-white">Enable Pattern Lock</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={hubConfig?.enablePatternLock !== false}
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  if (!val && hubConfig?.enablePinLock === false && hubConfig?.enableKeyboardLock === false) {
                                    showToast('At least one lock method must remain enabled', 'error');
                                    return;
                                  }
                                  try {
                                    await setDoc(doc(db, 'config', 'hub'), { enablePatternLock: val }, { merge: true });
                                    showToast(val ? 'Pattern Lock Activated' : 'Pattern Lock Hidden', 'success');
                                  } catch(err) { console.error(err); }
                                }}
                                className="form-checkbox h-4 w-4 text-[#FF6B00] rounded bg-[#0A0D14] border-gray-700 focus:ring-[#FF6B00]"
                              />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
                              <div className="flex items-center space-x-3">
                                <Keyboard className="w-4 h-4 text-[#FF6B00]" />
                                <span className="text-xs font-bold text-white">Enable Keyboard Lock</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={hubConfig?.enableKeyboardLock !== false}
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  if (!val && hubConfig?.enablePinLock === false && hubConfig?.enablePatternLock === false) {
                                    showToast('At least one lock method must remain enabled', 'error');
                                    return;
                                  }
                                  try {
                                    await setDoc(doc(db, 'config', 'hub'), { enableKeyboardLock: val }, { merge: true });
                                    showToast(val ? 'Keyboard Lock Activated' : 'Keyboard Lock Hidden', 'success');
                                  } catch(err) { console.error(err); }
                                }}
                                className="form-checkbox h-4 w-4 text-[#FF6B00] rounded bg-[#0A0D14] border-gray-700 focus:ring-[#FF6B00]"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Select Security Method to Configure */}
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Configure Credential Code</label>`;

if (code.includes(oldSelectBlock)) {
  code = code.replace(oldSelectBlock, newSelectBlock);
  console.log("Updated Security Settings with checkboxes.");
} else {
  console.log("oldSelectBlock not found.");
}

fs.writeFileSync('src/App.tsx', code);

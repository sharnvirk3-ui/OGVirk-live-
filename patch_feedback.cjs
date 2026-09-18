const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add handleDeleteFeedback
const importTarget = "import { deleteDoc, doc"
if(!code.includes('deleteDoc')) {
   code = code.replace("setDoc, onSnapshot } from 'firebase/firestore';", "setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';");
}

const funcTarget = `  const handleUpdateHubConfig = async () => {`;
const funcReplace = `  const handleDeleteFeedback = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await deleteDoc(doc(db, 'ratings', id));
      } catch (err) {
        console.error('Failed to delete feedback', err);
      }
    }
  };

  const handleUpdateHubConfig = async () => {`;
code = code.replace(funcTarget, funcReplace);

// 2. Modify UI
const uiTarget = `                                <span className="text-[9px] text-gray-500 font-bold uppercase">{new Date(rating.createdAt).toLocaleDateString()}</span>
                              </div>
                              {rating.feedback ? (
                                <p className="text-xs text-gray-300 italic">"\${rating.feedback}"</p>
                              ) : (
                                <p className="text-[10px] text-gray-600 font-bold uppercase">No text provided</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>`;
const uiReplace = `                                <div className="flex items-center space-x-2">
                                  <span className="text-[9px] text-gray-500 font-bold uppercase">{new Date(rating.createdAt).toLocaleDateString()}</span>
                                  <button onClick={() => handleDeleteFeedback(rating.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-500/10">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {rating.feedback ? (
                                <p className="text-xs text-gray-300 italic">"\${rating.feedback}"</p>
                              ) : (
                                <p className="text-[10px] text-gray-600 font-bold uppercase">No text provided</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>`;

code = code.replace(uiTarget, uiReplace);

// 3. Fix Scrolling (remove max-h-80 overflow-y-auto pr-2)
const scrollTarget = `<div className="space-y-4 mt-6 border-t border-gray-800 pt-6 max-h-80 overflow-y-auto pr-2">`;
const scrollReplace = `<div className="space-y-4 mt-6 border-t border-gray-800 pt-6">`;
code = code.replace(scrollTarget, scrollReplace);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched feedback section");

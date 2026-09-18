const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add state variable
code = code.replace(
  "const [newErrorDesc, setNewErrorDesc] = useState('');",
  "const [newErrorDesc, setNewErrorDesc] = useState('');\n  const [newErrorImageUrl, setNewErrorImageUrl] = useState('');"
);

// 2. Update handleSubmitError
code = code.replace(
  "        description: newErrorDesc,",
  "        description: newErrorDesc,\n        imageUrl: newErrorImageUrl,"
);

code = code.replace(
  "      setNewErrorDesc('');",
  "      setNewErrorDesc('');\n      setNewErrorImageUrl('');"
);

// 3. Update UI
const oldUi = `<textarea value={newErrorDesc} onChange={e => setNewErrorDesc(e.target.value)} placeholder="Describe the issue or paste log..." rows={3} className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-red-500 focus:outline-none resize-none mb-3"></textarea>`;
const newUi = `<textarea value={newErrorDesc} onChange={e => setNewErrorDesc(e.target.value)} placeholder="Describe the issue or paste log..." rows={3} className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-red-500 focus:outline-none resize-none mb-3"></textarea>
                
                <div className="mb-3 relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    id="error-image-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const MAX_SIZE = 800;
                            if (width > height) {
                              if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                              }
                            } else {
                              if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                              }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            setNewErrorImageUrl(canvas.toDataURL('image/webp', 0.8));
                          };
                          img.src = reader.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label 
                    htmlFor="error-image-upload"
                    className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-400 flex items-center justify-between cursor-pointer hover:border-red-500 transition-colors"
                  >
                    <span className="truncate">{newErrorImageUrl ? 'Image Attached' : 'Attach Screenshot (Optional)'}</span>
                    <Plus className="w-4 h-4" />
                  </label>
                  {newErrorImageUrl && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-gray-700 h-32 bg-[#0A0D14]">
                      <img src={newErrorImageUrl} alt="Error preview" className="w-full h-full object-contain" />
                      <button 
                        onClick={() => setNewErrorImageUrl('')} 
                        className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full text-white hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>`;

code = code.replace(oldUi, newUi);

// 4. Update the error logs list to show the image
const oldLog = `<p className="text-xs text-gray-500 mt-1">{log.description}</p>`;
const newLog = `<p className="text-xs text-gray-500 mt-1">{log.description}</p>
                    {log.imageUrl && (
                      <div className="mt-2 border border-gray-800 rounded-lg overflow-hidden max-h-32 bg-black">
                        <img src={log.imageUrl} alt="Error screenshot" className="w-full h-full object-contain" />
                      </div>
                    )}`;

code = code.replace(oldLog, newLog);

fs.writeFileSync('src/App.tsx', code);

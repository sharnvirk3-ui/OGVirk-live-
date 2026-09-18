const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add upload handlers before handleUpdateHubConfig
const handlerAnchor = "  const handleUpdateHubConfig = async () => {";
const newHandlers = `  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.6);
          setHubEdit({...hubEdit, backgroundUrl: compressedDataUrl});
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert('Video file is too large! Please upload an MP4 video smaller than 800KB to fit within the database limits.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setHubEdit({...hubEdit, backgroundUrl: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateHubConfig = async () => {`;
code = code.replace(handlerAnchor, newHandlers);

// 2. Replace URL input with file inputs
const uiAnchor = `                        {(hubEdit.backgroundType === 'image' || hubEdit.backgroundType === 'video') && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Media URL (MP4 / PNG / JPG / WEBP)</label>
                            <input 
                              value={hubEdit.backgroundUrl || ''} 
                              onChange={e => setHubEdit({...hubEdit, backgroundUrl: e.target.value})} 
                              className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3" 
                              placeholder="https://example.com/background.mp4"
                            />
                            <p className="text-[10px] text-gray-500">Provide a direct link to the image or video file.</p>
                          </div>
                        )}`;

const newUi = `                        {hubEdit.backgroundType === 'image' && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Upload Background Image</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleBackgroundImageUpload} 
                              className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-2" 
                            />
                            {hubEdit.backgroundUrl && <img src={hubEdit.backgroundUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-gray-800 mb-2" />}
                            <p className="text-[10px] text-gray-500">Supported formats: JPG, PNG, WEBP.</p>
                          </div>
                        )}
                        {hubEdit.backgroundType === 'video' && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Upload Background Video (MP4)</label>
                            <input 
                              type="file" 
                              accept="video/mp4"
                              onChange={handleBackgroundVideoUpload} 
                              className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-2" 
                            />
                            {hubEdit.backgroundUrl && (
                              <video src={hubEdit.backgroundUrl} autoPlay loop muted playsInline className="w-full h-24 object-cover rounded-lg border border-gray-800 mb-2" />
                            )}
                            <p className="text-[10px] text-red-400 font-bold">Max size: 800KB. For best results, use short compressed videos.</p>
                          </div>
                        )}`;

code = code.replace(uiAnchor, newUi);
fs.writeFileSync('src/App.tsx', code);

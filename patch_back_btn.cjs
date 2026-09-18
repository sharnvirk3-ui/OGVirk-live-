const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Update imports
code = code.replace(
  "Trash2, Search, Star } from 'lucide-react';",
  "Trash2, Search, Star, ChevronLeft } from 'lucide-react';"
);

// 2. Add tabHistory state and handleTabChange, handleBack
const stateAnchor = "const [activeTab, setActiveTab] = useState('hub');";
const newStates = `const [activeTab, setActiveTab] = useState('hub');
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  const handleTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setTabHistory(prev => [...prev, activeTab]);
      setActiveTab(tab);
    }
  };

  const handleBack = () => {
    if (tabHistory.length > 0) {
      const newHistory = [...tabHistory];
      const prevTab = newHistory.pop();
      setTabHistory(newHistory);
      if (prevTab) setActiveTab(prevTab);
    } else {
      setActiveTab('hub'); // Fallback
    }
  };`;

code = code.replace(stateAnchor, newStates);

// 3. Replace setActiveTab with handleTabChange in UI
code = code.replace(/setActiveTab\('profile'\)/g, "handleTabChange('profile')");
code = code.replace(/setActiveTab\('admin'\)/g, "handleTabChange('admin')");
code = code.replace(/setActiveTab\('hub'\)/g, "handleTabChange('hub')");
code = code.replace(/setActiveTab\('game'\)/g, "handleTabChange('game')");
code = code.replace(/setActiveTab\('errors'\)/g, "handleTabChange('errors')");
code = code.replace(/setActiveTab\('youtube'\)/g, "handleTabChange('youtube')");

// Wait, the Lock Access button uses setActiveTab(false) - No it's setIsAdminAuth.
// Let's check for any remaining setActiveTab in JSX
// Now, let's update the header to include the Back button.
const headerOld = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">`;
const headerNew = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">
          {tabHistory.length > 0 && (
            <button 
              onClick={handleBack}
              className="mr-3 w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </button>
          )}`;
code = code.replace(headerOld, headerNew);

fs.writeFileSync('src/App.tsx', code);

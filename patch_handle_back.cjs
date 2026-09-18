const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldHandleBack = `  const handleBack = () => {
    if (tabHistory.length > 0) {
      const newHistory = [...tabHistory];
      const prevTab = newHistory.pop();
      setTabHistory(newHistory);
      if (prevTab) setActiveTab(prevTab);
    } else {
      setActiveTab('hub'); // Fallback
    }
  };`;

const newHandleBack = `  const handleBack = () => {
    if (activeTab === 'admin' && isProfileSettingsOpen) {
      setIsProfileSettingsOpen(false);
      return;
    }
    
    if (tabHistory.length > 0) {
      const newHistory = [...tabHistory];
      const prevTab = newHistory.pop();
      setTabHistory(newHistory);
      if (prevTab) setActiveTab(prevTab);
    } else {
      setActiveTab('hub'); // Fallback
    }
  };`;

code = code.replace(oldHandleBack, newHandleBack);

const oldHeaderCond = `{tabHistory.length > 0 && (
              <button 
                onClick={handleBack}`;
const newHeaderCond = `{(tabHistory.length > 0 || (activeTab === 'admin' && isProfileSettingsOpen)) && (
              <button 
                onClick={handleBack}`;

code = code.replace(oldHeaderCond, newHeaderCond);

fs.writeFileSync('src/App.tsx', code);

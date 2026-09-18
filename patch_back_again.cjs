const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const stateAnchor = `const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);`;
const stateReplace = `const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);`;
code = code.replace(stateAnchor, stateReplace);

const handleBackAnchor = `  const handleBack = () => {
    if (activeTab === 'admin' && isProfileSettingsOpen) {
      setIsProfileSettingsOpen(false);
      return;
    }`;
const handleBackReplace = `  const handleBack = () => {
    if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen)) {
      setIsProfileSettingsOpen(false);
      setIsBackgroundSettingsOpen(false);
      return;
    }`;
code = code.replace(handleBackAnchor, handleBackReplace);

const headerCondAnchor = `{(tabHistory.length > 0 || (activeTab === 'admin' && isProfileSettingsOpen)) && (`;
const headerCondReplace = `{(tabHistory.length > 0 || (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen))) && (`;
code = code.replace(headerCondAnchor, headerCondReplace);

fs.writeFileSync('src/App.tsx', code);

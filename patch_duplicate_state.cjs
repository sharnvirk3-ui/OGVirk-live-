const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const [isFeedbackReportsOpen, setIsFeedbackReportsOpen] = useState(false);
  const [isFeedbackReportsOpen, setIsFeedbackReportsOpen] = useState(false);`;

const replace = `const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const [isFeedbackReportsOpen, setIsFeedbackReportsOpen] = useState(false);`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);

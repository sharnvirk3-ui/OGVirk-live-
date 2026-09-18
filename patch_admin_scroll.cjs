const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const anchor = `{activeTab === 'admin' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col mt-4 flex-1 items-center justify-center min-h-[350px]">
              {!isAdminAuth ? (`;

const replace = `{activeTab === 'admin' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={\`w-full flex flex-col mt-4 flex-1 items-center \${!isAdminAuth ? 'justify-center' : 'justify-start'} min-h-[350px]\`}>
              {!isAdminAuth ? (`;

code = code.replace(anchor, replace);
fs.writeFileSync('src/App.tsx', code);

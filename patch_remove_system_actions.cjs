const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `                  <div className="bg-[#151A27]/80 rounded-2xl p-5 border border-gray-800 mb-4">
                    <h3 className="text-sm font-bold text-white mb-4">System Actions</h3>
                    <button onClick={handlePurgeErrors} className="w-full bg-red-600/20 text-red-500 border border-red-600/50 font-bold py-3.5 rounded-xl hover:bg-red-600/40 transition-colors mb-3">
                      Purge Error Logs
                    </button>
                    <button className="w-full bg-gray-800 border border-gray-700 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-colors">
                      Manage App Users
                    </button>
                  </div>`;

if (code.includes(target)) {
  code = code.replace(target, '');
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully removed System Actions.");
} else {
  console.log("Could not find the target string.");
}

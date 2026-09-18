const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf-8');
rules = rules.replace(
  "    match /presence/{userId} {\n      allow read: if isSignedIn();",
  "    match /presence/{userId} {\n      allow read: if true;"
);
fs.writeFileSync('firestore.rules', rules);
console.log('Rules patched.');

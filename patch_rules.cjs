const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf-8');

const target = `    match /presence/{userId} {`;
const replace = `    match /chatMessages/{messageId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }
    
    match /presence/{userId} {`;

if (rules.includes(target)) {
  rules = rules.replace(target, replace);
  fs.writeFileSync('firestore.rules', rules);
  console.log('Rules updated successfully.');
} else {
  console.log('Target not found in firestore.rules');
}

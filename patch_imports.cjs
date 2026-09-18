const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "Trash2, Search } from 'lucide-react';",
  "Trash2, Search, Star } from 'lucide-react';"
);

// Insert rating states near games state
code = code.replace(
  "const [games, setGames] = useState<any[]>([]);",
  "const [games, setGames] = useState<any[]>([]);\n  const [ratings, setRatings] = useState<any[]>([]);\n  const [showFeedbackModal, setShowFeedbackModal] = useState(false);\n  const [feedbackStars, setFeedbackStars] = useState(0);\n  const [feedbackText, setFeedbackText] = useState('');\n  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);"
);

fs.writeFileSync('src/App.tsx', code);

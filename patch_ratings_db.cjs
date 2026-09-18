const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "const videosUnsub = onSnapshot(query(collection(db, 'youtubeVideos')",
  "const ratingsUnsub = onSnapshot(query(collection(db, 'ratings'), orderBy('createdAt', 'desc')), (snap) => {\n      setRatings(snap.docs.map(d => ({ id: d.id, ...d.data() })));\n    });\n\n    const videosUnsub = onSnapshot(query(collection(db, 'youtubeVideos')"
);

code = code.replace(
  "return () => {",
  "return () => {\n      ratingsUnsub();"
);

const submitLogic = `  const handleSubmitFeedback = async () => {
    if (feedbackStars === 0) return;
    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'ratings'), {
        stars: feedbackStars,
        feedback: feedbackText,
        createdAt: serverTimestamp()
      });
      setShowFeedbackModal(false);
      setFeedbackStars(0);
      setFeedbackText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const calculateAverageRating = () => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, curr) => acc + (curr.stars || 0), 0);
    return (sum / ratings.length).toFixed(1);
  };

  const handleSignOut`;

code = code.replace("const handleSignOut", submitLogic);
fs.writeFileSync('src/App.tsx', code);

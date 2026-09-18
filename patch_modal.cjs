const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const navEndAnchor = `</nav>`;
const modalContent = `</nav>

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#151A27] border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-[#FF6B00] fill-current" />
                </div>
                <h3 className="text-xl font-black text-white text-center">Rate Your Experience</h3>
                <p className="text-xs text-gray-400 text-center mt-2">How would you rate your time here? Let us know!</p>
              </div>

              <div className="flex justify-center space-x-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setFeedbackStars(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={\`w-10 h-10 \${star <= feedbackStars ? 'text-[#FF6B00] fill-current drop-shadow-[0_0_10px_rgba(255,107,0,0.5)]' : 'text-gray-700'}\`} />
                  </button>
                ))}
              </div>

              <textarea 
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts (optional)..."
                className="w-full bg-[#0A0D14] border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none resize-none mb-6 h-24"
              ></textarea>

              <button 
                onClick={handleSubmitFeedback}
                disabled={feedbackStars === 0 || isSubmittingFeedback}
                className="w-full bg-[#FF6B00] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
              >
                {isSubmittingFeedback ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'SUBMIT FEEDBACK'
                )}
              </button>
            </motion.div>
          </div>
        )}`;

code = code.replace(navEndAnchor, modalContent);
fs.writeFileSync('src/App.tsx', code);

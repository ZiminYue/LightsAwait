const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use(express.static('public'));

// Load keyword dictionaries
const getReactionKeywords = () => {
  return JSON.parse(fs.readFileSync('./server/data/reaction_keywords.json'));
};
const triggerWordsPath = './server/data/trigger_words.json';
const customCodesPath = './server/data/custom_codes.json';

// Match keywords and classify them
function getResponseForInput(input) {
  input = input.toLowerCase();
  const reactionKeywords = getReactionKeywords(); 

  for (const category in reactionKeywords) {
    const keywords = reactionKeywords[category];
    for (const keyword in keywords) {
      if (input.includes(keyword.toLowerCase())) {
        return {
          category,
          response: keywords[keyword]
        };
      }
    }
  }

  return null;
}



// Route: Fetch all keyword dictionaries (for backend display)
app.get('/api/words', (req, res) => {
  const triggers = JSON.parse(fs.readFileSync(triggerWordsPath));
  const custom = JSON.parse(fs.readFileSync(customCodesPath));
  res.json({
    triggers,
    custom,
    reactions: reactionKeywords
  });
});

// Route: Add custom secret codes (submitted by frontend users)
app.post('/api/custom-codes', (req, res) => {
  const { phrase } = req.body;
  if (!phrase) return res.status(400).json({ error: 'Missing phrase' });

  const currentData = JSON.parse(fs.readFileSync(customCodesPath));
  currentData.custom_codes.push(phrase);
  fs.writeFileSync(customCodesPath, JSON.stringify(currentData, null, 2));

  res.json({ success: true, added: phrase });
});

// Route: Chat message handler, simulates AI response
app.post('/chat', (req, res) => {
  const userInput = req.body.message;
  const result = getResponseForInput(userInput);

  if (result) {
    res.json({ reply: result.response, category: result.category });
  } else {
    res.json({ reply: "Thanks for sharing. I'm glad to help you!", category: "neutral" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

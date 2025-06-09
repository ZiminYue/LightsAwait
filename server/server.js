const flaggedPath = './server/data/flagged.json';
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

// Save flagged messages
function saveFlaggedMessage(message) {
  const current = JSON.parse(fs.readFileSync(flaggedPath));
  current.messages.unshift(message);
  if (current.messages.length > 50) current.messages = current.messages.slice(0, 50);
  fs.writeFileSync(flaggedPath, JSON.stringify(current, null, 2));
}

// Route: Fetch all keyword dictionaries (for backend display)
app.get('/api/words', (req, res) => {
  const triggers = JSON.parse(fs.readFileSync(triggerWordsPath));
  const custom = JSON.parse(fs.readFileSync(customCodesPath));
  const reactions = getReactionKeywords();
  res.json({
    triggers,
    custom,
    reactions
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
  const userInput = req.body.message.toLowerCase();

  // 1. Priortize trigger_words.json
  const triggerData = JSON.parse(fs.readFileSync(triggerWordsPath));
  const triggers = triggerData.triggers || [];

  const matchedTrigger = triggers.find(trigger => userInput.includes(trigger.toLowerCase()));
  if (matchedTrigger) {
    return res.json({
      reply: {
        reply: triggerData.reply,
        gif: triggerData.gif
      },
      category: "triggered"
    });
  }

  // 2. Else check reaction_keywords.json
  const result = getResponseForInput(userInput);
  if (result) {
    return res.json({ reply: result.response, category: result.category });
  }

  // 3. Default message
  return res.json({
    reply: "Don't worry, I’m here for you. You’re not facing this alone 💕",
    category: "neutral"
  });
});

// New route for flagged messages
app.get('/api/flagged', (req, res) => {
  const flagged = JSON.parse(fs.readFileSync(flaggedPath));
  res.json(flagged);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

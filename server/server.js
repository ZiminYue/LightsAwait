const flaggedPath = './server/data/flagged.json';
const securityCheckWords = ['history', 'background', 'past']; 
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const getReactionKeywords = () => {
  return JSON.parse(fs.readFileSync('./server/data/reaction_keywords.json'));
};
const triggerWordsPath = './server/data/trigger_words.json';
const customCodesPath = './server/data/custom_codes.json';

// Function to parse custom code instructions from user message

/*WARNING: In current version,the mapping phrases must be enclosed in quotation marks (" " or ' ').
Note that contractions like "I'm" will only match the first part "I" due to the apostrophe breaking
the detection.*/

function parseHelpCodeInstruction(input) {
  const matches = [...input.matchAll(/["']([^"']+)["']/g)];
  if (matches.length >= 2) {
    const code = matches[0][1].trim().toLowerCase();
    const meaning = matches[1][1].trim();
    return { code, meaning };
  }
  return null;
}

// Match keywords and classify them
function getResponseForInput(input) {
  input = input.toLowerCase();
  const reactionKeywords = getReactionKeywords();

  for (const category in reactionKeywords) {
    const groups = reactionKeywords[category];
    
    for (const groupName in groups) {
      const group = groups[groupName];
      
      if (group.keywords && Array.isArray(group.keywords)) {
        const matchedKeyword = group.keywords.find(keyword => 
          input.includes(keyword.toLowerCase())
        );
        
        if (matchedKeyword) {
          return {
            category,
            group: groupName,
            response: {
              reply: group.reply,
              gif: group.gif || null
            }
          };
        }
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

// Route: Fetch all keyword dictionaries
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

// Route: Add custom secret codes (explicit API)
app.post('/api/custom-codes', (req, res) => {
  const { phrase, meaning } = req.body;
  if (!phrase || !meaning) {
    return res.status(400).json({ error: 'Missing phrase or meaning' });
  }

  const currentData = JSON.parse(fs.readFileSync(customCodesPath));

  // Ensure custom_codes is an object
  if (typeof currentData.custom_codes !== 'object' || Array.isArray(currentData.custom_codes)) {
    currentData.custom_codes = {};
  }

  currentData.custom_codes[phrase] = meaning;

  fs.writeFileSync(customCodesPath, JSON.stringify(currentData, null, 2));
  res.json({ success: true, added: { [phrase]: meaning } });
});

// Route: Chat message handler
app.post('/chat', (req, res) => {
  const userInputRaw = req.body.message || '';
  const userInput = userInputRaw.toLowerCase();
  const pendingCheckPath = './server/data/pending_security_check.json';

  // console.log(`[Server] Received message: "${userInputRaw}"`);

  // 0. Processing answers to ongoing security checks
  
  if (fs.existsSync(pendingCheckPath)) {
    console.log('[Server] Pending security check file found. Attempting to validate answer.');
    let pending;
    try {
      pending = JSON.parse(fs.readFileSync(pendingCheckPath));
    } catch (err) {
      console.error('[Server Error] Failed to read/parse pending_security_check.json:', err);
      // Clear corrupted file
      try { fs.unlinkSync(pendingCheckPath); } catch(e) { console.error('Failed to delete corrupted pending_security_check.json:', e); }
      return res.status(500).json({ reply: 'Server error: Security check data corrupted. Please try again.', category: 'error' });
    }

    if (userInput === pending.answer.toLowerCase()) {
      // Right Answer
      // console.log('[Server] Security check passed.');
      try { fs.unlinkSync(pendingCheckPath); } catch (err) { console.error('[Server Error] Failed to delete pending_security_check.json:', err); }
      return res.json({
        reply: { reply: `Great, thank you very much👏Take a moment to make sure you're in a good place before we continue.\n\nI’ll bring up the info you need when you're ready!`, gif: 'enjoy.gif' },
        category: 'security_verified'
      });
    } else {
      // Wrong Answer
      // console.log('[Server] Security check failed. Incorrect answer.');
      try { fs.unlinkSync(pendingCheckPath); } catch (err) { console.error('[Server Error] Failed to delete pending_security_check.json after failed check:', err); }
      return res.json({
        reply: { reply: `Sorry, providing any further details seems not a good idea at this point. Please take care and stay safe🕊️`, gif: 'nothing.gif' },
        category: 'security_failed'
      });
    }
  }

  // 1. Try to detect custom code mapping
  const parsed = parseHelpCodeInstruction(userInputRaw);
  if (parsed) {
    const { code, meaning } = parsed;
    const currentData = JSON.parse(fs.readFileSync(customCodesPath));

    if (typeof currentData.custom_codes !== 'object' || Array.isArray(currentData.custom_codes)) {
      currentData.custom_codes = {};
    }

    currentData.custom_codes[code] = meaning;
    fs.writeFileSync(customCodesPath, JSON.stringify(currentData, null, 2));

    return res.json({
      reply: `Got it! When you say "${code}", I’ll take it to mean "${meaning}" 😉 Let me know if you'd like to update it later!`,
      category: "custom_code"
    });
  }

  // 2. Check trigger words
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

  // 3. Check reaction_keywords
  const result = getResponseForInput(userInput);
  if (result) {
    return res.json({ reply: result.response, category: result.category });
  }

  // Security check
  const triggeredSecurityWord = securityCheckWords.find(word => userInput.includes(word));
  if (triggeredSecurityWord) {
    console.log(`[Server] Triggered security check by word: "${triggeredSecurityWord}".`);
    let custom;
    try {
      custom = JSON.parse(fs.readFileSync(customCodesPath));
    } catch (err) { console.error('[Server Error] Failed to read/parse custom_codes.json for security check:', err); return res.status(500).json({ reply: 'Server error: Custom codes unavailable for security check.', category: 'error' }); }
    const keys = Object.keys(custom.custom_codes || {});

    if (keys.length > 0) {
      const randomIndex = Math.floor(Math.random() * keys.length);
      const randomCode = keys[randomIndex];
      const correctAnswer = custom.custom_codes[randomCode];
      try { fs.writeFileSync('./server/data/pending_security_check.json', JSON.stringify({ code: randomCode, answer: correctAnswer })); } catch (err) { console.error('[Server Error] Failed to write pending_security_check.json:', err); return res.status(500).json({ reply: 'Server error: Could not initiate security check.', category: 'error' }); }
      return res.json({
        reply: { reply: `Just to make sure everything’s okay, let’s do a quick check.\n\n When you see '${randomCode}', what comes to mind?`, gif: 'secure.gif' },
        category: 'security_check'
      });
    } else {
      return res.json({
        reply: { reply: `Hmm, looks like this part isn’t working at the moment🤒\n\n Maybe try again a bit later?`, gif: 'secure.gif' },
        category: 'security_check'
      });
    }
  }

  // If a pending security check exists, validate
    if (fs.existsSync(pendingCheckPath)) {
      const pending = JSON.parse(fs.readFileSync(pendingCheckPath));

      if (userInput === pending.answer.toLowerCase()) {
        fs.unlinkSync(pendingCheckPath); // Delete verification record
        return res.json({
          reply: {
            reply: `Great, thank you very much👏Take a moment to make sure you're in a good place before we continue.\n\nI’ll bring up the info you need when you're ready!`,
            gif: 'enjoy.gif'
          },
          category: 'security_verified'
        });
      } else {
        fs.unlinkSync(pendingCheckPath); 
        return res.json({
          reply: {
            reply: `I’m sorry — it might not be the right time to share more details.\n\nPlease take good care of yourself and stay safe 🕊️`,
            gif: 'nothing.gif'
          },
          category: 'security_failed'
        });
      }
    } 

  // Default reply
  return res.json({
    reply: "Don't worry, I’m here for you. You’re not facing this alone 💕",
    category: "neutral"
  });
});

// Route: Save flagged message
app.post('/flag-message', (req, res) => {
  try {
    const { message, timestamp, type, status } = req.body;
    
    const flaggedData = {
      id: Date.now().toString(),
      message: message,
      timestamp: timestamp,
      type: type, // 'report_content', 'trigger_detected', etc.
      status: status // 'submitted', 'auto_flagged',  etc.
    };

    // Read existing flagged data
    let flaggedMessages;
    try {
      const existingData = fs.readFileSync(flaggedPath, 'utf8');
      flaggedMessages = JSON.parse(existingData);
      
      // Make sure the messages array exists
      if (!flaggedMessages.messages) {
        flaggedMessages.messages = [];
      }
    } catch (error) {
      // If file does not exist or has the wrong format, create a new structure
      flaggedMessages = { messages: [] };
    }

    // Add new flagged message to the beginning of the array
    flaggedMessages.messages.unshift(flaggedData);
    
    // Limit the number of messages (to prevent files from being too large)
    if (flaggedMessages.messages.length > 100) {
      flaggedMessages.messages = flaggedMessages.messages.slice(0, 100);
    }

    // Save to the file
    fs.writeFileSync(flaggedPath, JSON.stringify(flaggedMessages, null, 2));

    console.log(`✅ Flagged message saved: ${type} - ${status}`);
    res.json({ success: true, message: 'Message flagged successfully' });
    
  } catch (error) {
    console.error('❌ Error flagging message:', error);
    res.status(500).json({ success: false, error: 'Failed to flag message' });
  }
});

// Route: Flagged messages
app.get('/api/flagged', (req, res) => {
  const flagged = JSON.parse(fs.readFileSync(flaggedPath));
  res.json(flagged);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

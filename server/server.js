const flaggedPath = './server/data/flagged.json';
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

  // 4. Default fallback
  return res.json({
    reply: "Don't worry, I’m here for you. You’re not facing this alone 💕",
    category: "neutral"
  });
});

// Route: Save flagged message (新增)
app.post('/flag-message', (req, res) => {
  try {
    const { message, timestamp, type, status } = req.body;
    
    const flaggedData = {
      id: Date.now().toString(),
      message: message,
      timestamp: timestamp,
      type: type, // 'report_content', 'report_confirmation', etc.
      status: status // 'submitted', 'confirmed', 'declined', etc.
    };

    // 读取现有的flagged数据
    let flaggedMessages;
    try {
      const existingData = fs.readFileSync(flaggedPath, 'utf8');
      flaggedMessages = JSON.parse(existingData);
      
      // 确保messages数组存在
      if (!flaggedMessages.messages) {
        flaggedMessages.messages = [];
      }
    } catch (error) {
      // 文件不存在或格式错误，创建新的结构
      flaggedMessages = { messages: [] };
    }

    // 添加新的flagged消息到数组开头
    flaggedMessages.messages.unshift(flaggedData);
    
    // 限制消息数量（可选，防止文件过大）
    if (flaggedMessages.messages.length > 100) {
      flaggedMessages.messages = flaggedMessages.messages.slice(0, 100);
    }

    // 保存回文件
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

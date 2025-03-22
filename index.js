const express = require('express');
const axios = require('axios');
const app = express();

// ========================
//  Environment Validation
// ========================
const requiredEnvVars = [
  'VK_TOKEN',
  'BOTPRESS_URL',
  'VK_CONFIRMATION_CODE',
  'BOTPRESS_API_KEY',
  'VK_SECRET'
];

requiredEnvVars.forEach(name => {
  if (!process.env[name]) {
    throw new Error(`[CONFIG] Missing required environment variable: ${name}`);
  }
});

const {
  VK_TOKEN,
  BOTPRESS_URL,
  VK_CONFIRMATION_CODE,
  BOTPRESS_API_KEY,
  VK_SECRET
} = process.env;

// ========================
//  Middleware
// ========================
app.use(express.json());

// ========================
//  Request Logging
// ========================
app.use((req, res, next) => {
  console.log('\n===== Incoming Request =====');
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});

// ========================
//  Webhook Handler
// ========================
app.all('/webhook', async (req, res) => {
  try {
    // 1. Secret Validation
    if (req.body.secret !== VK_SECRET) {
      console.warn('[SECURITY] Invalid secret provided');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const event = req.body;

    // 2. Event Type Handling
    switch (event.type) {
      case 'confirmation':
        console.log('[VK] Handling confirmation request');
        return res.send(VK_CONFIRMATION_CODE);

      case 'message_typing_state':
        console.log('[VK] Ignoring typing state event');
        return res.send('ok');

      case 'message_new':
        await handleNewMessage(event);
        break;

      default:
        console.warn(`[VK] Unhandled event type: ${event.type}`);
    }

    res.send('ok');
  } catch (error) {
    console.error('[ERROR] Global error handler:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).send('Internal Server Error');
  }
});

// ========================
//  Message Handling
// ========================
async function handleNewMessage(event) {
  console.log('[VK] Processing new message');

  // 1. Message Validation
  const message = event.object?.message;
  if (!message || !message.text) {
    console.warn('[VK] Invalid message structure');
    return;
  }

  // 2. Prepare Data
  const userId = message.from_id;
  const text = message.text;
  const userTag = `vk_${userId}`;

  console.log(`[USER ${userTag}] Received message: "${text}"`);

  try {
    // 3. Send to Botpress
    console.log(`[BOTPRESS] Sending message to ${BOTPRESS_URL}`);
    const bpResponse = await axios.post(
      BOTPRESS_URL,
      {
        text: text,
        userId: userTag
      },
      {
        headers: {
          Authorization: `Bearer ${BOTPRESS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`[BOTPRESS] Response:`, bpResponse.data);

    // 4. Send Reply to VK
    if (bpResponse.data?.reply) {
      console.log(`[VK] Sending reply to user ${userTag}`);
      await axios.post(
        'https://api.vk.com/method/messages.send',
        {
          access_token: VK_TOKEN,
          user_id: userId,
          message: bpResponse.data.reply,
          random_id: Math.floor(Math.random() * 1e10),
          v: '5.199'
        }
      );
    }
  } catch (error) {
    console.error(`[ERROR] Message handling failed:`, {
      user: userTag,
      error: error.message,
      response: error.response?.data
    });
    throw error;
  }
}

// ========================
//  Server Initialization
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n=== Server Started ===');
  console.log(`Port: ${PORT}`);
  console.log(`Botpress URL: ${BOTPRESS_URL}`);
  console.log(`VK Group ID: ${process.env.VK_GROUP_ID || 'not set'}`);
  console.log('======================\n');
});

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const BOTPRESS_API_URL = 'https://api.botpress.cloud/v1/messages';
const BOTPRESS_BOT_ID = process.env.BOTPRESS_BOT_ID;
const BOTPRESS_API_TOKEN = process.env.BOTPRESS_API_TOKEN;
const VK_GROUP_TOKEN = process.env.VK_GROUP_TOKEN;

app.post('/vk-webhook', async (req, res) => {
  const body = req.body;

  if (body.type === 'confirmation') {
    return res.send(process.env.VK_CONFIRMATION_CODE);
  }

  if (body.type === 'message_new') {
    const messageText = body.object.message.text;
    const vkUserId = body.object.message.from_id;
    const conversationId = `vk-${vkUserId}`;

    try {
      await axios.post(BOTPRESS_API_URL, {
        botId: BOTPRESS_BOT_ID,
        conversationId,
        payload: {
          type: 'text',
          text: messageText
        }
      }, {
        headers: {
          Authorization: `Bearer ${BOTPRESS_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Botpress Error:', error.response?.data || error.message);
    }

    return res.send('ok');
  }

  res.send('ok');
});

app.post('/botpress-webhook', async (req, res) => {
  const { conversationId, payload } = req.body;

  if (payload.type === 'text') {
    const vkUserId = conversationId.replace('vk-', '');

    try {
      await axios.post('https://api.vk.com/method/messages.send', null, {
        params: {
          user_id: vkUserId,
          message: payload.text,
          random_id: Math.floor(Math.random() * 1e9),
          access_token: VK_GROUP_TOKEN,
          v: '5.131'
        }
      });
    } catch (error) {
      console.error('VK Error:', error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
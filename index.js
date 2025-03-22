const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Проверка переменных окружения
const ENV_VARS = [
  'VK_TOKEN',
  'BOTPRESS_WEBHOOK_URL',
  'BOTPRESS_API_TOKEN',
  'VK_CONFIRMATION_CODE',
  'VK_SECRET'
];

ENV_VARS.forEach(name => {
  if (!process.env[name]) {
    console.error(`[FATAL] Missing environment variable: ${name}`);
    process.exit(1);
  }
});

const {
  VK_TOKEN,
  BOTPRESS_WEBHOOK_URL,
  BOTPRESS_API_TOKEN,
  VK_CONFIRMATION_CODE,
  VK_SECRET
} = process.env;

app.use(express.json());

// Обработчик входящих сообщений от ВК
app.post('/webhook', async (req, res) => {
  try {
    if (req.body.secret !== VK_SECRET) {
      return res.status(403).send('Forbidden');
    }

    const event = req.body;
    
    if (event.type === 'confirmation') {
      return res.send(VK_CONFIRMATION_CODE);
    }

    if (event.type === 'message_new') {
      const message = event.object.message;
      const userId = message.from_id;
      
      // Формируем запрос для Botpress
      const bpPayload = {
        userId: `vk_${userId}`,
        messageId: uuidv4(),
        conversationId: `vk_conv_${userId}`,
        type: 'text',
        text: message.text,
        payload: {
          vkMessage: message
        }
      };

      // Отправляем в Botpress
      await axios.post(BOTPRESS_WEBHOOK_URL, bpPayload, {
        headers: {
          Authorization: `Bearer ${BOTPRESS_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }

    res.send('ok');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.send('ok');
  }
});

// Обработчик ответов от Botpress
app.post('/botpress-webhook', async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const userId = conversationId.replace('vk_conv_', '');

    // Отправляем ответ в ВК
    await axios.post('https://api.vk.com/method/messages.send', {
      access_token: VK_TOKEN,
      user_id: userId,
      message: text,
      random_id: Date.now(),
      v: '5.199'
    });

    res.send('ok');
  } catch (error) {
    console.error('Botpress webhook error:', error);
    res.send('ok');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const axios = require('express');
const app = express();

// Проверка переменных окружения
const checkEnv = (name) => {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
};

checkEnv('VK_TOKEN');
checkEnv('BOTPRESS_URL');
checkEnv('VK_CONFIRMATION_CODE');
checkEnv('BOTPRESS_API_KEY');
checkEnv('VK_SECRET');

const {
  VK_TOKEN,
  BOTPRESS_URL,
  VK_CONFIRMATION_CODE,
  BOTPRESS_API_KEY,
  VK_SECRET
} = process.env;

app.use(express.json());

app.all('/webhook', async (req, res) => {
  try {
    // Логирование входящего запроса
    console.log('Incoming request:', {
      method: req.method,
      headers: req.headers,
      body: req.body
    });

    // Проверка секрета
    if (req.body.secret !== VK_SECRET) {
      console.warn('Invalid secret received');
      return res.status(403).send('Forbidden');
    }

    const event = req.body;

    // Обработка типов событий
    switch (event.type) {
      case 'confirmation':
        console.log('Handling confirmation request');
        return res.send(VK_CONFIRMATION_CODE);

      case 'message_typing_state':
        console.log('Ignoring typing state');
        return res.send('ok');

      case 'message_new':
        console.log('Processing new message');
        const message = event.object.message;
        const userId = message.from_id;
        const text = message.text;

        // Отправка в Botpress
        const bpResponse = await axios.post(
          BOTPRESS_URL,
          {
            text: text,
            userId: `vk_${userId}`
          },
          {
            headers: {
              Authorization: `Bearer ${BOTPRESS_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Отправка ответа в VK
        await axios.post('https://api.vk.com/method/messages.send', {
          access_token: VK_TOKEN,
          user_id: userId,
          message: bpResponse.data.reply,
          random_id: Math.floor(Math.random() * 1e10),
          v: '5.199'
        });
        break;

      default:
        console.warn('Unhandled event type:', event.type);
    }

    res.send('ok');
  } catch (error) {
    console.error('Global error handler:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.send('ok');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Botpress URL:', BOTPRESS_URL);
});

const express = require('express');
const axios = require('axios');

// 1. Инициализация приложения
const app = express();

// 2. Проверка переменных окружения
const checkEnv = (name) => {
  if (!process.env[name]) throw new Error(`Missing env var: ${name}`);
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

// 3. Настройка middleware
app.use(express.json());

// 4. Определение маршрутов (после инициализации app)
app.all('/webhook', async (req, res) => {
  try {
    if (req.body.secret !== VK_SECRET) {
      return res.status(403).send('Forbidden');
    }

    const event = req.body;

    if (event.type === 'message_typing_state') {
      return res.send('ok');
    }

    if (event.type === 'confirmation') {
      return res.send(VK_CONFIRMATION_CODE);
    }

    if (event.type === 'message_new') {
      const message = event.object.message;
      const userId = message.from_id;
      const text = message.text;

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

      await axios.post('https://api.vk.com/method/messages.send', {
        access_token: VK_TOKEN,
        user_id: userId,
        message: bpResponse.data.reply,
        random_id: Math.floor(Math.random() * 1e10),
        v: '5.199'
      });
    }

    res.send('ok');
  } catch (error) {
    console.error('Error:', error);
    res.send('ok');
  }
});

// 5. Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

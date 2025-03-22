const express = require('express');
const axios = require('axios');
const app = express();

const VK_TOKEN = process.env.VK_TOKEN;
const BOTPRESS_URL = process.env.BOTPRESS_URL;
const VK_CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE; // Ваш код "79a2ae30"

app.use(express.json());

// Обработчик ВСЕХ запросов к /webhook (GET и POST)
app.all('/webhook', async (req, res) => {
  const event = req.body || req.query; // Для GET-запросов (confirmation) данные в req.query

  // Подтверждение сервера (GET-запрос)
  if (event.type === 'confirmation') {
    return res.send(VK_CONFIRMATION_CODE); // Просто строку "79a2ae30"
  }

  // Обработка сообщений (POST-запрос)
  if (event.type === 'message_new') {
    const userId = event.object.message.from_id;
    const messageText = event.object.message.text;

    try {
      // Отправка сообщения в Botpress
      const response = await axios.post(BOTPRESS_URL, {
        text: messageText,
        userId: userId.toString()
      });

      // Отправка ответа в ВК
      await axios.post('https://api.vk.com/method/messages.send', {
        access_token: VK_TOKEN,
        user_id: userId,
        message: response.data.reply,
        random_id: Math.floor(Math.random() * 1e10),
        v: '5.131'
      });
    } catch (error) {
      console.error('Ошибка:', error);
    }
  }

  res.send('ok'); // Всегда возвращаем "ok" для других событий
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

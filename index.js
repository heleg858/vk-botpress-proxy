const express = require('express');
const axios = require('axios');
const app = express();

const VK_TOKEN = process.env.VK_TOKEN;
const BOTPRESS_URL = process.env.BOTPRESS_URL;

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const event = req.body;

  // Подтверждение сервера
  if (event.type === 'confirmation') {
    return res.send(process.env.VK_CONFIRMATION_CODE);
  }

  // Обработка сообщений
  if (event.type === 'message_new') {
    const userId = event.object.message.from_id;
    const messageText = event.object.message.text;

    try {
      // Отправка в Botpress
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

  res.send('ok');
}); // <-- Закрывающая скобка для app.post()

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

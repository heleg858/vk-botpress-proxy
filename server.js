const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// Токен вашего сообщества ВКонтакте
const VK_TOKEN = 'vk1.a.vOtdnyvb6OEcjJ1lCSfkLZA0D9gqE9bo5cCPnRziBNO8igUU7q_6wLRSoxiGx2JnSGbN503v9JEh6hnOR3yZnlPrNfkBeZ76KYHPM1Z0jLfehZGpuPb38571-7MKlitFE2GFbBMl7XLSfpK6CyvIUzIvhuFkmEoP-LmupmLRG8HV_dC4jsKNaoS0wP1czQBs9cfDq1DQhunb5k0qvvkLDw';
// Webhook URL вашего бота в Botpress
const BOTPRESS_URL = 'https://webhook.botpress.cloud/6e3a3249-4a80-4938-a1c6-12c08b5736a7';

// Подтверждение сервера для Callback API
app.get('/callback', (req, res) => {
  const { secret } = req.query;
  if (secret === '79a2ae30') { // Убедитесь, что строка совпадает с указанной в настройках
    res.send(secret); // Возвращаем строку подтверждения
  } else {
    res.status(401).send('Unauthorized');
  }
});

// Обработка входящих сообщений
app.post('/callback', async (req, res) => {
  const { type, object } = req.body;

  if (type === 'message_new') {
    const userId = object.message.from_id;
    const userMessage = object.message.text;

    // Отправляем сообщение в Botpress
    const botResponse = await axios.post(BOTPRESS_URL, {
      userId,
      text: userMessage,
    });

    // Отправляем ответ пользователю
    await axios.post('https://api.vk.com/method/messages.send', {
      access_token: VK_TOKEN,
      user_id: userId,
      message: botResponse.data.text,
      v: '5.131',
    });
  }

  res.send('ok');
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

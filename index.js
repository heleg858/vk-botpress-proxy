const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Настройки
const VK_TOKEN = 'vk1.a.vOtdnyvb6OEcjJ1lCSfkLZA0D9gqE9bo5cCPnRziBNO8igUU7q_6wLRSoxiGx2JnSGbN503v9JEh6hnOR3yZnlPrNfkBeZ76KYHPM1Z0jLfehZGpuPb38571-7MKlitFE2GFbBMl7XLSfpK6CyvIUzIvhuFkmEoP-LmupmLRG8HV_dC4jsKNaoS0wP1czQBs9cfDq1DQhunb5k0qvvkLDw';
const BOTPRESS_URL = https://app.botpress.cloud/api/v1/bots/46db839f-010d-4f74-9c7d-8c761e401ef3/converse; // Используем правильный Bot ID
const CONFIRMATION_CODE = 'fb0fe1b4';

// Обработка запросов от VK
app.post('/vk-callback', async (req, res) => {
  const body = req.body;

  // Подтверждение сервера
  if (body.type === 'confirmation') {
    return res.send(CONFIRMATION_CODE);
  }

  // Новое сообщение от пользователя
  if (body.type === 'message_new') {
    const userMessage = body.object.message.text;
    const userId = body.object.message.from_id; // ID пользователя ВКонтакте

    try {
      // Отправка сообщения в Botpress
      const botResponse = await axios.post(`${BOTPRESS_URL}/${userId}`, {
        type: 'text',
        text: userMessage
      });

      const reply = botResponse.data.responses?.[0]?.payload?.text || 'Извините, я не понял ваш вопрос.';

      // Отправка ответа пользователю в VK
      await axios.post('https://api.vk.com/method/messages.send', null, {
        params: {
          access_token: VK_TOKEN,
          v: '5.131',
          peer_id: userId,
          message: reply,
          random_id: Math.floor(Math.random() * 1000000)
        }
      });

      res.send('ok');
    } catch (err) {
      console.error('Ошибка при обработке сообщения:', err);
      res.send('ok');
    }
  } else {
    res.send('ok');
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

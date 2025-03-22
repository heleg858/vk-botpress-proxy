const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const EventSource = require('eventsource');
const app = express();

app.use(bodyParser.json());

// Webhook ID вашего бота в Botpress
const BOTPRESS_WEBHOOK_ID = '0b55da7e-0e01-47a5-a97c-5a9086255df2'; // Замените на ваш Webhook ID
const BOTPRESS_API_URL = `https://chat.botpress.cloud/${BOTPRESS_WEBHOOK_ID}`;

// Токен вашего сообщества ВКонтакте
const VK_TOKEN = 'vk1.a.vOtdnyvb6OEcjJ1lCSfkLZA0D9gqE9bo5cCPnRziBNO8igUU7q_6wLRSoxiGx2JnSGbN503v9JEh6hnOR3yZnlPrNfkBeZ76KYHPM1Z0jLfehZGpuPb38571-7MKlitFE2GFbBMl7XLSfpK6CyvIUzIvhuFkmEoP-LmupmLRG8HV_dC4jsKNaoS0wP1czQBs9cfDq1DQhunb5k0qvvkLDw';

// Функция для прослушивания событий от Botpress
function listenToBotpressEvents(conversationId, userKey, userId) {
  const sseUrl = `${BOTPRESS_API_URL}/conversations/${conversationId}/listen`;
  const eventSource = new EventSource(sseUrl, {
    headers: { 'x-user-key': userKey },
  });

  eventSource.onmessage = (event) => {
    const message = JSON.parse(event.data);

    // Проверяем, что это сообщение от бота
    if (message.type === 'text' && message.authorId !== userId) {
      console.log('Ответ от бота:', message.text);

      // Отправляем ответ пользователю в ВКонтакте
      axios.post('https://api.vk.com/method/messages.send', {
        access_token: VK_TOKEN,
        user_id: userId,
        message: message.text,
        v: '5.131',
      }).then(() => {
        console.log('Ответ отправлен пользователю:', userId);
      }).catch((error) => {
        console.error('Ошибка при отправке ответа:', error.message);
      });
    }
  };

  eventSource.onerror = (error) => {
    console.error('Ошибка SSE:', error);
  };
}

// Подтверждение сервера для Callback API
app.get('/callback', (req, res) => {
  const { secret } = req.query;
  if (secret === '79a2ae30') {
    res.send(secret);
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

    try {
      // Создаем пользователя в Botpress (если ещё не создан)
      const userResponse = await axios.post(`${BOTPRESS_API_URL}/users`, {});
      const userKey = userResponse.data.key;

      // Создаем диалог
      const conversationResponse = await axios.post(`${BOTPRESS_API_URL}/conversations`, {}, {
        headers: { 'x-user-key': userKey },
      });
      const conversationId = conversationResponse.data.id;

      // Начинаем прослушивание событий от бота
      listenToBotpressEvents(conversationId, userKey, userId);

      // Отправляем сообщение в Botpress
      await axios.post(`${BOTPRESS_API_URL}/conversations/${conversationId}/messages`, {
        type: 'text',
        text: userMessage,
      }, {
        headers: { 'x-user-key': userKey },
      });

      console.log('Сообщение отправлено в Botpress');
    } catch (error) {
      console.error('Ошибка при обработке сообщения:', error.message);
      res.status(500).send('Internal Server Error');
      return;
    }
  }

  res.send('79a2ae30');
});

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

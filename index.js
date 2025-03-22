const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');  // Для отправки запросов на Botpress

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// URL вебхука Botpress (ты его взял с плагина Webhook with Response)
const botpressWebhookUrl = 'https://webhook.botpress.cloud/55d7d688-09dc-4529-9ee3-a931a3fc265c';

// Уникальный идентификатор вебхука, который ты указал в настройках Botpress
const chatWebhookId = 'vk-webhook-botpress'; // Это значение должно совпадать с тем, что указано в Botpress

// Обработчик для подтверждения вебхука от ВКонтакте
app.post('/callback', (req, res) => {
  const data = req.body;

  if (data.type === 'confirmation') {
    // Отправляем строку подтверждения для ВКонтакте
    res.status(200).send('79a2ae30');
  } else {
    // Пересылаем запрос от ВКонтакте на Botpress с добавлением chatWebhookId
    axios.post(botpressWebhookUrl, {
      chatWebhookId: chatWebhookId,  // Добавляем ID вебхука
      userKey: data.user_id,  // Используем user_id из запроса ВКонтакте
      conversationId: data.peer_id,  // Используем peer_id (ID беседы)
      eventData: data  // Отправляем все данные события от ВКонтакте
    })
      .then(response => {
        // Отправляем успешный ответ
        res.status(200).json(response.data);
      })
      .catch(error => {
        console.error('Ошибка при пересылке запроса на Botpress:', error);
        res.status(500).send('Ошибка сервера');
      });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

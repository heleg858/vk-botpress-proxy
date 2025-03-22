const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');  // Добавляем axios для отправки запросов

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json()); // Для парсинга JSON тела запросов

// URL Webhook Botpress
const botpressWebhookUrl = 'https://webhook.botpress.cloud/55d7d688-09dc-4529-9ee3-a931a3fc265c';

// Обработчик для подтверждения вебхука от ВКонтакте
app.post('/callback', (req, res) => {
  const data = req.body;

  if (data.type === 'confirmation') {
    // Возвращаем строку подтверждения для ВКонтакте
    res.status(200).send('79a2ae30');
  } else {
    // Пересылаем запрос от ВКонтакте на Botpress
    axios.post(botpressWebhookUrl, data)
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

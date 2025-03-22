const express = require('express');
const axios = require('axios');

// 1. Инициализация Express-приложения
const app = express();

// 2. Проверка переменных окружения
const checkEnv = (name) => {
  if (!process.env[name]) {
    throw new Error(`Переменная окружения ${name} не задана!`);
  }
};

checkEnv('VK_TOKEN');
checkEnv('BOTPRESS_URL');
checkEnv('VK_CONFIRMATION_CODE');
checkEnv('BOTPRESS_API_KEY'); // Добавьте, если используете API-ключ

const { VK_TOKEN, BOTPRESS_URL, VK_CONFIRMATION_CODE, BOTPRESS_API_KEY } = process.env;

// 3. Подключение middleware
app.use(express.json());

// 4. Определение маршрутов (теперь app уже существует)
app.all('/webhook', async (req, res) => {
  const event = req.body || req.query;

  if (event.type === 'confirmation') {
    return res.send(VK_CONFIRMATION_CODE);
  }

  if (event.type === 'message_new') {
    const userId = event.object.message.from_id;
    const messageText = event.object.message.text;

    try {
      const response = await axios.post(
        BOTPRESS_URL,
        {
          text: messageText,
          userId: userId.toString()
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
        message: response.data.reply,
        random_id: Math.floor(Math.random() * 1e10),
        v: '5.131'
      });
    } catch (error) {
      console.error('Ошибка:', error.response?.data || error.message);
    }
  }

  res.send('ok');
});

// 5. Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Сервер запущен. BOTPRESS_URL:', BOTPRESS_URL);
});

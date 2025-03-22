const express = require('express');
const axios = require('axios');
const app = express();

// Проверка переменных окружения
const checkEnv = (name) => {
  if (!process.env[name]) {
    throw new Error(`Переменная окружения ${name} не задана!`);
  }
};

checkEnv('VK_TOKEN');
checkEnv('BOTPRESS_URL');
checkEnv('VK_CONFIRMATION_CODE');

const { VK_TOKEN, BOTPRESS_URL, VK_CONFIRMATION_CODE } = process.env;

app.use(express.json());

app.all('/webhook', async (req, res) => {
  const event = req.body || req.query;

  if (event.type === 'confirmation') {
    return res.send(VK_CONFIRMATION_CODE);
  }

  if (event.type === 'message_new') {
    const userId = event.object.message.from_id;
    const messageText = event.object.message.text;

    try {
      console.log('Отправка запроса в Botpress по URL:', BOTPRESS_URL); // Логирование URL
      const response = await axios.post(BOTPRESS_URL, {
        text: messageText,
        userId: userId.toString()
      });

      await axios.post('https://api.vk.com/method/messages.send', {
        access_token: VK_TOKEN,
        user_id: userId,
        message: response.data.reply,
        random_id: Math.floor(Math.random() * 1e10),
        v: '5.131'
      });
    } catch (error) {
      console.error('Ошибка Axios:', error.message);
      if (error.response) {
        console.error('Данные ошибки:', error.response.data);
      }
    }
  }

  res.send('ok');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Сервер запущен. BOTPRESS_URL:', BOTPRESS_URL); // Логирование при старте
});

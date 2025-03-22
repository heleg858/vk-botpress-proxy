const express = require('express');
const axios = require('axios');
const app = express();

const checkEnv = (name) => {
  if (!process.env[name]) throw new Error(`Missing env var: ${name}`);
};

checkEnv('VK_TOKEN');
checkEnv('BOTPRESS_URL');
checkEnv('VK_CONFIRMATION_CODE');
checkEnv('BOTPRESS_API_KEY');
checkEnv('VK_SECRET'); // Добавляем проверку секрета

const {
  VK_TOKEN,
  BOTPRESS_URL,
  VK_CONFIRMATION_CODE,
  BOTPRESS_API_KEY,
  VK_SECRET
} = process.env;

app.use(express.json());

app.all('/webhook', async (req, res) => {
  try {
    // 1. Проверка секретного ключа
    if (req.body.secret !== VK_SECRET) {
      console.warn('Invalid secret');
      return res.status(403).send('Forbidden');
    }

    // 2. Логирование входящего запроса
    console.log('Incoming VK event:', JSON.stringify(req.body, null, 2));

    const event = req.body;

    // 3. Обработка подтверждения
    if (event.type === 'confirmation') {
      console.log('Confirmation request');
      return res.send(VK_CONFIRMATION_CODE);
    }

    // 4. Обработка сообщений
    if (event.type === 'message_new') {
      const message = event.object.message;
      const userId = message.from_id;
      const text = message.text;

      // 5. Отправка в Botpress
      console.log('Sending to Botpress:', {text, userId});
      const bpResponse = await axios.post(
        BOTPRESS_URL,
        {
          text: text,
          userId: userId.toString()
        },
        {
          headers: {
            Authorization: `Bearer ${BOTPRESS_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 6. Отправка ответа в ВК
      console.log('Botpress response:', bpResponse.data);
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
    console.error('Global error handler:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started. Botpress URL: ${BOTPRESS_URL}`);
});

const express = require('express');
const axios = require('axios');
const app = express();

// ======================================
// 1. Проверка обязательных переменных окружения
// ======================================
const ENV_VARS = [
  'VK_TOKEN',
  'BOTPRESS_URL',
  'VK_CONFIRMATION_CODE',
  'BOTPRESS_API_KEY',
  'VK_SECRET'
];

ENV_VARS.forEach(name => {
  if (!process.env[name]) {
    console.error(`[FATAL] Отсутствует переменная окружения: ${name}`);
    process.exit(1);
  }
});

const {
  VK_TOKEN,
  BOTPRESS_URL,
  VK_CONFIRMATION_CODE,
  BOTPRESS_API_KEY,
  VK_SECRET
} = process.env;

// ======================================
// 2. Настройка middleware
// ======================================
app.use(express.json());

// Логирование входящих запросов
app.use((req, res, next) => {
  console.log('\n=== Входящий запрос ===');
  console.log(`Время: ${new Date().toISOString()}`);
  console.log(`Метод: ${req.method}`);
  console.log(`Путь: ${req.path}`);
  console.log('Заголовки:', req.headers);
  console.log('Тело:', JSON.stringify(req.body, null, 2));
  next();
});

// ======================================
// 3. Обработка вебхуков
// ======================================
app.post('/webhook', async (req, res) => {
  try {
    // Проверка секретного ключа
    if (req.body.secret !== VK_SECRET) {
      console.warn('[SECURITY] Неверный секретный ключ');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const event = req.body;
    console.log(`Тип события: ${event.type}`);

    switch (event.type) {
      case 'confirmation':
        console.log('[VK] Подтверждение сервера');
        return res.send(VK_CONFIRMATION_CODE);

      case 'message_typing_state':
        console.log('[VK] Игнорируем статус набора текста');
        return res.send('ok');

      case 'message_new':
        await handleMessage(event);
        break;

      default:
        console.warn(`[VK] Неизвестный тип события: ${event.type}`);
    }

    res.send('ok');
  } catch (error) {
    console.error('[ERROR] Глобальная ошибка:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).send('Internal Server Error');
  }
});

// ======================================
// 4. Обработчик сообщений
// ======================================
async function handleMessage(event) {
  const message = event.object?.message;
  
  // Валидация структуры сообщения
  if (!message || !message.text || !message.from_id) {
    console.error('[ERROR] Некорректная структура сообщения:', message);
    return;
  }

  const userId = message.from_id;
  const userTag = `vk_${userId}`;
  const text = message.text;

  console.log(`[${userTag}] Получено сообщение: "${text}"`);

  try {
    // Отправка в Botpress
    const bpResponse = await axios.post(
      BOTPRESS_URL,
      {
        text: text,
        userId: userTag
      },
      {
        headers: {
          Authorization: `Bearer ${BOTPRESS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('[BOTPRESS] Ответ:', bpResponse.data);

    // Отправка ответа в VK
    if (bpResponse.data?.reply) {
      await axios.post(
        'https://api.vk.com/method/messages.send',
        {
          access_token: VK_TOKEN,
          user_id: userId,
          message: bpResponse.data.reply,
          random_id: Date.now(),
          v: '5.199'
        }
      );
      console.log(`[VK] Ответ отправлен пользователю ${userTag}`);
    }
  } catch (error) {
    console.error(`[ERROR] Ошибка обработки:`, {
      user: userTag,
      error: error.message,
      response: error.response?.data
    });
    throw error;
  }
}

// ======================================
// 5. Запуск сервера
// ======================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n=== Сервер запущен ===');
  console.log(`Порт: ${PORT}`);
  console.log(`Botpress URL: ${BOTPRESS_URL}`);
  console.log(`VK Group ID: ${process.env.VK_GROUP_ID || 'не задан'}`);
  console.log('========================\n');
});

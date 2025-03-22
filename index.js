const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();

// ======================================
// 1. Проверка переменных окружения
// ======================================
const ENV_VARS = [
  'VK_TOKEN',
  'BOTPRESS_WEBHOOK_URL',
  'BOTPRESS_API_TOKEN',
  'VK_CONFIRMATION_CODE',
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
  BOTPRESS_WEBHOOK_URL,
  BOTPRESS_API_TOKEN,
  VK_CONFIRMATION_CODE,
  VK_SECRET
} = process.env;

// ======================================
// 2. Настройка middleware
// ======================================
app.use(express.json());

app.use((req, res, next) => {
  console.log('\n=== Входящий запрос ===');
  console.log(`Время: ${new Date().toISOString()}`);
  console.log(`Метод: ${req.method} | Путь: ${req.path}`);
  console.log('Заголовки:', req.headers);
  console.log('Тело:', JSON.stringify(req.body, null, 2));
  next();
});

// ======================================
// 3. Обработчик для Callback API ВКонтакте
// ======================================
app.post('/webhook', async (req, res) => {
  try {
    if (req.body.secret !== VK_SECRET) {
      console.warn('[SECURITY] Неверный секретный ключ');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const event = req.body;

    if (event.type === 'confirmation') {
      console.log('[VK] Отправка кода подтверждения:', VK_CONFIRMATION_CODE);
      return res.send(VK_CONFIRMATION_CODE);
    }

    if (event.type === 'message_new') {
      const message = event.object.message;
      const userId = message.from_id;
      
      console.log(`[VK] Новое сообщение от ${userId}: "${message.text}"`);

      const bpPayload = {
        userId: `vk_${userId}`,
        messageId: uuidv4(),
        conversationId: `vk_conv_${userId}`,
        type: 'text',
        text: message.text,
        payload: { vkMessage: message }
      };

      try {
        const bpResponse = await axios.post(BOTPRESS_WEBHOOK_URL, bpPayload, {
          headers: {
            Authorization: `Bearer ${BOTPRESS_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        console.log('[BOTPRESS] Ответ принят:', bpResponse.status);
      } catch (error) {
        console.error('[BOTPRESS] Ошибка:', error.response?.data || error.message);
      }
    }

    res.send('ok');
  } catch (error) {
    console.error('[ERROR] Ошибка обработки:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ======================================
// 4. Обработчик ответов от Botpress (Исправленная версия)
// ======================================
app.post('/botpress-webhook', async (req, res) => {
  try {
    console.log('[BOTPRESS] Получен ответ:', JSON.stringify(req.body, null, 2));
    
    // Валидация входящих данных
    if (!req.body.conversationId || !req.body.payload?.text) {
      console.error('[BOTPRESS] Некорректный формат ответа');
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const userId = req.body.conversationId.replace('vk_conv_', '');
    const messageText = req.body.payload.text;

    console.log(`[VK] Подготовка ответа для ${userId}: "${messageText}"`);

    // Формирование запроса к VK API
    const vkPayload = {
      access_token: VK_TOKEN,
      user_id: userId,
      message: messageText,
      random_id: Date.now(),
      v: '5.199'
    };

    console.log('[VK] Параметры запроса:', vkPayload);

    // Отправка сообщения
    const vkResponse = await axios.post(
      'https://api.vk.com/method/messages.send',
      vkPayload
    );

    console.log('[VK] Ответ API:', vkResponse.data);
    res.send('ok');
  } catch (error) {
    console.error('[ERROR] Ошибка отправки:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ======================================
// 5. Запуск сервера
// ======================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n=== Сервер запущен ===');
  console.log(`Порт: ${PORT}`);
  console.log(`Код подтверждения: ${VK_CONFIRMATION_CODE}`);
  console.log('========================\n');
});

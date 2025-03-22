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
// 3. Обработчик для Callback API ВКонтакте
// ======================================
app.post('/webhook', async (req, res) => {
  try {
    // Проверка секрета
    if (req.body.secret !== VK_SECRET) {
      console.warn('[SECURITY] Неверный секретный ключ');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const event = req.body;

    // Обработка подтверждения
    if (event.type === 'confirmation') {
      console.log('[VK] Отправка кода подтверждения:', VK_CONFIRMATION_CODE);
      return res.send(VK_CONFIRMATION_CODE);
    }

    // Обработка сообщений
    if (event.type === 'message_new') {
      const message = event.object.message;
      const userId = message.from_id;
      
      console.log(`[VK] Новое сообщение от ${userId}: "${message.text}"`);

      // Формируем запрос для Botpress
      const bpPayload = {
        userId: `vk_${userId}`,
        messageId: uuidv4(),
        conversationId: `vk_conv_${userId}`,
        type: 'text',
        text: message.text,
        payload: {
          vkMessage: message
        }
      };

      // Отправка в Botpress
      try {
        const bpResponse = await axios.post(
          BOTPRESS_WEBHOOK_URL,
          bpPayload,
          {
            headers: {
              Authorization: `Bearer ${BOTPRESS_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
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
// 4. Обработчик ответов от Botpress
// ======================================
app.post('/botpress-webhook', async (req, res) => {
  try {
    console.log('[BOTPRESS] Получен ответ:', JSON.stringify(req.body, null, 2));
    
    const { conversationId, text } = req.body;
    
    if (!conversationId || !text) {
      console.error('[BOTPRESS] Отсутствуют обязательные поля');
      return res.status(400).send('Bad Request');
    }

    const userId = conversationId.replace('vk_conv_', '');
    console.log(`[VK] Отправка ответа пользователю ${userId}: "${text}"`);

    // Отправка в ВКонтакте
    const vkResponse = await axios.post(
      'https://api.vk.com/method/messages.send',
      {
        access_token: VK_TOKEN,
        user_id: userId,
        message: text,
        random_id: Date.now(),
        v: '5.199'
      }
    );

    console.log('[VK] Ответ отправлен:', vkResponse.data);
    res.send('ok');
  } catch (error) {
    console.error('[ERROR] Ошибка отправки:', {
      message: error.message,
      response: error.response?.data
    });
    res.status(500).send('Internal Server Error');
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

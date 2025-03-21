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
// 4. Исправленный обработчик ответов от Botpress
// ======================================
app.post('/botpress-webhook', async (req, res) => {
  try {
    console.log('[BOTPRESS] Получен ответ:', JSON.stringify(req.body, null, 2));
    
    // Валидация входящих данных
    if (!req.body.conversationId || !req.body.payload?.text) {
      console.error('[BOTPRESS] Некорректный формат ответа');
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Проверка токена
    if (!VK_TOKEN || VK_TOKEN.length < 50) {
      console.error('[VK] Некорректный токен');
      return res.status(500).json({ error: 'Invalid VK token configuration' });
    }

    const userId = req.body.conversationId.replace('vk_conv_', '');
    const messageText = req.body.payload.text;

    console.log(`[VK] Подготовка ответа для ${userId}: "${messageText}"`);

    // Формирование запроса к VK API
    const vkPayload = {
      access_token: VK_TOKEN,
      user_id: userId,
      message: messageText,
      random_id: Math.floor(Date.now() * Math.random()),
      v: '5.199'
    };

    // Отладочная информация
    console.log('[DEBUG] Первые 10 символов токена:', VK_TOKEN.slice(0, 10));
    console.log('[VK] Параметры запроса:', { 
      ...vkPayload, 
      access_token: `${VK_TOKEN.slice(0, 6)}...${VK_TOKEN.slice(-4)}`
    });

    try {
      // Отправка через URLSearchParams
      const vkResponse = await axios.post(
        'https://api.vk.com/method/messages.send',
        new URLSearchParams(vkPayload),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (vkResponse.data.error) {
        console.error('[VK] Ошибка API:', {
          code: vkResponse.data.error.error_code,
          message: vkResponse.data.error.error_msg
        });
        return res.status(500).json({ error: 'VK API Error' });
      }

      console.log('[VK] Сообщение успешно отправлено, ID:', vkResponse.data.response);
      res.send('ok');
    } catch (error) {
      console.error('[VK] Ошибка сети:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      res.status(500).json({ error: 'Network Error' });
    }
  } catch (error) {
    console.error('[ERROR] Ошибка обработки:', {
      message: error.message,
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
  console.log(`Токен VK: ${VK_TOKEN ? `${VK_TOKEN.slice(0, 6)}...${VK_TOKEN.slice(-4)}` : 'не указан'}`);
  console.log('========================\n');
});

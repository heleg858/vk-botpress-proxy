const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();

// ======================================
// 1. Проверка обязательных переменных окружения
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

// ======================================
// 3. Обработчики маршрутов
// ======================================

// Обработчик для Callback API ВКонтакте
app.post('/webhook', async (req, res) => {
  try {
    // Проверка секретного ключа
    if (req.body.secret !== VK_SECRET) {
      console.warn('[SECURITY] Неверный секретный ключ');
      return res.status(403).send('Forbidden');
    }

    const event = req.body;

    // Обработка подтверждения сервера
    if (event.type === 'confirmation') {
      console.log('[VK] Отправка кода подтверждения:', VK_CONFIRMATION_CODE);
      return res.send(VK_CONFIRMATION_CODE);
    }

    // Обработка новых сообщений
    if (event.type === 'message_new') {
      const message = event.object.message;
      const userId = message.from_id;

      // Формирование запроса для Botpress
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
      await axios.post(BOTPRESS_WEBHOOK_URL, bpPayload, {
        headers: {
          Authorization: `Bearer ${BOTPRESS_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }

    res.send('ok');
  } catch (error) {
    console.error('[ERROR] Ошибка обработки:', error);
    res.send('ok');
  }
});

// Обработчик для ответов от Botpress
app.post('/botpress-webhook', async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const userId = conversationId.replace('vk_conv_', '');

    // Отправка ответа в ВКонтакте
    await axios.post('https://api.vk.com/method/messages.send', {
      access_token: VK_TOKEN,
      user_id: userId,
      message: text,
      random_id: Date.now(),
      v: '5.199'
    });

    res.send('ok');
  } catch (error) {
    console.error('[ERROR] Ошибка отправки ответа:', error);
    res.send('ok');
  }
});

// ======================================
// 4. Запуск сервера
// ======================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n=== Сервер запущен ===');
  console.log(`Порт: ${PORT}`);
  console.log(`Код подтверждения: ${VK_CONFIRMATION_CODE}`);
  console.log('========================\n');
});

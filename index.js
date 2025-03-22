app.all('/webhook', async (req, res) => {
  try {
    // Проверка секрета
    if (req.body.secret !== VK_SECRET) {
      console.log('Invalid secret');
      return res.status(403).send('Forbidden');
    }

    const event = req.body;

    // Быстрая обработка ненужных событий
    if (event.type === 'message_typing_state') {
      return res.send('ok');
    }

    if (event.type === 'confirmation') {
      console.log('Confirmation handled');
      return res.send(VK_CONFIRMATION_CODE);
    }

    if (event.type === 'message_new') {
      const message = event.object.message;
      const userId = message.from_id;
      const text = message.text;

      console.log('Processing message:', text);

      // Отправка в Botpress
      const bpResponse = await axios.post(
        BOTPRESS_URL,
        {
          text: text,
          userId: `vk_${userId}` // Добавьте префикс для уникальности
        },
        {
          headers: {
            Authorization: `Bearer ${BOTPRESS_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Botpress reply:', bpResponse.data);

      // Отправка ответа в ВК
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
    console.error('Global error:', error.response?.data || error.message);
    res.send('ok'); // Всегда возвращаем ok для ВК
  }
});

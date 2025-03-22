// ...

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
            Authorization: `Bearer ${process.env.BOTPRESS_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Отправка ответа в ВК
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

# vk-botpress-proxy

Прокси-сервер между VK Callback API и Botpress Cloud.

## Как работает:
1. Получает входящие сообщения от пользователей VK.
2. Отправляет их в Botpress Cloud через API.
3. Получает ответы от Botpress (через Webhook) и отправляет обратно пользователю VK.

## Развёртывание на Railway / Render

### Переменные окружения (.env):
```
PORT=3000
BOTPRESS_BOT_ID=your-botpress-bot-id
BOTPRESS_API_TOKEN=your-botpress-api-token
VK_GROUP_TOKEN=your-vk-group-token
VK_CONFIRMATION_CODE=your-vk-confirmation-code
```

### Установка и запуск локально:
```
npm install
npm start
```

### Развёртывание на Railway:
1. Импортируйте репозиторий.
2. Railway сам установит зависимости.
3. Укажите переменные окружения.

### Развёртывание на Render:
1. Создайте новый Web Service.
2. Подключите GitHub-репозиторий.
3. Установите:
   - Старт команду: `npm start`
   - Node version: `16+`
4. Добавьте переменные окружения.
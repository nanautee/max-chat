# MAX Чат — тестовое задание «Фронтенд разработчик React»

Пользовательский интерфейс для отправки и получения **текстовых** сообщений в мессенджере
**MAX** через сервис [GREEN-API](https://green-api.com/max). Внешний вид прототипа повторяет
[web.max.ru](https://web.max.ru/).

Приложение работает полностью на клиенте: запросы к `api.green-api.com` уходят напрямую из
браузера, собственный бэкенд не нужен.

---

## Стек

| Слой | Технология |
| --- | --- |
| Фреймворк | React 19 + Next.js 16 (App Router) |
| Язык | TypeScript (strict) |
| Стили | CSS Modules + CSS custom properties, без UI-китов и без Tailwind |
| Состояние | React `useReducer` + подписки на внешний источник (`useSyncExternalStore`) |
| Хранение | `localStorage` (учётные данные, чаты, локальная история) |

Нет внешних зависимостей: `package.json` содержит только `next`, `react`, `react-dom`.

---

## Быстрый старт

Требуется **Node.js 20+** (проверено на 22.x) и npm.

```bash
# 1. установить зависимости
npm install

# 2. запустить dev-сервер
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

Продакшен-сборка:

```bash
npm run build
npm start          # http://localhost:3000
```

Проверки качества:

```bash
npm run lint
npm run typecheck
```

---

## Что нужно от GREEN-API

1. Зарегистрируйтесь в [личном кабинете GREEN-API](https://console.green-api.com) и создайте
   инстанс с каналом **MAX**.
2. Отсканируйте QR-код приложением MAX — состояние инстанса должно стать `authorized`.
3. Скопируйте `idInstance` и `apiTokenInstance` из кабинета.

### Важно: настройки приёма уведомлений

Интерфейс использует технологию **HTTP API**, поэтому у инстанса **не должно** быть заданного
`webhookUrl`, а сами уведомления должны быть включены. Это можно сделать в кабинете
(«Изменить» → нужные переключатели) или одним вызовом:

```
POST https://api.green-api.com/waInstance{idInstance}/setSettings/{apiTokenInstance}

{
  "webhookUrl": "",
  "incomingWebhook": "yes",
  "outgoingWebhook": "yes",
  "stateWebhook": "yes"
}
```

Если `webhookUrl` задан, GREEN-API отвечает на `ReceiveNotification` ошибкой — приложение
покажет об этом понятное сообщение в боковой панели.

---

## Сценарий проверки

1. Открыть сайт → ввести `idInstance` и `apiTokenInstance` → **Подключиться**.
2. Нажать **Новый чат**, ввести номер телефона получателя (например `79991234567`) → **Создать чат**.
   Номер проверяется методом `CheckAccount` и превращается в `chatId` идентификатор MAX.
3. Написать текст и отправить (Enter или кнопка) — сообщение уходит получателю в MAX.
4. Ответить из приложения MAX.
5. Ответ появится в чате автоматически без перезагрузки страницы: справа — ваши сообщения,
   слева — входящие, с временем и статусом доставки/прочтения.

Номер можно вводить в любом формате — `8 999 123-45-67`, `+7 999 123-45-67`, `9991234567`.
Нормализуется до `7…` (11 цифр) или `375…` (12 цифр).

### Если инстанс не авторизован

Пока `stateInstance !== authorized`, вместо чата показывается экран-подсказка со ссылкой на
кабинет. Состояние опрашивается каждые 8 секунд, поэтому после сканирования QR-кода чат
подключится сам.

---

## Используемые методы GREEN-API

| Метод | Назначение | Ссылка |
| --- | --- | --- |
| `getStateInstance` | Проверка учётных данных и статуса инстанса | [docs](https://green-api.com/v3/docs/api/account/GetStateInstance/) |
| `getAccountSettings` | Собственный номер и аватар | [docs](https://green-api.com/v3/docs/api/account/GetAccountSettings/) |
| `checkAccount` | Номер телефона → `chatId` получателя | [docs](https://green-api.com/v3/docs/api/service/CheckAccount/) |
| `sendMessage` | **Отправка** текстового сообщения | [docs](https://green-api.com/v3/docs/api/sending/SendMessage/) |
| `receiveNotification` | **Получение** уведомлений (long polling) | [docs](https://green-api.com/v3/docs/api/receiving/technology-http-api/) |
| `deleteNotification` | Подтверждение обработки уведомления | [docs](https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/) |
| `getAvatar` | Аватар собеседника | [docs](https://green-api.com/v3/docs/api/service/GetAvatar/) |

Обрабатываются типы уведомлений:

* `incomingMessageReceived` — входящее сообщение;
* `outgoingAPIMessageReceived` / `outgoingMessageReceived` — эхо собственных отправок;
* `outgoingMessageStatus` — статусы `delivered`, `read`, `failed`, `noAccount`, `notInGroup`;
* `stateInstanceChanged` — смена состояния инстанса.

Сообщения дедуплицируются по ключу `chatId_idMessage` (в MAX идентификаторы уникальны в пределах
чата), оптимистичное сообщение при отправке связывается с эхом GREEN-API по тексту, поэтому дублей
в ленте не возникает.

---

## Структура проекта

```
src/
├── app/
│   ├── layout.tsx              # метаданные, подключение глобальных стилей
│   ├── page.tsx                # рендер <ChatApp />
│   └── globals.css             # дизайн-токены (палитра MAX), keyframes, reset
├── components/
│   ├── ChatApp.tsx             # оркестратор: авторизация, приём, отправка, чаты
│   ├── AuthScreen.tsx          # ввод idInstance / apiTokenInstance
│   ├── ChatSidebar.tsx         # список чатов, поиск, статус инстанса
│   ├── Conversation.tsx        # шапка чата, лента сообщений, композер
│   ├── MessageBubble.tsx       # пузырь сообщения со временем и статусом
│   ├── Composer.tsx            # поле ввода с автоувеличением и лимитом 4000 символов
│   ├── NewChatDialog.tsx       # создание чата по номеру телефона
│   ├── Avatar.tsx              # аватар с фолбэком на инициалы
│   ├── MaxLogo.tsx             # логотип
│   ├── icons.tsx               # иконки (инлайн SVG)
│   └── *.module.css            # стили компонентов
├── hooks/
│   ├── useChats.ts             # reducer состояния чатов + персистентность
│   └── useNotifications.ts     # цикл ReceiveNotification / DeleteNotification
└── lib/
    ├── greenApi.ts             # HTTP-клиент GREEN-API + разбор ошибок
    ├── types.ts                # типы API и доменной модели
    ├── session.ts              # подписка на учётные данные (useSyncExternalStore)
    ├── storage.ts              # localStorage
    └── format.ts               # телефоны, даты, инициалы
```

---

## Решения и допущения

* **Прямые запросы из браузера.** `api.green-api.com` отдаёт `Access-Control-Allow-Origin: *`,
  поэтому прокси не требуется. Учётные данные вводятся самим пользователем и хранятся только в
  его браузере.
* **HTTP API вместо Webhook Endpoint.** Webhook требует публичного HTTPS-адреса, что невозможно
  для статического хостинга; long polling по `ReceiveNotification` работает везде.
* **Rate limits GREEN-API** соблюдаются: `ReceiveNotification` вызывается не чаще ~0,2/с при
  лимите 100/с, `getStateInstance` и `getAccountSettings` — раз в 8 с при лимите 1/с.
* **Транзиентные ошибки** (429, 502, `instance in starting process`) не рвут цикл: выполняется
  повтор с backoff, в ленте сообщение помечается как неотправленное с текстом ошибки.
* **Отправка только текста**, как и требовалось: кнопки файлов и эмодзи оставлены в композере, но
  отключены.

## Что не входит в объём

Загрузка файлов, медиа, голосовые сообщения, реакции, группы, редактирование и удаление
сообщений, офлайн-очередь, несколько аккаунтов, тёмная тема.

## Безопасность

`idInstance` и `apiTokenInstance` не попадают в исходный код и не отправляются никуда, кроме
`api.green-api.com`. В production-сценарии с общим бэкендом учётные данные следует получать
через OAuth/серверный слой — в рамках тестового задания пользователь вводит их сам.

## Развёртывание

Статический экспорт (`output: 'export'` в `next.config.ts`) или любой хостинг, умеющий запускать
`next start` — Vercel, Railway, Render, VPS. Конфигурация не требует переменных окружения.
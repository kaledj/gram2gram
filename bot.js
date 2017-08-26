const TelegramBot = require('node-telegram-bot-api');
const request = require('request-promise-native');
const load_envvar = require('./env');
const express = require('express');
const db = require('./db');

const HOST = load_envvar('HOST');
const IG_CLIENT_ID = load_envvar('IG_CLIENT_ID');
const IG_CLIENT_SECRET = load_envvar('IG_CLIENT_SECRET');
const IG_REDIRECT_URI= `http://${HOST}:3000/ig-oauth`;
const BOT_TOKEN = load_envvar('BOT_TOKEN');
const OAUTH_URL = `https://api.instagram.com/oauth/authorize/` +
  `?client_id=${IG_CLIENT_ID}` +
  `&redirect_uri=${IG_REDIRECT_URI}` +
  `&response_type=code` +
  `&scope=basic+likes+public_content`;

// const bot = new TelegramBot(BOT_TOKEN, {
//   webHook: {
//     port: 443,
//     key: `${__dirname}/key.pem`,
//     cert: `${__dirname}/server.crt`
//   }
// });

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true
});

bot.router = express.Router();

const authenticate_telegram_user = (user) => bot.sendMessage(user.id,
  `${OAUTH_URL}&state=${user.id}:${user.username}`
);

// bot.setWebHook(`https://${HOST}/bot${BOT_TOKEN}`, {
//   certificate: options.webHook.cert
// });

bot.on('callback_query', async cbq => {
  if (data.type != 'ig_like') return;
  const data = JSON.parse(cbq.data);
  const user = cbq.from;
  const access_token = await db.getAsync(user.id);
  if (!access_token) {
    bot.sendMessage(cbq.message.chat.id,
      `I dont have an Instagram token for ${user.username}. I PMd them an OAuth link.`
    );
    authenticate_telegram_user(user);
    bot.answerCallbackQuery(cbq.id);
  } else {
    const payload = {
      url: `https://api.instagram.com/v1/media/${data.mId}/likes`,
      form: { access_token }
    };
    request.post(payload, (err, response) => {
      if (err) bot.answerCallbackQuery(cbq.id);
      bot.answerCallbackQuery(cbq.id);
      bot.sendMessage(cbq.message.chat.id, `${user.username} smashed the mf like button`);
    });
  }
});

bot.onText(/\/gram2gram (.+)/, async (msg, match) => {
  const command = match[1].trim();
  if (command.trim() === 'update-subs') {
    const payload = {
      url: `https://api.instagram.com/v1/subscriptions/`,
      form: {
        client_id: IG_CLIENT_ID,
        client_secret: IG_CLIENT_SECRET,
        object: `user`,
        aspect: `media`,
        verify_token: `verifyToken`,
        callback_url: `https://${HOST}:3000/ig-events`
      }
    }
    request.post(payload, (err, response) => {
      bot.sendMessage('58767396', response.body);
    });
  }
  if (command === 'auth') {
    authenticate_telegram_user(msg.from);
  }
});

bot.onText(/\/gram2gram/, (msg) =>
  bot.sendMessage(msg.chat.id, `Valid command(s): auth`)
);

bot.on('message', (msg) => {
  console.log('got a message');
  db.putAsync('a', msg);
});

bot.router.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

module.exports = bot;

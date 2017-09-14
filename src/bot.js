const TelegramBot = require('node-telegram-bot-api');
const request = require('request-promise-native');
const load_envvar = require('./env');
const express = require('express');
const db = require('./db');
const _ =  require('lodash');

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

const subscriptions = [];

bot.router = express.Router();

const authenticate_telegram_user = (user) => bot.sendMessage(user.id,
  `${OAUTH_URL}&state=${user.id}:${user.username}`
);

// TODO: these are webhook related things
// bot.setWebHook(`https://${HOST}/bot${BOT_TOKEN}`, {
//   certificate: options.webHook.cert
// });

// bot.router.post(`/bot${BOT_TOKEN}`, (req, res) => {
//   bot.processUpdate(req.body);
//   res.sendStatus(200);
// });

bot.on('callback_query', async cbq => {
  const data = JSON.parse(cbq.data);
  if (data.type != 'ig_like') return;
  const user = cbq.from;
  const ig_user = await db.getAsync(user.id);
  let access_token;
  if (ig_user) {
    access_token = ig_user.access_token;
  }
  if (!access_token) {
    bot.sendMessage(cbq.message.chat.id,
      `I dont have an Instagram token for ${user.username}. I PMd them an OAuth link.`
    );
    authenticate_telegram_user(user)
    .catch(() => bot.sendMessage(
      cbq.message.chat.id,
      `I couldnt message ${user.username}. They probably need to message me first.`
    ));
    bot.answerCallbackQuery(cbq.id);
  } else {
    const payload = {
      url: `https://api.instagram.com/v1/media/${data.mId}/likes?access_token`,
      form: { access_token }
    };
    console.log(payload);
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
  if (command === 'subscribe') {
    subscribe(msg.chat);
  }
  if (command === 'unsubscribe') {
    unsubscribe(msg.chat);
  }
  if (command === 'subscriptions') {
    listSubscriptions(msg.chat);
  }
});

function subscribe(chat) {
  if (!_.find(subscriptions, s => s.id === chat.id)) {
    subscriptions.push({
      name: chat.title || chat.username,
      id: chat.id
    });
    bot.sendMessage(chat.id, `${chat.username || chat.title} (${chat.id}) has been subscribed`);
  } else {
    bot.sendMessage(chat.id, `${chat.username || chat.title} is already subscribed`);
  }
}

function unsubscribe(chat) {
  if (_.find(subscriptions, s => s.id === chat.id)) {
    _.remove(subscriptions, subscription => subscription.id === chat.id);
    if (!_.find(subscriptions, s => s.id === chat.id)) {
      bot.sendMessage(chat.id, `${chat.username || chat.title} (${chat.id}) has been unsubscribed`);
    }
  } else {
    bot.sendMessage(chat.id, `${chat.username || chat.title} (${chat.id}) was not found. Cannot unsubscribe`);
  }
}

function listSubscriptions(chat) {
  const subs = _.join(
    _.map(subscriptions, s => `${s.name} (${s.id})`),
    '\n'
  );
  if(subs) {
    bot.sendMessage(chat.id, subs);
  } else {
    bot.sendMessage(chat.id, `No subscriptions found`);
  }
}

bot.onText(/\/gram2gram$/, (msg) => {
  bot.sendMessage(msg.chat.id, `Usage: /gram2gram <command>`);
  bot.sendMessage(msg.chat.id, `Valid command(s): auth, subscribe, unsubscribe, subscriptions`);
});

bot.on('message', (msg) => {
  console.log(`Message [from/in] ${msg.chat.username || msg.chat.title} (${msg.chat.id})`);
});

bot.sendMessageToSubscribers = (message, options) => {
  const msgOptions = options || {};
  _.forEach(subscriptions, s=> {
    bot.sendMessage(s.id, message, msgOptions);
  });
};

module.exports = bot;

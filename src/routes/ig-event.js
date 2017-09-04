const express = require('express');
const bot = require('../bot');
const bodyParser =  require('body-parser');
const request = require('request');
const _ = require('lodash');
const db = require('../db');

const router = express.Router();

router.use(bodyParser.json());

router.get('/', (req, res) => res.send(req.query["hub.challenge"]));

router.post('/', async (req, res, next) => {
  console.log(JSON.stringify(req.body));
  const body = req.body[0];
  const media_id = body.data.media_id;
  const object_id = body.object_id;
  const ig_user = await db.getAsync(object_id);
  if (!ig_user) {
    return bot.sendMessageToSubscribers(
      `Someone posted to IG, but I cant get it because I don't have a token. Use \`/gram2gram auth\` to authenticate.`,
      { parse_mode: 'Markdown' }
    );
  }
  const access_token = ig_user.access_token;
  const api = `https://api.instagram.com/v1/media/${media_id}?access_token=${access_token}`;
  console.log(api);
  request.get(api, (err, response) => {
    if (err) next(err, req);
    console.log(response.body);
    const body = JSON.parse(response.body);
    const message = `New gram from ${ig_user.username}: ${body.data.link}`;
    const options = {
      reply_markup: JSON.stringify({
        inline_keyboard: [[
          {
            text: '\u2764',
            callback_data: JSON.stringify({type: 'ig_like', mId: media_id})
          }
        ]]
      })
    };
    bot.sendMessageToSubscribers(message, options);
  });
});

router.use((err, req, res, next) => {
  console.log("Enter: ig-event error middleware");
  if (req) {
    bot.sendMessageToSubscribers(
      `[ig-event]: I broke trying to handle ${req.method} ${req.path}.` +
      `Send help or ill page you \u1F525. ${err.message}`);
  } else {
    bot.sendMessageToSubscribers(
      `[ig-event]: I broke trying to handle an Event (probably 'callback_query').` +
      `Send help or ill page you \u1F525. ${err.message}`);
  }
  res.sendStatus(500);
});

module.exports = router;

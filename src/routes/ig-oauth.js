const request = require('request');
const express = require('express');
const load_envvar = require('../env');
const bot = require('../bot');
const db = require('../db');

const HOST = load_envvar('HOST');
const IG_CLIENT_ID = load_envvar('IG_CLIENT_ID');
const IG_CLIENT_SECRET = load_envvar('IG_CLIENT_SECRET');
const IG_REDIRECT_URI= `http://${HOST}:3000/ig-oauth`;

const router = express.Router();

router.get('/', (req, res) => {
  const telegram_id = req.query.uid;
  const payload = {
    url: 'https://api.instagram.com/oauth/access_token',
    form: {
      client_id: IG_CLIENT_ID,
      client_secret: IG_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: IG_REDIRECT_URI,
      code: req.query.code
    }
  };
  request.post(payload, (err, response) => {
    if (err) res.send('<p>OAuth did not work. :-(</p>');
    const body = JSON.parse(response.body);
    const access_token = body.access_token;
    const username = body.user.username;
    const ig_id = body.user.id;
    if (username && access_token && ig_id) {
      db.putAsync(telegram_id, { username, access_token });
      db.putAsync(ig_id, { username, access_token });
      bot.sendMessageToSubscribers(`Authenticated ${username} (IG: ${ig_id}, TG: ${telegram_id})`);
    }
    res.send('<p>OAuth might have worked! :-)</p>');
  });
});

router.use((err, req, res, next) => {
  console.log("Enter: ig-oauth error middleware");
  if (req) {
    bot.sendMessageToSubscribers(
      `[ig-oauth]: I broke trying to handle ${req.method} ${req.path}.` +
      `Send help or ill page you \u1F525. ${err.message}`);
  }
  res.sendStatus(500);
});

module.exports = router;

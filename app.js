const server = require('./server');
const bot = require('./bot');
const load_envvar = require('./env');

const PORT = load_envvar('PORT');
const HOST = load_envvar('HOST');

// Register default error handler
server.use((err, req, res, next) => {
  bot.sendMessage(CHAT_ID, `Something did not go so well my dudes.`);
});

server.listen(PORT, HOST);

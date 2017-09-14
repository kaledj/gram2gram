const server = require('./server');
const bot = require('./bot');
const load_envvar = require('./env');

const PORT = process.env.PORT || 8080;

// Register default error handler
server.use((err, req, res, next) => {
  bot.sendMessageToSubscribers(`Something did not go so well my dudes.`);
});

server.listen(PORT, () => console.log(`Server started. Listening on ${PORT}`));

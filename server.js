const express = require('express');

const server = express();

server.use('ig-event', require('./routes/ig-event'));
server.use('ig-oauth', require('./routes/ig-oauth'));

server.use(require('./bot').router);

module.exports = server;

const level = require('level');

const db = level('/leveldb', {
  valueEncoding: 'json'
});

db.getAsync = async (key) => new Promise((resolve, reject) => {
  db.get(key, (err, value) => resolve(value))
});

db.putAsync = async (key, value) => new Promise((resolve, reject) => {
  db.put(key, value, (err) => resolve())
});

module.exports = db;

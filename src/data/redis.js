const bluebird = require('bluebird');
const redis = require('redis');

const config = require('../config');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(config.redis.url);

client.on('ready', () => {
  console.log(`Redis connected`);
});

client.on('connect', () => {
  console.log(`Redis connecting...`);
});

client.on('reconnect', () => {
 console.log('Redis reconnecting...');
});

client.on('error', (error) => {
  console.log(`Redis error: ${error}`);
});

client.AddEvent = (event, func) => {
  client.on(event, func);
};

module.exports = client;

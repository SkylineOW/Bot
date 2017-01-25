const bluebird = require('bluebird');
const redis = require('redis');

const config = require('../config');

// Swap out default promise library for something better.
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(config.redis.url);

// ToDo: Create neat notification messages using chalk.
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

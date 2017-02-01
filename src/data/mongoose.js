/**
 * This module is primarily for managing mongoose and all the models associated with it.
 */

const bluebird = require('bluebird');
const mongoose = require('mongoose');

const config = require('../config');

//Models for mongoose
// ToDo: Create a model auto-loader to pull in everything in the models folder.
require('./models/raffles');
require('./models/guilds');
require('./models/users');

// ToDo: Create neat notification messages using chalk.
mongoose.connection.on("connecting", () => {
  console.log("db connecting...");
  mongoose.state = 'connecting';
});

mongoose.connection.on("error", (error) => {
  console.log("db error: " + error);
  mongoose.state = 'disconnected';
});

mongoose.connection.on("connected", () => {
  console.log("db connected");
  mongoose.state = 'connected';
});

mongoose.connection.on("open", () => {
  console.log("db open");
  mongoose.state = 'open';
});

mongoose.connection.on("reconnected", () => {
  console.log("db reconnected");
  mongoose.state = 'connected'
});

mongoose.connection.on("disconnected", () => {
  console.log("db disconnected");
  mongoose.state = 'disconnected';
});

mongoose.AddConnectionEvent = (event, func) => {
  mongoose.connection.on(event, func);
};

process.on(`SIGINT`, () => {
  mongoose.connection.close(() => {
    console.log('Mongoose connection closing due to app termination.');
  })
})

// Swap out default promise library for something better.
mongoose.Promise = bluebird;

// Database connection via mongoose
mongoose.connect(config.mongoose.database_url);

module.exports = mongoose;

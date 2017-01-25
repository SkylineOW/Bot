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
});

mongoose.connection.on("error", (error) => {
  console.log("db error: " + error);
});

mongoose.connection.on("connected", () => {
  console.log("db connected");
});

mongoose.connection.on("open", () => {
  console.log("db open");
});

mongoose.connection.on("reconnected", () => {
  console.log("db reconnected");
});

mongoose.connection.on("disconnected", () => {
  console.log("db disconnected");
});

mongoose.AddConnectionEvent = (event, func) => {
  mongoose.connection.on(event, func);
};

// Swap out default promise library for something better.
mongoose.Promise = bluebird;

// Database connection via mongoose
mongoose.connect(config.mongoose.database_url);

module.exports = mongoose;

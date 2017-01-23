/**
 * This module is primarily for managing mongoose and all the models associated with it.
 */

const bluebird = require('bluebird');
const mongoose = require('mongoose');

const config = require('../config');

//Models for mongoose
mongoose.models.Answer = require('./models/answers');
mongoose.models.Broadcast = require('./models/broadcasts.js');
mongoose.models.Log = require('./models/logs');
mongoose.models.Raffle = require('./models/raffles');
mongoose.models.Profile = require('./models/profiles');
mongoose.models.Question = require('./models/questions');
mongoose.models.Guild = require('./models/guilds');
mongoose.models.Task = require('./models/tasks');
mongoose.models.User = require('./models/users');

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
  mongoose.models.Log.create({type: 'db_startup', value: 'Success'}, (error) => {
    if (error) {
      console.log(`Error: ${error}`);
    }
    console.log("db open");
  });
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

//Database connection via mongoose
mongoose.Promise = bluebird;
mongoose.connect(config.mongoose.database_url);

module.exports = mongoose;

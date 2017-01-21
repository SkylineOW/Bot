// url to use for adding bots.
// https://discordapp.com/oauth2/authorize?client_id=272307763898482689&scope=bot&permissions=519239

// Discord text markup
// italics = *italics*
// bold  = **bold**
// bold italics = ***bold italics***
// strikeout = ~~strikeout~~
// underline = __underline__
// underline italics = __*underline italics*__
// underline bold = __**underline bold**__
// underline bold italics = __***underline bold italics***__
// https://support.discordapp.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline-

const Eris = require('eris');


const config = require('config');
const mongoose = require('data/mongoose');

const twitch = require('interfaces/twitch');

// Database ORM's
const Guild = require('data/mongoose').models.Guild;
const Profile = require('data/mongoose').models.Profile;
const User = require('data/mongoose').models.User;
const Task = require('data/mongoose').models.Task;

const bot = new Eris.CommandClient(config.discord.token, {}, {
  description: 'A helpful omnic to help lighten the load of mods.',
  author: 'Ocky',
  prefix: config.prefix,
});

const HandleError = (error, response) => {
  console.log(`Error: ${error}`);
  response.edit(`Something went wrong, please try again.`);
};

// Event handling for the bot.
bot.on('ready', () => {
  console.log(`Ready! Guilds: ${bot.guilds.size}`);
});

// Register command groups
require('commands/raffle').RegisterCommand(bot);

// Connect bot to discord.
bot.connect();

module.exports = bot;

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
const fs = require('fs');
const path = require('path');

const config = require('./config');

//Initialize db connection.
require('data/mongoose');

const bot = new Eris.CommandClient(config.discord.token, {}, {
  description: 'A helpful omnic to help lighten the load of mods.',
  author: 'Ocky and omni5cience',
  prefix: config.prefix,
});

// Event handling for the bot.
bot.on('ready', () => {
  console.log(`Ready! Guilds: ${bot.guilds.size}`);
});

//Needs to happen before commands are registered since some of them rely on this file.
module.exports = bot;

// Helper function for registering commands.
const registerCommand = async (parent, dir, file, name) => {
  try {
    const stat = fs.statSync(path.join(dir, file));

    if (stat.isDirectory()) {
      //Register the index.js in the folder first.
      const cmd = await registerCommand(parent, path.join(dir, file), 'index.js', file);

      //Remove index from the list
      let subcmds = fs.readdirSync(path.join(dir, file));
      subcmds = subcmds.filter((value) => {
        return value != 'index.js'
      });

      await Promise.all(subcmds.map((subcmd) => {
        return new Promise(async (resolve) => {
          await registerCommand(cmd, path.join(dir, file), subcmd, subcmd.slice(0, -3));
          resolve();
        });
      }));

      return cmd;
    }

    // Fetch the command data.
    const data = require(path.join(dir, file));

    if (parent === bot) {
      return await parent.registerCommand(name, data.exec, data.options);
    }

    return await parent.registerSubcommand(name, data.exec, data.options);
  }
  catch (error) {
    console.log(`${path.join(dir, file)} could not be loaded:\n${error.stack}`);
  }
};

// Auto-load all the commands from commands directory.
const root = path.resolve(`${__dirname}/commands/`);
const files = fs.readdirSync(root);

Promise.all(files.map((file) => {
  return new Promise(async (resolve) => {
    await registerCommand(bot, root, file, file.slice(0, -3));
    resolve();
  });
})).then(() => {
  // Connect bot to discord.
  bot.connect();
}).catch((error) => {
  console.log(error.stack);
});

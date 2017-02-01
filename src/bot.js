// url to use for adding bots.
// Production:
// https://discordapp.com/oauth2/authorize?client_id=272307763898482689&scope=bot&permissions=519239
// Development
// https://discordapp.com/oauth2/authorize?client_id=265529528124833802&scope=bot&permissions=519239

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

// embed: {
//     title: 'This is a title',
//     description: 'This is a description',
//     url: 'https://google.com',
//     color: 6897122,
//   footer: {
//     text: 'Footer text',
//       icon_url: 'https://hydra-media.cursecdn.com/overwatch.gamepedia.com/5/5e/Ability-zenyatta4.png?version=1a445e05537ef0ca20a4d26ce2fecf6b',
//   },
//   image: {
//     url: 'https://hydra-media.cursecdn.com/overwatch.gamepedia.com/9/92/Zenyatta-portrait.png?version=cdf1df79c396c31f1b1001caa2a9180d',
//       proxy_url: 'https://github.com',
//       height: 400,
//   },
//   thumbnail: {
//     url: 'https://hydra-media.cursecdn.com/overwatch.gamepedia.com/9/92/Zenyatta-portrait.png?version=cdf1df79c396c31f1b1001caa2a9180d',
//       proxy_url: 'https://github.com',
//       height: 400,
//   },
//   author: {
//     name: 'Author',
//       url: 'https://google.com',
//       icon_url: 'https://hydra-media.cursecdn.com/overwatch.gamepedia.com/d/d6/Spray_Zenyatta_Cute.png?version=63dd0fed2469f5bab66bc2e465e6fbc1'
//   },
//   fields: [
//     {
//       name: 'Field name',
//       value: 'Field value',
//       inline: true
//     },
//     {
//       name: 'Field name',
//       value: 'Field value',
//       inline: true
//     },
//     {
//       name: 'Field name',
//       value: 'Field value',
//       inline: true,
//     }
//   ],
// }

const async = require('async');
const chalk = require('chalk');
const Eris = require('eris');
const fs = require('fs');
const path = require('path');
const pe = require('utils/error');

const redis = require('data/redis');

const config = require('./config');

//Initialize db connection.
const mongoose = require('data/mongoose');

const bot = new Eris.CommandClient(config.discord.token, {}, {
  defaultHelpCommand: true,
  name: 'Zenbot',
  description: 'A helpful omnic to help lighten the load of mods.',
  owner: 'Ocky and omni5cience',
  prefix: config.prefix,
  defaultCommandOptions: {
    requirements: {
      userIDs: [],
      permissions: {
        'sendMessages': true,
      },
      roleIDs: [],
      roleNames: []
    },
  }
});

// Event handling for the bot.
bot.on('ready', () => {

  // Start an interval for starting monitoring tasks for various guilds.
  const startMonitoring = async () => {
    // Only start this if we have storage connections.
    try {

      if (redis.state === 'connected' && mongoose.state === 'open') {
        await async.each(bot.guilds.map((guild) => {
          return guild;
        }), async (guild) => {
          // Fetch the status of the guild's raffle and the lock for it.
          const response = await redis.multi()
            .get(`Raffle:${guild.id}:state`)
            .ttl(`Raffle:${guild.id}:lock`)
            .execAsync();

          const status = response[0];
          const guildTime = response[1];

          const raffle = require('utils/raffle');

          switch (status) {
            case raffle.state.started:
            case raffle.state.inProgress:
            case raffle.state.closed:
              if (guildTime <= 0) {
                // Create a random number as a value to use in the lock.
                const id = Math.random() * Date.now().valueOf();
                await raffle.startMonitor(guild.id, id);
              }
              break;
            default:
              break;
          }
        });
      }
    }
    catch(error) {
      console.log(pe.render(error));
    }

    setTimeout(startMonitoring, 10000);
  };

  setTimeout(startMonitoring, 3000);
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
      const command = await parent.registerCommand(name, data.exec, data.options);
      console.log(chalk.white(`%s %s from %s has been loaded`), chalk.green('[Command]'), name, path.join(dir, file));
      return command;
    }

    const command = await parent.registerSubcommand(name, data.exec, data.options);
    console.log(chalk.white(`%s %s from %s has been loaded`), chalk.green('[Command]'), name, path.join(dir, file));
    return command;
  }
  catch (error) {
    console.log(`${path.join(dir, file)} could not be loaded:\n` + pe.render(error));
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
  console.log(pe.render(error));
});

/**
 * General flow of raffle:
 *
 * - start (TIME): starts a raffle.
 *  - admin that starts raffle will receive dm with battle tags.
 *  - TIME: amount of minutes to keep the raffle open.
 *
 * - enter: user enters the raffle.
 *  - get the user id.
 *  - add the id to the list or entries.
 *
 * - close: stop accepting entries
 *  - run a timer counting down to the end of raffle.
 *  - set the raffle status to closed.
 *
 *  - open (TIME): reopen the raffle if closed, allowing people to enter again.
 *   - TIME: amount of minutes to open the raffle for.
 *
 *  - finish: end the raffle completely.
 *   - everything is cleaned up and made ready for a new raffle.
 *
 * - pick: allow managers to pick a person by discord name and force the bot to draw them.
 * - draw (CONFIG): draw based on the requested config.
 *  - teams:
 *   - draw one person at a time and alternate them into teams.
 *   - draw a total of 12 people, resulting in 2 teams of 6.
 *   - give them X amount of time to reply to the bot with their battle tag.
 *   - TODO: Users with claimed profiles do not need replay as their will be fetched.
 *   - if time expires on a person, draw an new individual until 12 replied.
 *
 * - add: add the channel to the list where announcements should appear
 * - remove: remove the channel from the list where announcements should appear
 *
 * - manage: join the list of managers.
 * - unmanage: leave the list of managers.
 */

// embed: {
//   title: 'This is a title',
//     description: 'This is a description',
//     url: 'https://google.com',
//     color: 6897122,
//     footer: {
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

const interval = require('redis-setinterval');

const Redis = require('data/redis');
const moment = require('moment');

const status = require('./status');

const label = `raffle`;
const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `A raffle for drawing teams or individuals from a group of people.`,
  fullDescription: `Adding no subcommand will return the status of the raffle (if one is active)`,
  usage: `\`subcommand\``,
  requirements: {
    userIDs: [],
    permissions: {},
    roleIDs: [],
    roleNames: []
  },
  cooldown: 1000,
  cooldownMessage: `cooldown`,
  permissionMessage: `permissions`,
};

module.exports = {
  RegisterCommand: (bot) => {
    const command = bot.registerCommand(label, async(msg, args) => {
      //Input validation
      if (args.length > 0) {
        return `Invalid usage. Do \`!help raffle\` to view proper usage.`;
      }

      let raffle = await Redis.multi()
        .get(`Raffle:${msg.guild.id}:status`)
        .scard(`Raffle:${msg.guild.id}:entries`)
        .ttl(`Raffle:${msg.guild.id}:timeout`)
        .execAsync();

      //Helper function for controlling output message
      const createStatus = async(raffle) => {
        const fields = [
          {
            name: '❯ Status',
            value: raffle[0],
            inline: true,
          },
          {
            name: '❯ Entries',
            value: raffle[1],
            inline: true,
          }
        ];

        if (raffle[0] === status.inProgress) {
          fields.push({
            name: '❯ Time remaining',
            value: determineTime(raffle[2]),
            inline: true,
          });
        }

        return await msg.channel.createMessage({
          embed: {
            color: 6897122,
            author: {
              name: `Raffle`,
            },
            fields: fields
          }
        });
      };

      //Helper function to handle time conversion
      const determineTime = (seconds) => {
        switch (seconds) {
          case 0:
          case -1:
          case -2:
            return 'Indefinite';
          default:
            return moment().startOf('day').seconds(seconds).format('HH:mm:ss');
        }
      };

      switch (raffle[0]) {
        case status.inProgress:
        case status.closed:
          await createStatus(raffle);
          break;
        default:
          return `A raffle is not running at this moment.`;
      }

    }, options);

    // Register subcommands
    require('./start').RegisterCommand(bot, command);
    require('./enter').RegisterCommand(bot, command);
    require('./close').RegisterCommand(bot, command);
    require('./open').RegisterCommand(bot, command);
    require('./finish').RegisterCommand(bot, command);

    // Channel control
    require('./add').RegisterCommand(bot, command);
    require('./remove').RegisterCommand(bot, command);

    // Mod control
    require('./manage').RegisterCommand(bot, command);
    require('./unmanage').RegisterCommand(bot, command);
  }
};
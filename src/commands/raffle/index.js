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
 *   - draw according to input (12, 6v6, 4v4, ect.)
 *   - give them X amount of time to reply to the bot with their battle tag.
 *   - TODO: Users with claimed profiles do not need reply as their battle tag will be fetched.
 *   - if time expires on a person, draw an new individual until 12 replied.
 *
 * - add: add the channel to the list where announcements should appear.
 * - remove: remove the channel from the list where announcements should appear.
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

const pe = require('utils/error');

const Raffle = require('utils/raffle');
const Guild = require('utils/guild');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: false,
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
  exec: async (msg, args) => {
    // Input validation
    if (args.length > 0) {
      return `Invalid usage. Do \`!help raffle\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.info(guildId, msg.channel);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

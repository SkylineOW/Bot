/**
 * Command for leaving manager list
 */

const async = require('async');
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
  description: `Leave the list to receive raffle results or mention people to remove them.`,
  fullDescription: ``,
  usage: `mention mention ...`,
  requirements: {
    userIDs: [],
    permissions: {},
    roleIDs: [],
    roleNames: []
  },
  cooldown: 1000,
  cooldownMessage: 'cooldown',
  permissionMessage: 'permissions'
};

const checkInput = (value) => {
  // Only custom mentions format is allowed.
  return value.match(/^<@\d*>$/) === null;
};

module.exports = {
  exec: async (msg, args) => {
    let users = [];

    // Input validation
    if (args.length > 0) {
      for (let i = 0; i < args.length; i++) {
        if (checkInput(args[i])) {
          return `Only mentions are allowed as inputs for this command. For more info use \`!help raffle manage\``;
        }
      }

      await async.each(msg.mentions, (mention) => {
        users.push(mention);
      });
    } else {
      users.push(msg.author);
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.removeManagers(guildId, users);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options,
};

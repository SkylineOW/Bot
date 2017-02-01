/**
 * Command for joining manager list
 */

const async = require('async');
const pe = require('utils/error');

const config = require('config');

const Raffle = require('utils/raffle');
const Guild = require('utils/guild');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true, // Cannot mention people in dm's with the bot since the bot doesn't accept friend requests.
  dmOnly: false,
  description: `Add mentioned user to the list of raffle managers.`,
  fullDescription: `\n**What:**\nAdd mentioned users to the list of raffle managers (You can mention yourself as well to add yourself).\nTo only add yourself, don't mention anyone.\n` +
  `\n**Inputs:**\n **mentions** - None or a list of mentioned people separated by spaces.\nOther inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone that has the permission to manage channels can use this command.\n` +
  `\n**Examples:** \`${config.prefix}raffle manage\` \`${config.prefix}raffle manage @John#1234 @Mary#0001\``,
  usage: '\`mentions\`',
  requirements: {
    userIDs: [],
    permissions: {
      'manageChannels': true,
    },
    roleIDs: [],
    roleNames: [],
  },
  cooldown: 1000,
  cooldownMessage: 'Move too quickly, and you overlook much.',
  permissionMessage: 'Command cannot be used here or you do not have sufficient permissions.'
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
        return await Raffle.addManagers(guildId, users);
      }, options);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

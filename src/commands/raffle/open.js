/**
 * Command for re-opening the raffle to allow additional entries
 */

const pe = require('utils/error');

const config = require('config');

const Guild = require('utils/guild');
const Raffle = require('utils/raffle');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: false,
  dmOnly: false,
  description: `Reopen the raffle to allow more entries`,
  fullDescription: `\n**What:**\nReopens the raffle for the specified number of minutes. If no time is specified, the raffle stays open indefinitely.\n` +
  `\n**Inputs:**\n **time** - None or number of minutes the raffle will stay open.\nOther inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone that has the permission to manage channels can use this command.\n` +
  `\n**Examples:** \`${config.prefix}raffle open\` \`${config.prefix}raffle open 10\``,
  usage: `\`time\``,
  requirements: {
    userIDs: [],
    permissions: {
      'manageChannels': true,
    },
    roleIDs: [],
    roleNames: []
  },
  cooldown: 1000,
  cooldownMessage: 'Move too quickly, and you overlook much.',
  permissionMessage: 'Command cannot be used here or you do not have sufficient permissions.'
};

const checkInput = (value) => {
  // Only positive numbers, 0 not allowed, 0x.. not allowed, decimals not allowed, strings not allowed.
  return value.match(/^([+]?[1-9]\d*)$/) === null;
};

module.exports = {
  exec: async (msg, args) => {
    if (args[0] && checkInput(args[0])) {
      return `Invalid usage. Do \`!help raffle open\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.open(guildId, args[0]);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

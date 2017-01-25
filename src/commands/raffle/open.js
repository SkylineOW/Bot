/**
 * Command for re-opening the raffle to allow additional entries
 */

const pe = require('utils/error');

const Guild = require('utils/guild');
const Raffle = require('utils/raffle');
const User = require('utils/user');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: false,
  dmOnly: false,
  description: `Reopen a closed raffle to allow more entries`,
  fullDescription: ``,
  usage: `\`mins\``,
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

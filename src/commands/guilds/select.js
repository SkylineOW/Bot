/**
 * Command for selecting a guild dm commands should be issued for.
 */

const pe = require('utils/error');

const Guild = require('utils/guild');
const User = require('utils/user');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: true, // Guild number is required.
  guildOnly: false,
  dmOnly: true, // Dm only since this is irrelevant when using commands in a guild.
  description: `Select a guild which all dm commands will be issued for.`,
  fullDescription: '', //ToDo: Fill in a proper description of the command.
  usage: '\`number\`',
  requirements: {
    userIDs: [],
    permissions: {},
    roleIDs: [],
    roleNames: [],
  },
  cooldown: 1000,
  cooldownMessage: 'cooldown',
  permissionMessage: 'permissions',
};

const checkInput = (value) => {
  // Only positive numbers, 0 not allowed, 0x.. not allowed, decimals not allowed, strings not allowed.
  return value.match(/^([+]?[1-9]\d*)$/) === null;
};

module.exports = {
  exec: async (msg, args) => {
    // Only 1 argument and it should be an acceptable value.
    if (args.length > 1 || checkInput(args[0])) {
      return `Invalid usage. Do \`!help guilds select\` to view proper usage.`;
    }

    try {
      return await Guild.select(msg, args[0]);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

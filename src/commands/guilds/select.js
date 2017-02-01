/**
 * Command for selecting a guild dm commands should be issued for.
 */

const pe = require('utils/error');

const config = require('config');

const Guild = require('utils/guild');
const User = require('utils/user');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: true, // Guild number is required.
  guildOnly: false,
  dmOnly: true, // Dm only since this is irrelevant when using commands in a guild.
  description: `Select a guild which all dm commands will be used for.`,
  fullDescription: `\n**What:**\nCommand for selecting a guild for direct message in case you belong to more than one guild.\n` +
  `\n**Inputs:**\n **number** - Number of the guild to choose from the list.\nOther inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone can use this command.\n` +
  `\n**Example:** \`${config.prefix}guilds select 2\``,
  usage: '\`number\`',
  requirements: {
    userIDs: [],
    permissions: {},
    roleIDs: [],
    roleNames: [],
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

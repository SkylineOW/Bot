/**
 * Command for retrieving a list of guilds the bot and user has in common.
 */

const pe = require('utils/error');

const config = require('config');

const Guild = require('utils/guild');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: false,
  dmOnly: true, // Dm only since this shows private information about user roles.
  description: `Fetch a list of all the guilds you and the bot share.`,
  fullDescription: '\n**What:**\nCreates a list of guilds you and the bot have in common.\n' +
  `\n**Inputs:**\n **subcommand** - One or none of the subcommands listed below.\n\nOther inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone can use this command.\n` +
  `\n**Example:** \`${config.prefix}guilds\``,
  usage: '\`subcommand\`',
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

module.exports = {
  exec: async (msg, args) => {
    if (args.length > 0) {
      return `Invalid usage. Do \`!help guilds\` to view proper usage.`;
    }

    try {
      return await Guild.info(msg);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

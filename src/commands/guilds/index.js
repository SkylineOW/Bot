/**
 * Command for retrieving a list of guilds the bot and user has in common.
 */

const pe = require('utils/error');

const Guild = require('utils/guild');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: false,
  dmOnly: true, // Dm only since this shows private information about user roles.
  description: `Fetch a list of all the guilds you and the bot share.`,
  fullDescription: '', //ToDo: Fill in a proper description of the command.
  usage: '',
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

/**
 * Command for closing a running raffle, preventing additional entries
 */
const pe = require('utils/error');

const Guild = require('utils/guild');
const Raffle = require('utils/raffle');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: false,
  dmOnly: false,
  description: `Closes a running raffle to prevent addition entries.`,
  fullDescription: ``,
  usage: ``,
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

module.exports = {
  exec: async (msg, args) => {
    //Input validation
    if (args.length > 0) {
      return `Invalid usage. Do \`!help raffle close\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.close(guildId);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

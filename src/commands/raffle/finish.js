/**
 * Command that concludes a raffle and cleans everything up for a new raffle to start
 */

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
  description: `Conclude a raffle, cleaning up entries and results.`,
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
    // Input validation
    if (args.length > 0) {
      return `Invalid usage. Do \`!help raffle finish\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.finish(guildId);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

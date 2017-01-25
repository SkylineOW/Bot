/**
 * Command for entering into a running raffle
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
  description: `Enter an ongoing raffle.`,
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
      return `Invalid usage. Do \`!help raffle enter\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.enter(guildId, msg.author);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

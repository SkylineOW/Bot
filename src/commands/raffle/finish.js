/**
 * Command that concludes a raffle and cleans everything up for a new raffle to start
 */

const pe = require('utils/error');

const config = require('config');

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
  fullDescription: `\n**What:**\nCommand for ending a raffle completely, cleaning up everything.\n` +
  `\n**Inputs:**\nNo inputs. Adding inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone that has the permission to manage channels can use this command.\n` +
  `\n**Example:** \`${config.prefix}raffle finish\``,
  usage: ``,
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

module.exports = {
  exec: async (msg, args) => {
    // Input validation
    if (args.length > 0) {
      return `Invalid usage. Do \`!help raffle finish\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.finish(guildId);
      }, options);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

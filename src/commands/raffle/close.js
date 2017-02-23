/**
 * Command for closing a running raffle, preventing additional entries
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
  description: `Closes a running raffle to prevent addition entries.`,
  fullDescription: `\n**What:**\nCommand the closes the raffle, preventing additional entries.\n` +
  `\n**Inputs:**\nNo inputs. Adding inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone that has the permission to manage channels can use this command.\n` +
  `\n**Example:** \`${config.prefix}close\``,
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
    //Input validation
    if (args.length > 0) {
      return `Invalid usage. Do \`!help raffle close\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.close(guildId);
      }, options);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

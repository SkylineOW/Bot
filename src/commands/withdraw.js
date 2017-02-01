/**
 * Command for withdrawing from a raffle manually
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
  dmOnly: true, // Command is intended for private communication with the bot.
  description: `Withdraw from the raffle.`,
  fullDescription: `\n**What:**\nCommand to withdraw from a raffle you have been chosen in.\n` +
  `\n**Inputs:**\nNo inputs. Adding inputs will result in the command being rejected.\n` +
  `\n**Who:**\nThis command is only available to raffle entrants that have been selected to participate.\n` +
  `\n**Example:** \`${config.prefix}withdraw\``,
  usage: '',
  requirements: {
    userIDs: [],
    permissions: {},
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
      return `Invalid usage. Do \`!help withdraw\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.withdraw(guildId, msg.author.id);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options,
};

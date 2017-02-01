/**
 * Command for fetching the state of the raffle
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
  description: `Raffle related commands.`,
  fullDescription: `\n**What:**\nCommand to get the current state of the raffle.\n` +
  `\n**Inputs:**\n **subcommand** - One or none of the subcommands listed below.\nOther inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone that has the permission to manage channels can use this command.\n` +
  `\n**Examples:** \`${config.prefix}raffle\``,
  usage: `\`subcommand\``,
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
      return `Invalid usage. Do \`!help raffle\` to view proper usage.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.info(guildId, msg.channel);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

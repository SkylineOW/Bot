/**
 * Command for adding the raffle outputs to the channel this is typed in
 */
const pe = require('utils/error');

const config = require('config');

const Raffle = require('utils/raffle');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true, // This can only happen in guilds. Users add themselves as managers to receive results.
  dmOnly: false,
  description: `Add the channel to the list the raffle should announce in.`,
  fullDescription: `\n**What:**\nAdd the channel this command is used in to the list of channels the raffle uses to broadcast results.\n` +
  `\n**Inputs:**\nNo inputs. Adding inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone that has the permission to manage channels can use this command.\n` +
  `\n**Example:** \`${config.prefix}raffle add\``,
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
      return `Invalid usage. Do \`!help raffle add\` to view proper usage.`;
    }

    try {
      return await Raffle.addChannel(msg.channel);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options
};

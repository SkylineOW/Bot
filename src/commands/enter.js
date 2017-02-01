/**
 * Command for entering into a running raffle
 */
const pe = require('utils/error');

const config = require('config');

const Guild = require('utils/guild');
const Raffle = require('utils/raffle');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: true, // Delete this command to keep channels tidy.
  argsRequired: false,
  guildOnly: false,
  dmOnly: false, // Command can be used anywhere, but will output confirmation in raffle channels.
  description: `Enter an ongoing raffle.`,
  fullDescription: `\n**What:**\nIf you would like enter the raffle, use this command.\n` +
  `\n**Inputs:**\nNo inputs. Adding inputs will result in the command being rejected.\n` +
  `\n**Who:**\nThis command is only valid when a raffle is ongoing and accepting entries.\n` +
  `\n**Example:** \`${config.prefix}enter\``,
  usage: ``,
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

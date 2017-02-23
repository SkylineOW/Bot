/**
 * Command for indicating you have an issue and want to talk to a manager.
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
  dmOnly: true, // Command is intended for provate communication with the bot
  description: `Inform the raffle managers that something is wrong with a message describing the issue.`,
  fullDescription: `\n**What:**\nIf you have some sort of issue with confirming to join a raffle, you can use this command to get in contact with a raffle manager. ` +
  `They will then assist you in solving any problems you have.\n` +
  `\n**Inputs:**\n **message** - The message you would like managers to see.\n` +
  `\n**Who:**\nThis command is only available to raffle entrants that have been selected to participate.\n` +
  `\n**Example:** \`${config.prefix}issue I can't play right now and would like to give my spot to a friend.\``,
  usage: `\`message\``,
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
    if (args.length <= 0) {
      return `Please add a message with the command describing the problem you are having.`;
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.issue(guildId, msg.author.id, args.join(' '));
      }, options);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options,
};

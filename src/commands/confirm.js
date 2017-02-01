/**
 * Command for confirming participation in raffle.
 */

const pe = require('utils/error');

const config = require('config');

const Guild = require('utils/guild');
const Raffle = require('utils/raffle');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: true,
  guildOnly: false,
  dmOnly: true, // DM only to allow for people to keep their battletags secret if they so desire.
  description: `Confirm that you want to participate in a raffle.`,
  fullDescription: `\n**What:**\nIf you get drawn in a raffle, you will have to confirm your participation with your battle tag.\n` +
  `Once confirmed, you will be invited by a raffle manager in Battle.net to join the matches.\n` +
  `\n**Inputs:**\n **battletag** - Correctly formatted battle tag.\nIncorrect formatting or other inputs will result in the command being rejected.\n` +
  `\n**Who:**\nThis command is only available to raffle entrants that have been selected to participate.\n` +
  `\n**Example:** \`${config.prefix}confirm PlayerA#12345\``,
  usage: `\`battletag\``,
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

const checkInput = (value) => {
  // Only custom mentions format is allowed.
  return value.match(/^\D\w{2,11}#\d{4,5}$/) === null;
};

module.exports = {
  exec: async (msg, args) => {
    //Input validation
    if (args.length > 1) {
      return `Only provide the battle tag you wish to confirm with in the format \`BattleTag-####\``
    }
    if (checkInput(args[0])) {
      return `Incorrect format.\nPlease provide your battle tag like the following example: NickName#12345`
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.confirm(guildId, msg.author.id, args[0]);
      });
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options,
};
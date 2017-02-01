/**
 * Command for drawing a specified number of people from the entries.
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
  description: `Draw a group of winners from the entries.`,
  fullDescription: `\n**What:**\nCommand to draw winner from the raffle.\n` +
  `\n**Inputs:**\n **configuration** - The way teams are set up and the number of players in each team.\nOther inputs will result in the command being rejected.\n` +
  `\n**Who:**\nAnyone that has the permission to manage channels can use this command.\n` +
  `\n**Examples:** \`${config.prefix}raffle draw 3v3\` \`${config.prefix}raffle draw 5\``,
  usage: `\`configuration\``,
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

const checkInput = (value) => {
  // Only positive numbers, 0 not allowed, 0x.. not allowed, decimals not allowed, strings not allowed.
  return value.match(/^([+]?[1-9]\d*)$/) === null;
};

module.exports = {
  exec: async (msg, args) => {
    if (args.length > 1) {
      return `Invalid usage. Do \`!help raffle start\` to view proper usage.`;
    }

    let groups;

    if (args.length > 0) {
      groups = args[0].split('v');

      for (let i = 0; i < groups.length; i++) {
        if (checkInput(groups[i])) {
          return `Invalid usage. Do \`!help raffle start\` to view proper usage.`;
        }

        groups[i] = parseInt(groups[i]);
      }
    }

    try {
      return await Guild.determine(msg, async (guildId) => {
        return await Raffle.draw(guildId, groups);
      });
    }
    catch(error) {
      console.log(pe.render(error));
    }
  },
  options
};

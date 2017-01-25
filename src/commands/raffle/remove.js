/**
 * Command for removing the raffle outputs from the channel this is typed in
 */
const pe = require('utils/error');

const Raffle = require('utils/raffle');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Remove the channel from the list the raffle should announce in.`,
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
    // Input validation
    if (args.length > 0) {
      return `Invalid usage. Do \`!help raffle remove\` to view proper usage.`;
    }

    try {
      return await Raffle.removeChannel(msg.channel);
    }
    catch (error) {
      console.log(pe.render(error));
    }
  },
  options: options,
};

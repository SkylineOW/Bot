/**
 * Command for adding the raffle outputs to the channel this is typed in
 */
const pe = require('utils/error');

const Raffle = require('utils/raffle');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true, // This can only happen in guilds. Users add themselves as managers to receive results.
  dmOnly: false,
  description: `Add the channel to the list the raffle should announce in.`,
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

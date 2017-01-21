/**
 * Command for entering into a running raffle.
 */

const Redis = require('data/redis');

const status = require('./status');

const label = 'enter';
const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Enter an ongoing raffle.`,
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
  RegisterCommand: (bot, parent) => {
    const command = parent.registerSubcommand(label, async(msg, args) => {
      // Input validation

      const joinRaffle = async() => {
        // Check if the user is on the list
        const entries = await Redis.smembersAsync(`Raffle:${msg.channel.guild.id}:entries`);

        if(!entries || (entries && entries.indexOf(msg.author.id) === -1)) {
          //List does not exist, create it with the user's id.

          const result = await Redis.saddAsync([`Raffle:${msg.channel.guild.id}:entries`, msg.author.id]);

          return `${msg.author.mention} has entered.`;
        }

        return `You have already entered the lottery ${msg.author.mention}`;
      };

      //Get the raffle status from redis for this guild.
      let raffle = await Redis.getAsync(`Raffle:${msg.channel.guild.id}:status`);

      switch (raffle) {
        case status.inProgress:
          return await joinRaffle();
        case status.closed:
        case status.finished:
          return `The lottery is not accepting entries at this time ${msg.author.mention}`;
        default:
          return `There is no lottery happening right now.`;
      }
    }, options);

    // Register subcommands
  }
};
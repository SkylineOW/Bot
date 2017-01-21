/**
 * Command for closing a running raffle, preventing additional entries.
 */

const async = require('async');

const Guild = require('data/mongoose').models.Guild;
const Redis = require('data/redis');

const status = require('./status');

const label = 'close';
const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Closes a running raffle to prevent addition entries.`,
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
      //Input validation
      if (args.length > 0) {
        return `Invalid usage. Do \`!help raffle close\` to view proper usage.`;
      }

      let raffle = await Redis.getAsync(`Raffle:${msg.guild.id}:status`);

      const closeRaffle = async() => {
        // Fetch the guild
        let guild = await Guild.findById(msg.guild.id);

        // This guild should exist and have settings since raffles cant start without a guild or settings.
        if (!guild || !guild.raffle) {
          //ToDo: Report this to the bot alert webhook for inspection.
          return 'Something went wrong, please try again.';
        }

        guild = await new Promise((resolve) => {
          // raffle should also exist since its created with the guild.
          guild.populate('raffle', (error, result) => {
            resolve(result);
          });
        });

        //Broadcast on all channels listed that the raffle is closed.
        await async.each(guild.raffle.channels, async (channelId, callback) => {
          //Skip the channel this was written.
          if(channelId === msg.channel.id)
          {
            return callback();
          }

          console.log(`Close sent to channel: ${channelId}`);
          callback();
        });

        //Inform all managers about the raffle state.
        await async.each(guild.raffle.managers, async (userId, callback) => {
          //Skip the user that sent this message.
          if(userId === msg.author.id)
          {
            return callback();
          }

          console.log(`Close sent to manager: ${userId}`);
          callback();
        });

        await Redis.multi()
          .set(`Raffle:${msg.guild.id}:status`, status.closed)
          .del(`Raffle:${msg.guild.id}:timeout`)
          .execAsync();

        return 'The raffle is now closed.';
      };

      switch (raffle) {
        case status.inProgress:
          return await closeRaffle();
        case status.created:
          return 'A raffle that has not started, cannot be closed.';
        case status.closed:
          return 'The raffle is already closed.';
        default:
          return 'A raffle that is not running, cannot be closed.';
      }
    }, options);

    //Register subcommands
  }
};
/**
 * Command for re-opening the raffle to allow additional entries.
 *
 * ToDo: Add the timer feature for to close after duration.
 * ToDo: Add time remaining to announcements.
 * ToDo: Announce via @here in chosen channels when raffle starts.
 */

const async = require('async');

const Guild = require('data/mongoose').models.Guild;
const Redis = require('data/redis');

const status = require('./status');

const label = 'open';
const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Reopen a closed raffle to allow more entries`,
  fullDescription: ``,
  usage: `\`mins\``,
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
      // ToDo: Handle input validation to make sure the minutes value is right.

      const duration = args[0];

      const openRaffle = async() => {
        // Fetch the guild
        let guild = await Guild.findById(msg.channel.guild.id);

        // This guild should exist and have settings since raffles cant start without a guild or settings.
        if(!guild || !guild.raffle) {
          //ToDo: Report this to the bot alert channel for inspection.
          return 'Something went wrong, please try again.';
        }

        guild = await new Promise((resolve) => {
          // raffle should also exist since its created with the guild.
          guild.populate('raffle', (error, result) => {
            resolve(result);
          });
        });

        // Broadcast on all channels listed that the raffle is open.
        await async.each(guild.raffle.channels, async (channelId, callback) => {
          //Skip the channel this was written.
          if(channelId === msg.channel.id)
          {
            return callback();
          }

          console.log(`Close sent to channel: ${channelId}`);
          callback();
        });

        // Inform all managers about the raffle state.
        await async.each(guild.raffle.managers, async (userId, callback) => {
          //Skip the user that sent this message.
          if(userId === msg.author.id)
          {
            return callback();
          }

          console.log(`Close sent to manager: ${userId}`);
          callback();
        });

        if(duration)
        {
          await Redis.multi()
            .set(`Raffle:${msg.channel.guild.id}:status`, status.inProgress)
            .set(`Raffle:${msg.channel.guild.id}:timeout`, 'Close')
            .expire(`Raffle:${msg.channel.guild.id}:timeout`, duration * 60)
            .execAsync();

          // ToDo: Start an interval monitoring the timeout and perform action when done.
        } else {
          await Redis.setAsync(`Raffle:${msg.channel.guild.id}:status`, status.inProgress);
        }

        return 'The raffle has reopened.';
      };

      let raffle = await Redis.getAsync(`Raffle:${msg.channel.guild.id}:status`);

      switch (raffle) {
        case status.closed:
          return await openRaffle();
        case status.inProgress:
          return 'The raffle is already open.';
        case status.finished:
          return 'The raffle has finished. Please use \`!raffle start\` instead to restart the raffle.';
        default:
          return 'Only closed raffles can be opened.';
      }
    }, options);

    //Register subcommands
  }
};
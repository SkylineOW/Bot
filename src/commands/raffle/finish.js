/**
 * Command that concludes a raffle and cleans everything up for a new raffle to start.
 */

const async = require('async');

const Guild = require('data/mongoose').models.Guild;
const Redis = require('data/redis');

const status = require('utils/status');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Conclude a raffle, cleaning up entries and results.`,
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

    const finishRaffle = async () => {
      // Fetch the guild
      let guild = await Guild.findById(msg.channel.guild.id);

      // This guild should exist and have settings since raffles cant start without a guild or settings.
      if (!guild || !guild.raffle) {
        //ToDo: Report this to the bot alert webhook for inspection.
        return 'Something went wrong, please try again.';
      }

      guild = await new Promise((resolve) => {
        guild.populate('raffle', (error, result) => {
          resolve(result);
        });
      });

      //Broadcast on all channels listed that the raffle is closed.
      await async.each(guild.raffle.channels, async (channelId, callback) => {
        //Skip the channel this was written.
        if (channelId === msg.channel.id) {
          return callback();
        }

        console.log(channelId);
        callback();
      });

      //Inform all managers about the raffle state.
      await async.each(guild.raffle.managers, async (userId, callback) => {
        //Skip the user that sent this message.
        if (userId === msg.author.id) {
          return callback();
        }

        console.log(userId);
        callback();
      });

      await Redis.multi()
        .del(`Raffle:${msg.channel.guild.id}:status`)
        .del(`Raffle:${msg.channel.guild.id}:entries`)
        .del(`Raffle:${msg.channel.guild.id}:timeout`)
        .execAsync();

      return 'The raffle has finished.';
    };

    let raffle = await Redis.getAsync(`Raffle:${msg.channel.guild.id}:status`);

    switch (raffle) {
      case status.inProgress:
      case status.closed:
        return await finishRaffle();
      default:
        return `The raffle is already finished.`;
    }
  },
  options: options
};

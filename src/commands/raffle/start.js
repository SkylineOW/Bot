/**
 * Command for starting a raffle.
 *
 * ToDo: Add the timer option for raffle duration.
 * ToDo: Add time remaining to announcements.
 * ToDo: Announce via @here in chosen channels when raffle starts.
 */

const async = require('async');

const Guild = require('data/mongoose').models.Guild;
const Raffle = require('data/mongoose').models.Raffle;
const Redis = require('data/redis');

const status = require('./../../utils/status');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Start a raffle that people can enter.`,
  fullDescription: '',
  usage: '\`mins\`',
  requirements: {
    userIDs: [],
    permissions: {},
    roleIDs: [],
    roleNames: [],
  },
  cooldown: 1000,
  cooldownMessage: 'cooldown',
  permissionMessage: 'permissions',
};

module.exports = {
  exec: async(msg, args) => {
    // Input validation
    // ToDo: Handle input validation to make sure the minutes value is right.

    const duration = args[0];

    const startRaffle = async() => {
      // Fetch the guild
      let guild = await Guild.findById(msg.channel.guild.id);

      if (!guild) {
        // No guild, create a default one.
        guild = await Guild.create({_id: msg.channel.guild.id});
      }

      // If there are no raffle settings for this guild, create default based on message.
      if (!guild.raffle) {
        const raffle = await Raffle.create({
          channels: [msg.channel.id],
          managers: [msg.author.id],
          guild: guild,
        });

        guild = await Guild.findByIdAndUpdate(msg.channel.guild.id, {raffle: raffle}, {new: true, safe: true});
      }

      guild = await new Promise((resolve) => {
        guild.populate('raffle', (error, result) => {
          resolve(result);
        });
      });

      // If there are no channels or managers, add this channel or person that sent this.
      if (guild.raffle.channels.length < 1) {
        await Raffle.findByIdAndUpdate(guild.raffle._id, {$push: {channels: msg.channel.id}}, {new: true, safe: true});
      }

      // Broadcast on all channels listed that the raffle is closed.
      await async.each(guild.raffle.channels, async(channelId, callback) => {
        //Skip the channel this was written.
        if (channelId === msg.channel.id) {
          return callback();
        }

        console.log(channelId);
        callback();
      });

      // Inform all managers about the raffle state.
      await async.each(guild.raffle.managers, async(userId, callback) => {
        //Skip the user that sent this message.
        if (userId === msg.author.id) {
          return callback();
        }

        console.log(userId);
        callback();
      });

      if (duration) {
        await Redis.multi()
          .set(`Raffle:${msg.channel.guild.id}:status`, status.inProgress)
          .set(`Raffle:${msg.channel.guild.id}:timeout`, 'Close')
          .expire(`Raffle:${msg.channel.guild.id}:timeout`, duration * 60)
          .execAsync();

        // ToDo: Start an interval monitoring the timeout and perform action when done.
      } else {
        await Redis.setAsync(`Raffle:${msg.channel.guild.id}:status`, status.inProgress);
      }

      return 'The raffle has started.';
    };

    let raffle = await Redis.getAsync(`Raffle:${msg.channel.guild.id}:status`);

    if (!raffle) {
      // No state, create one.
      raffle = status.created;
    }

    switch (raffle) {

      case status.created:
        return await startRaffle();
      case status.inProgress:
        return 'The raffle is already in progress.';
      case status.closed:
        return 'A closed raffle cannot be started. If you\'d like to extend the raffle, use \`!raffle open\` instead.';
      case status.finished:
        return await startRaffle();
      default:
        return 'The raffle is currently in progress. Please finish it before starting it again.';
    }
  },
  options: options
};

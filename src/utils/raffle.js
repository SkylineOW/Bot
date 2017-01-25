const async = require('async');
const pe = new require('pretty-error')();

const mongoose = require('data/mongoose');
const redis = require('data/redis');
const time = require('utils/time');

const Guild = require('utils/guild');
const Raffle = require('data/models/raffles');

/**
 * Possible states the raffle could be in
 */
const state = {
  created: 'Created',
  inProgress: 'In progress',
  closed: 'Closed',
  finished: 'Finished',
};

/**
 * Add the specified channel to the raffle
 * @param channel The channel that should be added to the raffle (Guild channels only)
 * @returns {Promise.<String>}
 */
const addChannel = async (channel) => {
  if (!channel.guild) {
    return `This command can only be performed in guild channels. If you want to personally receive raffle results, look at \`!help raffle manage\``;
  }

  const guildId = channel.guild.id;
  const channelId = channel.id;

  let guild = await Guild.fetchOrCreate(guildId);

  guild = await createOrPopulate(guild);

  //Check if the channel is registered.
  if (guild.raffle.channels.indexOf(channelId) !== -1) {
    return 'The raffle already uses this channel.';
  }

  await Raffle.findByIdAndUpdate(guild.raffle._id, {$push: {channels: channelId}}, {new: true, safe: true});
  return 'The raffle now uses this channel.';
};

/**
 * Remove the specified channel from the raffle
 * @param channel The channel that should be removed from the raffle (Guild channels only)
 * @returns {Promise.<String>}
 */
const removeChannel = async (channel) => {
  if (!channel.guild) {
    return `This command can only be performed in guild channels. If you don't want to receive raffle results personally, look at \`!help raffle unmanage\``;
  }

  const guildId = channel.guild.id;
  const channelId = channel.id;

  let guild = await Guild.fetch(guildId);

  if (!guild) {
    return `The raffle does not use this channel.`;
  }

  guild = await populate(guild);

  if (guild.raffle.channels.indexOf(channelId) === -1) {
    return `The raffle does not use this channel.`;
  }

  // Raffle needs at least 1 channel to post results in.
  if (guild.raffle.channels.length <= 1) {
    return 'The raffle needs at least one channel to post results in.\nPlease add another channel with \`!raffle add\` before removing this one.';
  }

  await Raffle.findByIdAndUpdate(guild.raffle.id, {$pull: {channels: channelId}}, {new: true, safe: true});
  return `The raffle no longer uses this channel.`;
};

/**
 * Enter an ongoing raffle
 * @param guildId The guild to try and join the raffle of
 * @param user The user to enter into the raffle
 * @returns {Promise.<String>}
 */
const enter = async (guildId, user) => {
  //Get the raffle status.
  let status = await redis.getAsync(`Raffle:${guildId}:state`);

  switch (status) {
    case state.inProgress:
      const entries = await redis.smembersAsync(`Raffles:${guildId}:entries`);

      if (!entries || (entries && entries.indexOf(user.id) === -1)) {
        // List does not exist or user is not on it.
        await redis.saddAsync([`Raffle:${guildId}:entries`, user.id]);

        return `${user.mention} has entered`;
      }

      return `Your have already entered the raffle ${user.mention}`;
    case state.closed:
    case state.finished:
      return `The lottery is not accepting entries at this time ${user.mention}`;
    default:
      return `There is no lottery happening right now.`;
  }
};

/**
 * Reopen a raffle, allowing additional entries
 * @param guildId Id of the raffle's guild
 * @param duration Time in minutes to open guild for
 * @returns {Promise.<String>}
 */
const open = async (guildId, duration) => {
  // Fetch the raffle state.
  let status = await redis.getAsync(`Raffle:${guildId}:state`);

  switch (status) {
    case state.closed:
      // Fetch th guild with the provided id.
      let guild = await Guild.fetch(guildId);

      // This guild should exist and have settings since raffles cant start without a guild or settings.
      if (!guild || !guild.raffle) {
        //ToDo: Report this to the bot alert channel for inspection.
        return 'Something went wrong, please try again.';
      }

      guild = await populate(guild);

      // // Broadcast on all channels listed that the raffle is open.
      // await async.each(guild.raffle.channels, async (channelId, callback) => {
      //   //Skip the channel this was written.
      //   if (channelId === msg.channel.id) {
      //     return callback();
      //   }
      //
      //   console.log(`Close sent to channel: ${channelId}`);
      //   callback();
      // });
      //
      // // Inform all managers about the raffle state.
      // await async.each(guild.raffle.managers, async (userId, callback) => {
      //   //Skip the user that sent this message.
      //   if (userId === msg.author.id) {
      //     return callback();
      //   }
      //
      //   console.log(`Close sent to manager: ${userId}`);
      //   callback();
      // });

      if (duration) {
        await redis.multi()
          .set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, state.closed)
          .expire(`Raffle:${guildId}:timeout`, duration * 60)
          .execAsync();

        // Start an interval that monitors the timeout ttl and closes the raffle when it doesn't exist anymore.
        const checkTime = () => {
          redis.multi()
            .get(`Raffle:${guildId}:state`)
            .ttl(`Raffle:${guildId}:timeout`)
            .exec(async (error, result) => {
              if (result[0] === state.inProgress) {
                if (result[1] <= 0) {
                  await close(guildId);
                } else {
                  setTimeout(checkTime, 1000);
                }
              }
            });
        };

        setTimeout(checkTime, 1000);
      } else {
        await redis.setAsync(`Raffle:${guildId}:state`, state.inProgress);
      }

      return 'The raffle has reopened.';
    case state.inProgress:
      return 'The raffle is already open.';
    case state.finished:
      return 'The raffle has finished. Please use \`!raffle start\` instead to restart the raffle.';
    default:
      return 'Only closed raffles can be opened.';
  }
};

/**
 * Attempt to close the raffle of the provided guild
 * @param guildId ID of the raffle's guild
 * @returns {Promise.<String>}
 */
const close = async (guildId) => {
  // Fetch the raffle state.
  let status = await redis.getAsync(`Raffle:${guildId}:state`);

  switch (status) {
    case state.inProgress:
      let guild = await Guild.fetch(guildId);

      // This guild should exist and have settings since raffles cant start without a guild or settings.
      if (!guild || !guild.raffle) {
        //ToDo: Report this to the bot alert webhook for inspection.
        return 'Something went wrong, please try again.';
      }

      guild = await populate(guild);

      // //Broadcast on all channels listed that the raffle is closed.
      // await async.each(guild.raffle.channels, async (channelId, callback) => {
      //   //Skip the channel this was written.
      //   if (channelId === msg.channel.id) {
      //     return callback();
      //   }
      //
      //   console.log(`Close sent to channel: ${channelId}`);
      //   callback();
      // });
      //
      // //Inform all managers about the raffle state.
      // await async.each(guild.raffle.managers, async (userId, callback) => {
      //   //Skip the user that sent this message.
      //   if (userId === msg.author.id) {
      //     return callback();
      //   }
      //
      //   console.log(`Close sent to manager: ${userId}`);
      //   callback();
      // });

      await redis.multi()
        .set(`Raffle:${guildId}:state`, state.closed)
        .del(`Raffle:${guildId}:timeout`)
        .execAsync();

      return 'The raffle is now closed.';
    case state.created:
      return 'A raffle that has not started, cannot be closed.';
    case state.closed:
      return 'The raffle is already closed.';
    default:
      return 'A raffle that is not running, cannot be closed.';
  }
};

/**
 * Populates the raffle field of a given guild
 * @param guild The guild to populate
 * @returns {Promise}
 */
const populate = async (guild) => {
  return await new Promise((resolve) => {
    guild.populate('raffle', (error, result) => {
      if (error) {
        console.log(pe.render(error));
      }
      resolve(result);
    });
  });
};

/**
 * Create or populate the raffle for the provided guild
 * @param guild The guild to create or populate for
 * @returns {Promise.<Guild>}
 */
const createOrPopulate = async (guild) => {
  if (!guild.raffle) {
    const raffle = await Raffle.create({
      channels: [],
      managers: [],
      guild: guild
    });

    guild = await Guild.setRaffle(guild.id, raffle);
  }

  return await populate(guild);
};

/**
 * Starts a new raffle
 * @param guildId The guild this raffle belongs to
 * @param duration Time in minutes the raffle should be open
 * @returns {Promise.<String>}
 */
const start = async (guildId, duration) => {
  // Fetch the raffle state.
  let raffle = await redis.getAsync(`Raffle:${guildId}:state`);

  if (!raffle) {
    // No state, create one.
    raffle = state.created;
  }

  switch (raffle) {
    case state.created:
    case state.finished:
      // Fetch the guild with the provided id.
      let guild = await Guild.fetchOrCreate(guildId);

      // Create or popular the raffle of the guild.
      guild = await createOrPopulate(guild);

      // The raffle needs at least one channel in the guild to output results to.
      if (guild.raffle.channels.length < 1) {
        return `Please add at least one channel from the guild for the raffle to use by going to the channel and using \`!raffle add\``
      }

      //   // Broadcast on all channels listed that the raffle is closed.
      //   await async.each(guild.raffle.channels, async (channelId, callback) => {
      //     //Skip the channel this was written.
      //     if (channelId === msg.channel.id) {
      //       return callback();
      //     }
      //
      //     console.log(channelId);
      //     callback();
      //   });
      //
      //   // Inform all managers about the raffle state.
      //   await async.each(guild.raffle.managers, async (userId, callback) => {
      //     //Skip the user that sent this message.
      //     if (userId === msg.author.id) {
      //       return callback();
      //     }
      //
      //     console.log(userId);
      //     callback();
      //   });

      if (duration) {
        await redis.multi()
          .set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, state.closed)
          .expire(`Raffle:${guildId}:timeout`, duration * 60)
          .execAsync();

        // Start an interval that monitors the timeout ttl and closes the raffle when it doesn't exist anymore.
        const checkTime = () => {
          redis.multi()
            .get(`Raffle:${guildId}:state`)
            .ttl(`Raffle:${guildId}:timeout`)
            .exec(async (error, result) => {
              if (result[0] === state.inProgress) {
                if (result[1] <= 0) {
                  await close(guildId);
                } else {
                  setTimeout(checkTime, 1000);
                }
              }
            });
        };

        setTimeout(checkTime, 1000);
      } else {
        await redis.setAsync(`Raffle:${guildId}:state`, state.inProgress);
      }

      return 'The raffle has started.';
    case state.inProgress:
      return 'The raffle is already in progress.';
    case state.closed:
      return 'A closed raffle cannot be started. If you\'d like to extend the raffle, use \`!raffle open\` instead.';
    default:
      return 'The raffle is currently in progress. Please finish it before starting it again.';
  }
};

/**
 * Concludes a raffle, discarding everything associated with it
 * @param guildId ID of the raffle's guild
 * @returns {Promise.<String>}
 */
const finish = async (guildId) => {
  // Fetch the raffle state.
  let status = await redis.getAsync(`Raffle:${guildId}:state`);

  switch (status) {
    case state.inProgress:
    case state.closed:
      //Fetch the guild with the provided id.
      let guild = await Guild.fetch(guildId);

      // This guild should exist and have settings since raffles cant start without a guild or settings.
      if (!guild || !guild.raffle) {
        //ToDo: Report this to the bot alert webhook for inspection.
        return 'Something went wrong, please try again.';
      }

      guild = await populate(guild);

      // //Broadcast on all channels listed that the raffle is closed.
      // await async.each(guild.raffle.channels, async (channelId, callback) => {
      //   //Skip the channel this was written.
      //   if (channelId === msg.channel.id) {
      //     return callback();
      //   }
      //
      //   console.log(channelId);
      //   callback();
      // });
      //
      // //Inform all managers about the raffle state.
      // await async.each(guild.raffle.managers, async (userId, callback) => {
      //   //Skip the user that sent this message.
      //   if (userId === msg.author.id) {
      //     return callback();
      //   }
      //
      //   console.log(userId);
      //   callback();
      // });

      await redis.multi()
        .del(`Raffle:${guildId}:state`)
        .del(`Raffle:${guildId}:entries`)
        .del(`Raffle:${guildId}:timeout`)
        .execAsync();

      return 'The raffle has finished.';
    default:
      return `The raffle is already finished.`;
  }
};

/**
 * Creates a status screen that monitors the raffle and updates periodically
 * @param guildId ID of the raffle's guild
 * @param channel Channel in which to output the status screen
 * @returns {Promise.<String>}
 */
const info = async (guildId, channel) => {
  // Fetch the raffle state.
  let status = await redis.multi()
    .get(`Raffle:${guildId}:state`)
    .scard(`Raffle:${guildId}:entries`)
    .ttl(`Raffle:${guildId}:timeout`)
    .execAsync();

  switch (status[0]) {
    case state.inProgress:
    case state.closed:
      const fields = [
        {
          name: '❯ Status',
          value: status[0],
          inline: true,
        },
        {
          name: '❯ Entries',
          value: status[1],
          inline: true,
        }
      ];

      if (status[0] === state.inProgress) {
        fields.push({
          name: '❯ Time remaining',
          value: time.formatSeconds(status[2]),
          inline: true,
        });
      }

      await channel.createMessage({
        embed: {
          color: 6897122,
          author: {
            name: `Raffle`,
          },
          fields: fields
        }
      });
      break;
    default:
      return `A raffle is not running at this moment.`;
  }
};

/**
 * Adds users to the list of managers for a raffle, allowing them to receive automated messages about the raffle
 * @param guildId ID of the raffle's guild
 * @param users Array of users to add to the list
 * @returns {Promise.<String>}
 */
const addManagers = async (guildId, users) => {
  // Fetch the guild
  let guild = await Guild.fetchOrCreate(guildId);

  // If there are no raffle settings for the guild, create them
  guild = await createOrPopulate(guild);

  const results = [];
  const additions = [];

  await async.each(users, (user) => {
    if (guild.raffle.managers.indexOf(user.id) < 0) {
      additions.push(user.id);
      results.push(`${user.mention} now manages the raffle.`);
    } else {
      results.push(`${user.mention} is already managing the raffle.`);
    }
  });

  await Raffle.findByIdAndUpdate(guild.raffle._id, {$push: {managers: {$each: additions}}}, {new: true, safe: true});

  return results.join('\n');
};

/**
 * Removes users from the list of managers
 * @param guildId ID of the raffle's guild
 * @param users Array of users to add to the list
 * @returns {Promise.<String>}
 */
const removeManagers = async (guildId, users) => {
  // Fetch the guild
  let guild = await Guild.fetch(guildId);

  // This guild should exist and have settings since raffles cant start without a guild or settings.
  if (!guild || !guild.raffle) {
    //ToDo: Report this to the bot alert webhook for inspection.
    return 'Something went wrong, please try again.';
  }

  guild = await populate(guild);

  const results = [];
  const removals = [];

  await async.each(users, (user) => {
    if (guild.raffle.managers.indexOf(user.id) === -1) {
      results.push(`${user.mention} is not managing the raffle.`);
    } else {
      removals.push(user.id);
      results.push(`The raffle is no longer managed by ${user.mention}`);
    }
  });

  await Raffle.findByIdAndUpdate(guild.raffle._id, {$pull: {managers: {$in: removals}}}, {new: true, safe: true});

  return results.join('\n');
};

module.exports = {
  start,
  finish,
  enter,
  open,
  close,
  info,
  addChannel,
  removeChannel,
  addManagers,
  removeManagers,
  createOrPopulate,
  populate,
  state,
};
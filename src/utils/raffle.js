const async = require('async');
const pe = new require('pretty-error')();

const bot = require('bot');
const config = require('config');

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
    return `This command can only be performed in guild channels. If you want to personally receive raffle results, look at \`${config.prefix}help raffle manage\``;
  }

  const guildId = channel.guild.id;
  const channelId = channel.id;

  // Fetch the guild. Make it if needed.
  let guild = await Guild.fetchOrCreate(guildId);

  // Populate or create the raffle
  guild = await createOrPopulate(guild);

  // Check if the channel is registered.
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
    return `This command can only be performed in guild channels. If you don't want to receive raffle results personally, look at \`${config.prefix}help raffle unmanage\``;
  }

  const guildId = channel.guild.id;
  const channelId = channel.id;

  // Fetch the guild
  let guild = await Guild.fetch(guildId);

  if (!guild) {
    return `The raffle does not use this channel.`;
  }

  // Populate the raffle
  guild = await populate(guild);

  if (guild.raffle.channels.indexOf(channelId) === -1) {
    return `The raffle does not use this channel.`;
  }

  // Raffle needs at least 1 channel to post results in.
  if (guild.raffle.channels.length <= 1) {
    return `The raffle needs at least one channel to post results in.\nPlease add another channel with \`${config.prefix}raffle add\` before removing this one.`;
  }

  await Raffle.findByIdAndUpdate(guild.raffle.id, {$pull: {channels: channelId}}, {new: true, safe: true});
  return `The raffle no longer uses this channel.`;
};

/**
 * Send the provided message to all the raffle channels
 * @param guild The raffle's guild
 * @param message Message to broadcast
 * @returns {Promise.<string>}
 */
const broadcastToChannels = async (guild, message) => {
  // Broadcast on all channels listed the provided message.
  return await async.each(guild.raffle.channels, async (channelId) => {
    await bot.createMessage(channelId, message);
  });
};

/**
 * Enter an ongoing raffle
 * @param guildId The guild to try and join the raffle of
 * @param user The user to enter into the raffle
 * @returns {Promise.<String>}
 */
const enter = async (guildId, user) => {
  //Get the raffle status.
  let response = await redis.multi()
    .get(`Raffle:${guildId}:state`)
    .sismember(`Raffle:${guildId}:entries`, user.id)
    .sismember(`Raffle:${guildId}:pending`, user.id)
    .sismember(`Raffle:${guildId}:confirmed`, user.id)
    .sismember(`Raffle:${guildId}:issues`, user.id)
    .execAsync();

  const status = response[0];
  const inEntries = response[1];
  const inPending = response[2];
  const inConfirmed = response[3];
  const inIssues = response[4];

  switch (status) {
    case state.inProgress:
      // Make sure this user is not in any group of the raffle.
      if (!inEntries && !inPending && !inConfirmed && !inIssues) {
        // Add user to list of entries.
        await redis.saddAsync(`Raffle:${guildId}:entries`, user.id);

        // Fetch the guild.
        let guild = await Guild.fetch(guildId);

        // This guild should exist and have settings since raffles cant start without a guild or settings.
        if (!guild || !guild.raffle) {
          //ToDo: Report this to the bot alert channel for inspection.
          return 'Something went wrong, please try again.';
        }

        // Populate raffle
        guild = await populate(guild);

        return await broadcastToChannels(guild, `${user.mention} has entered`);
      }

      return `You have already entered the raffle ${user.mention}`;
    case state.closed:
    case state.finished:
      return `The raffle is not accepting entries at this time ${user.mention}`;
    default:
      return `There is no raffle happening right now.`;
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
      // Fetch the guild.
      let guild = await Guild.fetch(guildId);

      // This guild should exist and have settings since raffles cant start without a guild or settings.
      if (!guild || !guild.raffle) {
        //ToDo: Report this to the bot alert channel for inspection.
        return 'Something went wrong, please try again.';
      }

      // Populate raffle
      guild = await populate(guild);

      // Broadcast on all channels listed that the raffle is reopened.
      await broadcastToChannels(guild, `The raffle is open again. Use \`${config.prefix}enter\` to enter.`);

      // Inform all managers the raffle has closed.
      await broadcastToManagers(guild, `A raffle you manage has reopened.`);

      // Set the timeout for the duration of the raffle.
      if (duration) {
        await redis.multi()
          .set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, 'True')
          .set(`Raffle:${guildId}:next`, state.closed)
          .expire(`Raffle:${guildId}:timeout`, duration * 60)
          .execAsync();
      } else {
        await redis.multi()
          .set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, 'True')
          .execAsync();
      }

      break;
    case state.inProgress:
      return `The raffle is already open.`;
    case state.finished:
      return `The raffle has finished. Please use \`${config.prefix}raffle start\` instead to restart the raffle.`;
    default:
      return `Only closed raffles can be opened.`;
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
      // Fetch the guild.
      let guild = await Guild.fetch(guildId);

      // This guild should exist and have settings since raffles cant start without a guild or settings.
      if (!guild || !guild.raffle) {
        //ToDo: Report this to the bot alert channel for inspection.
        return 'Something went wrong, please try again.';
      }

      // Populate the raffle
      guild = await populate(guild);

      // Broadcast on all channels listed that the raffle is reopened.
      await broadcastToChannels(guild, `The raffle is now closed. `);

      // Inform all managers the raffle has closed.
      await broadcastToManagers(guild, `A raffle you manage has closed.`);

      await redis.multi()
        .set(`Raffle:${guildId}:state`, state.closed)
        .del(`Raffle:${guildId}:timeout`)
        .execAsync();

      break;
    case state.created:
      return 'A raffle that has not started, cannot be closed.';
    case state.closed:
      return 'The raffle is already closed.';
    default:
      return 'A raffle that is not running, cannot be closed.';
  }
};

/**
 * Draws from the entries and returns the desired configuration of players. (Default is 6v6)
 * @param guildId ID of the raffle's guild
 * @param groups Array of numbers with each number representing a group and the desired amount of people in it.
 * @returns {Promise.<String>}
 */
const draw = async (guildId, groups = [6, 6]) => {
  // Get total number of entries to draw.
  let total = groups.reduce((total, value) => {
    return total + value;
  }, 0);

  // Fetch the raffle state.
  let response = await redis.multi()
    .get(`Raffle:${guildId}:state`)
    .scard(`Raffle:${guildId}:entries`)
    .execAsync();

  const status = response[0];
  const entryCount = response[1];

  switch (status) {
    case state.inProgress:
    case state.closed:
      // Check for sufficient number of entries.
      if (total > entryCount) {
        return 'There are not enough entries to draw the specified configuration.';
      }

      // Close the raffle if open.
      if (status === state.inProgress) {
        await close(guildId);
      }

      // Draw the total number of entries needed.
      const response = await redis.multi()
        .spop(`Raffle:${guildId}:entries`, total)
        .execAsync();

      const list = response[0];

      // Fetch a list of winners.
      const winners = list.map((userId) => {
        return bot.users.find((user) => {
          return userId === user.id;
        });
      });

      // Add all the winners to the pending list.
      await redis.saddAsync(`Raffle:${guildId}:pending`, winners.map((user) => {
        return user.id;
      }));

      // Start the pending process for the winners.
      await async.each(winners, async (user) => {
        await informWinner(guildId, user);
      });

      let fields = [
        {
          name: `❯ Winners`,
          inline: true,
          value: winners.map((user) => {
            return user.mention;
          }).join('\n'),
        }
      ];

      // Fetch the guild.
      let guild = await Guild.fetch(guildId);

      // This guild should exist and have settings since raffles cant start without a guild or settings.
      if (!guild || !guild.raffle) {
        //ToDo: Report this to the bot alert channel for inspection.
        return 'Something went wrong, please try again.';
      }

      // Populate raffle
      guild = await populate(guild);

      // Broadcast the draw results to all channels.
      await broadcastToChannels(guild, {
        content: `Winners have been drawn from the raffle!`,
        embed: {
          color: 6897122,
          author: {
            name: `Draw Results`,
          },
          fields,
          footer: {
            text: 'If you are a winner please check your direct messages for further instructions.',
          }
        }
      });

      await async.each(guild.raffle.managers, async (userId) => {
        const guild = bot.guilds.find((guild) => {
          return guildId === guild.id;
        });

        const member = guild.members.find((member) => {
          return userId === member.id;
        });

        if (member.status === 'online') {

          const channel = await bot.getDMChannel(userId);

          const message = await channel.createMessage({
            embed: {
              color: 6897122,
              author: {
                name: `Entry Results`,
              },
              fields: [
                {
                  name: `❯ Pending: ${winners.length}`,
                  inline: true,
                  value: winners.map((user) => {
                    return user.username;
                  }).join('\n'),
                },
                {
                  name: `❯ Confirmed: 0`,
                  inline: true,
                  value: 'None'
                },
                {
                  name: `❯ Issues: 0`,
                  inline: true,
                  value: 'None'
                }
              ],
            }
          });

          await redis.multi()
            .sadd(`Raffle:${guildId}:managers`, userId)
            .set(`Raffle:${guildId}:m${userId}`, message.id)
            .execAsync();
        }
      });
      break;
    default:
      return `There is no raffle running. Use \`${config.prefix}raffle start\` to start a new raffle.`;
  }
};

/**
 * Send a dm to a user informing them that they have been selected for the raffle
 * @param guildId ID of the raffle's guild
 * @param user User chosen to participate
 * @returns {Promise.<void>}
 */
const informWinner = async (guildId, user) => {
  const channel = await user.getDMChannel();
  await channel.createMessage(`Congratulations!\nYou've been chosen as a winner for the raffle.\n` +
    `Please reply with one of the following commands:\n\n` +
    `\`${config.prefix}confirm JohnDoe#1234\` - I want to play!\n\n` +
    `\`${config.prefix}issue Insert message here\` - Something is wrong, I need an adult!\n\n` +
    `\`${config.prefix}withdraw\` - I changed my mind, maybe next time.\n\n` +
    `Please reply in the next 2 minutes or you will withdraw automatically.`);

  // Start timeouts for all the users chosen.
  // ToDo: These timeouts should be able to reset if the bot dies.
  setTimeout(async () => {
    if (await redis.sismemberAsync(`Raffle:${guildId}:pending`, user.id) === 1) {
      // Withdraw the user from the raffle.
      await withdraw(guildId, user.id);
      await channel.createMessage(`You have automatically withdrawn from the raffle due to inactivity.`);
    }
  }, 120 * 1000); // 2 min timeout.
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
  let status = await redis.getAsync(`Raffle:${guildId}:state`);

  if (!status) {
    // No state, create one.
    status = state.created;
  }

  switch (status) {
    case state.created:
    case state.finished:
      // Fetch the guild with the provided id.
      let guild = await Guild.fetchOrCreate(guildId);

      // Create or populate the raffle of the guild.
      guild = await createOrPopulate(guild);

      // The raffle needs at least one channel in the guild to output results to.
      if (guild.raffle.channels.length < 1) {
        return `Please add at least one channel from the guild for the raffle to use by going to the channel and using \`${config.prefix}raffle add\``;
      }

      // The raffle needs at least one manager to handle results and issues.
      if (guild.raffle.managers.length < 1) {
        return `Please add at least one manager for the raffle to send issues to by using \`${config.prefix}raffle manage\``;
      }

      // Broadcast to all channels that the raffle is starting.
      await broadcastToChannels(guild, `The Funcast with Skyline raffle has started!\n` +
        `Please use \`${config.prefix}enter\` to participate.`);

      // Inform all managers the the raffle is starting.
      await broadcastToManagers(guild, `A raffle you manage has started!`);

      // Set the timeout for the duration of the raffle to close it.
      if (duration) {
        await redis.multi()
          .set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, 'True')
          .set(`Raffle:${guildId}:next`, state.closed)
          .expire(`Raffle:${guildId}:timeout`, duration * 60)
          .execAsync();
      } else {
        await redis.multi()
          .set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, 'True')
          .execAsync();
      }
      break;
    case state.inProgress:
      return 'The raffle is already in progress.';
    case state.closed:
      return `A closed raffle cannot be started. If you\'d like to extend the raffle, use \`${config.prefix}raffle open\` instead.`;
    default:
      return 'The raffle is currently in progress. Please finish it before starting it again.';
  }
};

/**
 * Start timers for updating embeds for this raffle
 * @param guildId ID of the raffle's guild
 * @param id ID user for the lock to ensure only 1 valid timer
 * @returns {Promise.<void>}
 */
const startMonitor = async (guildId, id) => {
  try {
    console.log(`Raffle monitoring started for ${guildId}`);

    // Change the locks to match the id of this monitor session
    await redis.multi()
      .set(`Raffle:${guildId}:lock`, id)
      .execAsync();

    const updateChannels = async () => {
      // Reset the lock on the channels loop
      const response = await redis.multi()
        .get(`Raffle:${guildId}:state`)
        .get(`Raffle:${guildId}:channels:lock`)
        .smembers(`Raffle:${guildId}:channels`)
        .scard(`Raffle:${guildId}:entries`)
        .ttl(`Raffle:${guildId}:timeout`)
        .expire(`Raffle:${guildId}:channels:lock`, 6)
        .execAsync();

      const status = response[0];
      const channelLock = response[1];
      const channels = response[2];
      const entryCount = response[3];
      const raffleTimer = response[4];

      let unlocked = channelLock === `${id}`;

      if (!channelLock) {
        await redis.setAsync(`Raffle:${guildId}:channels:lock`, id);
        unlocked = true;
      }

      // Do update if we own the lock and there are channels to update.
      if (channels) {
        await async.each(channels, async (channelId) => {
          const messageId = await redis.getAsync(`Raffle:${guildId}:c${channelId}`);

          const fields = [
            {
              name: '❯ Status',
              value: status,
              inline: true,
            },
            {
              name: '❯ Entries',
              value: entryCount,
              inline: true,
            }
          ];

          if (status === state.inProgress) {
            fields.push({
              name: '❯ Time remaining',
              value: time.formatSeconds(raffleTimer),
              inline: true,
            });
          }

          const channel = await bot.getChannel(channelId);
          await channel.editMessage(messageId, {
            embed: {
              color: 6897122,
              author: {
                name: `Raffle`,
              },
              fields: fields
            }
          });
        });
      }

      // Repeat if key and storage is good.
      if (unlocked) {
        switch (status) {
          case state.inProgress:
          case state.closed:
            setTimeout(updateChannels, 3015);
        }
      }
    };

    const updateManagers = async () => {
      // Reset the lock on the managers
      const response = await redis.multi()
        .get(`Raffle:${guildId}:state`)
        .get(`Raffle:${guildId}:managers:lock`)
        .smembers(`Raffle:${guildId}:managers`)
        .smembers(`Raffle:${guildId}:pending`)
        .smembers(`Raffle:${guildId}:confirmed`)
        .smembers(`Raffle:${guildId}:issues`)
        .expire(`Raffle:${guildId}:managers:lock`, 6)
        .execAsync();

      const status = response[0];
      const managerLock = response[1];
      const managers = response[2];
      const Pending = response[3];
      const Confirmed = response[4];
      const Issues = response[5];

      let unlocked = managerLock === `${id}`;

      if (!managerLock) {
        await redis.setAsync(`Raffle:${guildId}:managers:lock`, id);
        unlocked = true;
      }

      //Do update for every listed manager
      if (managers && Pending && Confirmed && Issues) {
        const pending = Pending.map((userId) => {
          return bot.users.find((user) => {
            return user.id === userId;
          }).username;
        }).join('\n');

        const confirmed = [];
        await async.each(Confirmed, async (userId) => {
          const battleTag = await redis.getAsync(`Raffle:${guildId}:confirmed:${userId}`);
          const user = bot.users.find((user) => {
            return userId === user.id;
          });

          confirmed.push(`${user.username}: ${battleTag}`);
        });

        const issues = Issues.map((userId) => {
          return bot.users.find((user) => {
            return user.id === userId;
          }).username;
        }).join('\n');

        await async.each(managers, async (userId) => {
          const channel = await bot.getDMChannel(userId);
          const messageId = await redis.getAsync(`Raffle:${guildId}:m${userId}`);

          const message = {
            embed: {
              color: 6897122,
              author: {
                name: `Entry Results`,
              },
              fields: [
                {
                  name: `❯ Pending: ${Pending.length}`,
                  inline: true,
                  value: pending ? pending : 'None',
                },
                {
                  name: `❯ Issues: ${Issues.length}`,
                  inline: true,
                  value: issues ? issues : 'None',
                },
                {
                  name: `❯ Confirmed: ${Confirmed.length}`,
                  inline: true,
                  value: confirmed.length ? confirmed.join('\n') : 'None',
                }
              ],
            }
          };

          await channel.editMessage(messageId, message);
        });
      }

      // Repeat if key and storage is good.
      if (unlocked) {
        switch (status) {
          case state.inProgress:
          case state.closed:
            setTimeout(updateManagers, 3020);
            break;
        }
      }
    };

    const stateTimer = async () => {
      // Start an interval that monitors the timeout ttl and closes the raffle when it doesn't exist anymore.
      // ToDo: Allow timer end event type to be set for auto draw on timer finish.
      const response = await redis.multi()
        .get(`Raffle:${guildId}:state`)
        .get(`Raffle:${guildId}:timeout:lock`)
        .get(`Raffle:${guildId}:next`)
        .ttl(`Raffle:${guildId}:timeout`)

        .expire(`Raffle:${guildId}:timeout:lock`, 13)
        .execAsync();

      const status = response[0];
      const timerLock = response[1];
      const nextState = response[2];
      const raffleTimer = response[3];

      let unlocked = timerLock === `${id}`;

      if (!timerLock) {
        await redis.setAsync(`Raffle:${guildId}:timeout:lock`, id);
        unlocked = true;
      }

      if (status === state.inProgress) {
        if (raffleTimer <= -2) {
          switch (nextState) {
            case state.closed:
              await close(guildId);
              break;
            default:
              console.log(`Next state of raffle unclear.`);
              break;
          }
        }
      }

      if (unlocked && status === state.inProgress) {
        setTimeout(stateTimer, 10 * 1000);
      }
    };

    const monitor = async () => {
      // Place a lock on the raffle
      const response = await redis.multi()
        .get(`Raffle:${guildId}:state`)
        .get(`Raffle:${guildId}:lock`)
        .ttl(`Raffle:${guildId}:channels:lock`)
        .ttl(`Raffle:${guildId}:managers:lock`)
        .ttl(`Raffle:${guildId}:timeout:lock`)
        .expire(`Raffle:${guildId}:lock`, 7)
        .execAsync();

      const status = response[0];
      const guildLock = response[1];
      const channelLock = response[2];
      const managerLock = response[3];
      const timerLock = response[4];

      const unlocked = guildLock === `${id}`;

      switch (status) {
        case state.inProgress:
          // Check if there is a lock present on the channels
          if (channelLock <= 0) {
            await updateChannels();
          }

          // Check if there is a lock present on the manager messages
          if (managerLock <= 0) {
            await updateManagers();
          }

          // Check if there is a timer running for closing the raffle after a time period
          if (timerLock <= 0) {
            await stateTimer();
          }
          break;
        case state.closed:
          // Check if there is a lock present on the channels
          if (channelLock <= 0) {
            await updateChannels();
          }

          // Check if there is a lock present on the manager messages
          if (managerLock <= 0) {
            await updateManagers();
          }
          break;
        default:
          break;
      }

      // Repeat if key and storage is good.
      if (unlocked) {
        setTimeout(monitor, 5000);
      }
    };

    await monitor();
  }
  catch (error) {
    console.log(pe.render(error));
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
      // Fetch the guild with the provided id.
      let guild = await Guild.fetchOrCreate(guildId);

      // Create or populate the raffle of the guild.
      guild = await createOrPopulate(guild);

      // Broadcast on all channels listed that the raffle is finished.
      await broadcastToChannels(guild, `The raffle is finished.`);

      // Inform all managers the the raffle is starting.
      await broadcastToManagers(guild, `A raffle you manage has finished.`);

      const response = await redis.multi()
        .smembers(`Raffle:${guildId}:confirmed`) //need to cleanup the confirmed
        .smembers(`Raffle:${guildId}:issues`) //need to cleanup the issues
        .smembers(`Raffle:${guildId}:channels`)
        .smembers(`Raffle:${guildId}:managers`)
        .del(`Raffle:${guildId}:state`)
        .del(`Raffle:${guildId}:next`)
        .del(`Raffle:${guildId}:timeout`)
        .del(`Raffle:${guildId}:entries`)
        .del(`Raffle:${guildId}:pending`)
        .execAsync();

      const confirmed = response[0];
      const issues = response[1];
      const channels = response[2];
      const managers = response[3];

      // ToDo: This should all be replace with hashes.
      await async.each(confirmed, async (userId) => {
        await redis.delAsync(`Raffle:${guildId}:confirmed:${userId}`);
      });

      await async.each(issues, async (userId) => {
        await redis.delAsync(`Raffle:${guildId}:issues:${userId}`);
      });

      await async.each(channels, async (channelId) => {
        await redis.delAsync(`Raffle:${guildId}:c${channelId}`);
      });

      await async.each(managers, async (userId) => {
        await redis.delAsync(`Raffle:${guildId}:m${userId}`);
      });

      await redis.multi()
        .del(`Raffle:${guildId}:confirmed`)
        .del(`Raffle:${guildId}:issues`)
        .del(`Raffle:${guildId}:channels`)
        .del(`Raffle:${guildId}:managers`)
        .execAsync();
      break;
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
    .get(`Raffle:${guildId}:c${channel.id}`)
    .execAsync();

  switch (status[0]) {
    case state.inProgress:
    case state.closed:
      if (status[3]) {
        await channel.deleteMessage([status[3]]);
      }

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

      const message = await channel.createMessage({
        embed: {
          color: 6897122,
          author: {
            name: `Raffle`,
          },
          fields: fields
        }
      });

      await redis.multi()
        .sadd(`Raffle:${guildId}:channels`, channel.id)
        .set(`Raffle:${guildId}:c${channel.id}`, message.id)
        .execAsync();
      break;
    default:
      return `There's no raffle running at this moment.`;
  }
};

/**
 * Inform a manager about an issue you're having with the raffle so they can contact you.
 * @param guildId ID of the raffle's guild
 * @param userId ID of the user having the issue
 * @param message Messge describing the issue
 * @returns {Promise.<String>}
 */
const issue = async (guildId, userId, message) => {
  const response = await redis.multi()
    .get(`Raffle:${guildId}:state`)
    .sismember(`Raffle:${guildId}:pending`, userId)
    .sismember(`Raffle:${guildId}:confirmed`, userId)
    .execAsync();

  const status = response[0];
  const inPending = response[1];
  const inConfirmed = response[2];

  switch (status) {
    case state.inProgress:
    case state.closed:
      // Check if the person is in the right groups
      if (inPending || inConfirmed) {
        const response = await redis.multi()
          .smembers(`Raffle:${guildId}:managers`)
          .srem(`Raffle:${guildId}:pending`, userId)
          .srem(`Raffle:${guildId}:confirmed`, userId)
          .del(`Raffle:${guildId}:confirmed:${userId}`)
          .sadd(`Raffle:${guildId}:issues`, userId)
          .execAsync();

        const managers = response[0];

        // Fetch the user
        const user = bot.users.find((user) => {
          return userId === user.id;
        });

        await async.each(managers, async (managerId) => {
          const channel = await bot.getDMChannel(managerId);
          await channel.createMessage({
            embed: {
              color: 6897122,
              fields: [
                {
                  name: `Issue by ${user.username}`,
                  value: message
                }
              ]
            }
          });
        });

        return `Issue has been sent. Expect a message from a manager soon.`;
      }

      return `Only chosen players can use this command.\n` +
        `Please make sure your name was mentioned on the raffle results.`;
    default:
      return `There is no raffle happening right now.`
  }
};

/**
 * Confirms a winner's participation in the raffle
 * @param guildId ID of the raffle's guild
 * @param userId ID of the confirming user
 * @param battleTag Battle tag of the confirming user
 * @returns {Promise.<string>}
 */
const confirm = async (guildId, userId, battleTag) => {
  //Check pending for the userId,
  const response = await redis.multi()
    .get(`Raffle:${guildId}:state`)
    .sismember(`Raffle:${guildId}:pending`, userId)
    .sismember(`Raffle:${guildId}:issues`, userId)
    .execAsync();

  const status = response[0];
  const inPending = response[1];
  const inIssues = response[2];

  switch (status) {
    case state.inProgress:
    case state.closed:
      // Check if the person is in the pending or issues groups
      if (inPending || inIssues) {
        await redis.multi()
          .srem(`Raffle:${guildId}:pending`, userId)
          .srem(`Raffle:${guildId}:issues`, userId)
          .del(`Raffle:${guildId}:issues:${userId}`)
          .sadd(`Raffle:${guildId}:confirmed`, userId)
          .set(`Raffle:${guildId}:confirmed:${userId}`, battleTag)
          .execAsync();

        return `Confirmation complete, keep an eye on your friend requests in Overwatch.\n\n` +
          `Enjoy the games!`;
      }

      return `Only chosen players can confirm their battle tags.\n` +
        `Please make sure your name was mentioned on the raffle results.`;
    default:
      return `There is no raffle happening right now.`;
  }
};

/**
 * Withdraw from the raffle
 * @param guildId ID of the raffle's guild
 * @param userId ID of the user that wishes to withdraw
 * @returns {Promise.<String>}
 */
const withdraw = async (guildId, userId) => {
  const response = await redis.multi()
    .get(`Raffle:${guildId}:state`)
    .sismember(`Raffle:${guildId}:pending`, userId)
    .sismember(`Raffle:${guildId}:issues`, userId)
    .sismember(`Raffle:${guildId}:confirmed`, userId)
    .execAsync();

  const status = response[0];
  const inPending = response[1];
  const inIssues = response[2];
  const inConfirmed = response[3];

  switch (status) {
    case state.inProgress:
    case state.closed:
      // Remove the user from the list he is in.
      if (inPending || inIssues || inConfirmed) {
        await redis.multi()
          .srem(`Raffle:${guildId}:pending`, userId)
          .srem(`Raffle:${guildId}:issues`, userId)
          .del(`Raffle:${guildId}:issues:${userId}`)
          .srem(`Raffle:${guildId}:confirmed`, userId)
          .del(`Raffle:${guildId}:confirmed:${userId}`)
          .execAsync();

        return `You have withdrawn from the raffle. Join us again next time!`;
      }

      return `Only chosen players can withdraw from the raffle.\n` +
        `Please make sure your name was mentioned on the raffle results.`;
    default:
      return `There is no raffle happening right now.`;
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

/**
 * Broadcast a message to all managers of the raffle
 * @param guild Raffle's guild
 * @param message Message to send to managers
 * @returns {Promise.<*>}
 */
const broadcastToManagers = async (guild, message) => {
  return await async.each(guild.raffle.managers, async (managerId) => {
    const channel = await bot.getDMChannel(managerId);
    await channel.createMessage(message);
  });
};

module.exports = {
  state,
  addChannel,
  start,
  finish,
  enter,
  open,
  close,
  confirm,
  draw,
  info,
  issue,
  removeChannel,
  broadcastToChannels,
  addManagers,
  removeManagers,
  createOrPopulate,
  broadcastToManagers,
  populate,
  withdraw,
  startMonitor,
};

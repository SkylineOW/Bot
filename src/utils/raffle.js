const async = require('async');
const pe = require('utils/error');

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

  await Raffle.findByIdAndUpdate(guild.raffle._id, { $push: { channels: channelId } }, { new: true, safe: true });
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

  await Raffle.findByIdAndUpdate(guild.raffle.id, { $pull: { channels: channelId } }, { new: true, safe: true });
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
  let response = await new Promise((resolve) => {
    redis.multi()
      .get(`Raffle:${guildId}:state`)
      .sismember(`Raffle:${guildId}:entries`, user.id)
      .sismember(`Raffle:${guildId}:pending`, user.id)
      .hexists(`Raffle:${guildId}:confirmed`, user.id)
      .sismember(`Raffle:${guildId}:issues`, user.id)
      .exec((error, result) => {
        if (error) {
          console.log(pe.render(result));
          resolve(null);
        }
        resolve(result);
      });
  });

  if (!response) {
    return `Something went wrong, please try again.`;
  }

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
        const response = await new Promise((resolve) => {
          redis.sadd(`Raffle:${guildId}:entries`, user.id, (error, result) => {
            if (error) {
              console.log(pe.render(error));
              resolve(null);
            }
            resolve(result);
          });
        });

        if (!response) {
          return `Something went wrong, please try again.`;
        }

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
const open = async (guildId, duration = 0) => {
  // Fetch the raffle state.
  let response = await new Promise((resolve) => {
    redis.get(`Raffle:${guildId}:state`, (error, result) => {
      if (error) {
        console.log(pe.render(error));
        resolve('Error');
      }
      resolve(result);
    });
  });

  switch (response) {
    case state.closed:
      // Set the timeout for the duration of the raffle.
      const result = await new Promise((resolve) => {
        const query = redis.multi();

        query.set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, 'True')
          .set(`Raffle:${guildId}:next`, state.closed);

        if (duration) {
          query.expire(`Raffle:${guildId}:timeout`, duration * 60);
        }

        query.exec((error, result) => {
          if (error) {
            console.log(pe.render(error));
            resolve(null);
          }
          resolve(result);
        });
      });

      if (!result) {
        return `Something went wrong, please try again`;
      }

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

      break;
    case state.inProgress:
      return `The raffle is already open.`;
    case state.finished:
      return `The raffle has finished. Please use \`${config.prefix}raffle start\` instead to restart the raffle.`;
    case 'Error':
      return `Something went wrong, please try again`;
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
  let response = await new Promise((resolve) => {
    redis.get(`Raffle:${guildId}:state`, (error, result) => {
      if (error) {
        console.log(pe.render(error));
        resolve('Error');
      }
      resolve(result);
    });
  });

  switch (response) {
    case state.inProgress:
      const result = await new Promise((resolve) => {
        redis.multi()
          .set(`Raffle:${guildId}:state`, state.closed)
          .del(`Raffle:${guildId}:timeout`)
          .exec((error, result) => {
            if (error) {
              console.log(error);
              resolve(null);
            }
            resolve(result);
          });
      });

      if (!result) {
        return `Something went wrong, please try again.`;
      }

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

      break;
    case state.created:
      return 'A raffle that has not started, cannot be closed.';
    case state.closed:
      return 'The raffle is already closed.';
    case 'Error':
      return `Something went wrong, please try again.`;
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
  let response = await new Promise((resolve) => {
    redis.multi()
      .get(`Raffle:${guildId}:state`)
      .scard(`Raffle:${guildId}:entries`)
      .exec((error, result) => {
        if (error) {
          console.log(pe.render(error));
          resolve(['Error', 0]);
        }
        resolve(result);
      });
  });

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
      const list = await new Promise((resolve) => {
        redis.spop(`Raffle:${guildId}:entries`, total, (error, result) => {
          if (error) {
            console.log(pe.render(error));
            resolve(null);
          }
          resolve(result);
        });
      });

      if (!list) {
        return `Something went wrong, please try again.`;
      }

      // Fetch the user objects of the winners
      const winners = list.map((userId) => {
        return bot.users.find((user) => {
          return userId === user.id;
        });
      });

      // Add all the winners to the pending list.
      const response = await new Promise((resolve) => {
        redis.sadd(`Raffle:${guildId}:pending`, list, (error, result) => {
          if (error) {
            console.log(pe.render(error));
            resolve(null);
          }
          resolve(result);
        });
      });

      const mentions = winners.map((winner) => {
        return winner.mention
      }).join('\n');

      if (!response) {
        return `Something went wrong, but here is a list of winners:\n${winners.map((user) => {
          return user.username;
        }).join('\n')}`;
      }

      // Start the pending process for the winners.
      await async.each(winners, async (user, callback) => {
        await informWinner(guildId, user);
        callback();
      });

      let fields = [
        {
          name: `❯ Winners`,
          inline: true,
          value: mentions,
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

      // Send online managers the manage message and add them as active managers.
      await async.each(guild.raffle.managers, async (userId, callback) => {
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

          const response = await new Promise((resolve) => {
            redis.hset(`Raffle:${guildId}:managers`, userId, message.id, (error, result) => {
              if (error) {
                console.log(pe.render(error));
                resolve(null);
              }
              resolve(result);
            });
          });

          if (!response) {
            console.log(`[Error] Could not add manager to the list.\nGuild: ${guild.name}\nManger:${member.username}`);
          }
        }

        callback();
      });
      break;
    case 'Error':
      return `Something went wrong, please try again.`;
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
  const message = await bot.createMessage(channel.id, `Congratulations!\nYou've been chosen as a winner for the raffle.\n` +
    `Please reply with one of the following commands:\n\n` +
    `\`${config.prefix}confirm Battletag#1234\` - I want to play!\n\n` +
    `\`${config.prefix}issue Insert message here\` - Something is wrong, I need an adult!\n\n` +
    `\`${config.prefix}withdraw\` - I changed my mind, maybe next time.\n\n` +
    `Please reply in the next 10 minutes or you will withdraw automatically.`);

  console.log(`[Info] DM Message sent to use for raffle entry\nGuild: ${guildId}\nUser:${user.id}\nMessage:${message.id}`);

  // Start timeouts for all the users chosen.
  // ToDo: These timeouts should be able to reset if the bot dies.
  setTimeout(() => {
    redis.sismember(`Raffle:${guildId}:pending`, user.id, async (error, result) => {
      if (error) {
        console.log(pe.render(error));
      }

      if (result) {
        // Withdraw the user from the raffle.
        await withdraw(guildId, user.id);
        await channel.createMessage(`You have automatically withdrawn from the raffle due to inactivity.`);
      }
    });
  }, 600 * 1000); // 10 min timeout.
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
        resolve(null);
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
const start = async (guildId, duration = 0) => {
  // Fetch the raffle state.
  let status = await new Promise((resolve) => {
    redis.get(`Raffle:${guildId}:state`, (error, result) => {
      if (error) {
        console.log(pe.render(error));
        result('Error');
      }
      resolve(result);
    });
  });

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

      // Set the timeout for the duration of the raffle to close it.
      const result = await new Promise((resolve) => {
        const query = redis.multi();

        query.set(`Raffle:${guildId}:state`, state.inProgress)
          .set(`Raffle:${guildId}:timeout`, 'True')
          .set(`Raffle:${guildId}:next`, state.closed);

        if (duration) {
          query.expire(`Raffle:${guildId}:timeout`, duration * 60);
        }

        query.exec((error, result) => {
          if (error) {
            console.log(pe.render(error));
            resolve(null);
          }
          resolve(result);
        });
      });

      if (!result) {
        return `Something went wrong, please try again.`;
      }

      // Broadcast to all channels that the raffle is starting.
      await broadcastToChannels(guild, `The Funcast with Skyline raffle has started!\n` +
        `Please use \`${config.prefix}enter\` to participate.`);

      // Inform all managers the raffle is starting.
      await broadcastToManagers(guild, `A raffle you manage has started!`);

      break;
    case state.inProgress:
      return 'The raffle is already in progress.';
    case state.closed:
      return `A closed raffle cannot be started. If you\'d like to extend the raffle, use \`${config.prefix}raffle open\` instead.`;
    case 'Error':
      return 'Something went wrong, please try again.';
    default:
      return 'The raffle is currently in progress. Please finish it before starting it again.';
  }
};

/**
 * Helper function for updating the raffle boxes in channels
 * @param status Status of raffle
 * @param channels Channels to update (Hash converted to array)
 * @param entryCount Number of people that have entered the raffle
 * @param remainingTime Time left until the raffle closes in seconds
 * @returns {Promise.<void>}
 */
const updateChannels = async (status, channels, entryCount, remainingTime) => {
  if (channels) {
    await async.each(channels, async (entry) => {

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
          value: time.formatSeconds(remainingTime),
          inline: true,
        });
      }

      const channel = await bot.getChannel(entry.key);
      await channel.editMessage(entry.value, {
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
};

/**
 * Helper function for updating the result boxes of managers.
 * @param managers Managers to send updates to (Hash converted to array)
 * @param Pending Array of pending entrant id's
 * @param confirmations Array of confirmed entrants (Hash converted to array)
 * @param Issues Array of id's for entrants with issues.
 * @returns {Promise.<void>}
 */
const updateManagers = async (managers, Pending, confirmations, Issues) => {
  if (managers && Pending && confirmations && Issues) {
    let pending = [];
    Pending.map((userId) => {
      const user = bot.users.find((user) => {
        return user.id === userId;
      });

      if(user && user.username) {
        pending.push(user.username);
      }
    });
    pending = pending.join('\n');

    const confirmed = [];
    await async.eachSeries(confirmations, async (confirmation, callback) => {
      const user = bot.users.find((user) => {
        return confirmation.key === user.id;
      });

      if (user) {
        confirmed.push(`${user.username}: ${confirmation.value}`);
      }
      callback();
    });

    let issues = [];
    Issues.map((userId) => {
      const user = bot.users.find((user) => {
        return userId === user.id;
      });

      if (user && user.username) {
        issues.push(user.username);
      }
    });
    issues = issues.join('\n');

    await async.each(managers, async (manager) => {
      const channel = await bot.getDMChannel(manager.key);

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
              name: `❯ Confirmed: ${confirmed.length}`,
              inline: true,
              value: confirmed.length ? confirmed.join('\n') : 'None',
            }
          ],
        }
      };

      await channel.editMessage(manager.value, message);
    });
  }
};

/**
 * Helper function for checking when the raffle should close.
 * @param guildId ID of the raffle's guild
 * @param status current status of the raffle
 * @param remainingTime Time remaining before the raffle should close
 * @param nextState The state to place the raffle in once the time runs out.
 * @returns {Promise.<void>}
 */
const stateTimer = async (guildId, status, remainingTime, nextState) => {
  if (status === state.inProgress) {
    if (remainingTime <= -2) {
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
};

/**
 * Start timers for updating embeds for this raffle
 * @param guildId ID of the raffle's guild
 * @param id ID user for the lock to ensure only 1 valid timer
 * @returns {Promise.<void>}
 */
const startMonitor = (guildId, id) => {
  // Change the locks to match the id of this monitor session
  redis.set(`Raffle:${guildId}:lock`, id, async (error) => {
    if (error) {
      console.log(pe.render(error));
      return null;
    }

    const monitor = async () => {
      // Fetch all the data needed for an update.
      const response = await new Promise((resolve) => {
        redis.multi()
          .get(`Raffle:${guildId}:state`)
          .get(`Raffle:${guildId}:lock`)
          .hgetall(`Raffle:${guildId}:channels`)
          .scard(`Raffle:${guildId}:entries`)
          .ttl(`Raffle:${guildId}:timeout`)
          .hgetall(`Raffle:${guildId}:managers`)
          .smembers(`Raffle:${guildId}:pending`)
          .hgetall(`Raffle:${guildId}:confirmed`)
          .smembers(`Raffle:${guildId}:issues`)
          .get(`Raffle:${guildId}:next`)
          .expire(`Raffle:${guildId}:lock`, 5)
          .exec((error, result) => {
            if (error) {
              console.log(pe.render(error));
              resolve(null);
            }
            resolve(result);
          });
      });

      if (!response) {
        console.log(`[Error] Could not retrieve update information:\nGuild: ${guildId}`);
        return null;
      }

      const status = response[0];
      const guildLock = response[1];
      const channels = hashToArray(response[2]);
      const entryCount = response[3];
      const remainingTime = response[4];
      const managers = hashToArray(response[5]);
      const pending = response[6];
      const confirmations = hashToArray(response[7]);
      const issues = response[8];
      const nextState = response[9];

      switch (status) {
        case state.inProgress:
          await updateChannels(status, channels, entryCount, remainingTime);
          await updateManagers(managers, pending, confirmations, issues);
          await stateTimer(guildId, status, remainingTime, nextState);
          break;
        case state.closed:
          await updateChannels(status, channels, entryCount, remainingTime);
          await updateManagers(managers, pending, confirmations, issues);
          break;
        default:
          break;
      }

      // Repeat if lock is good.
      if (guildLock === `${id}`) {
        setTimeout(monitor, 3000);
      }
    };

    await monitor();
  });
};

/**
 * Concludes a raffle, discarding everything associated with it
 * @param guildId ID of the raffle's guild
 * @returns {Promise.<String>}
 */
const finish = async (guildId) => {
  // Fetch the raffle state.
  let status = await new Promise((resolve) => {
    redis.get(`Raffle:${guildId}:state`, (error, result) => {
      if (error) {
        console.log(pe.render(error));
        resolve('Error');
      }
      resolve(result);
    });
  });

  switch (status) {
    case state.inProgress:
    case state.closed:
      const response = await new Promise((resolve) => {
        redis.multi()
          .del(`Raffle:${guildId}:state`)
          .del(`Raffle:${guildId}:next`)
          .del(`Raffle:${guildId}:timeout`)
          .del(`Raffle:${guildId}:entries`)
          .del(`Raffle:${guildId}:pending`)
          .del(`Raffle:${guildId}:confirmed`)
          .del(`Raffle:${guildId}:channels`)
          .del(`Raffle:${guildId}:managers`)
          .del(`Raffle:${guildId}:issues`)
          .exec((error, result) => {
            if (error) {
              console.log(pe.render(error));
              resolve(null);
            }
            resolve(result);
          });
      });

      if (!response) {
        console.log(`[Error] Could not clean up raffle.\nGuild: ${guildId}`);
      }

      // Fetch the guild with the provided id.
      let guild = await Guild.fetchOrCreate(guildId);

      // Create or populate the raffle of the guild.
      guild = await createOrPopulate(guild);

      // Broadcast on all channels listed that the raffle is finished.
      await broadcastToChannels(guild, `The raffle is finished.`);

      // Inform all managers the the raffle is starting.
      await broadcastToManagers(guild, `A raffle you manage has finished.`);

      break;
    case 'Error':
      return `Something went wrong, please try again.`;
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
  const response = await new Promise((resolve) => {
    redis.multi()
      .get(`Raffle:${guildId}:state`)
      .scard(`Raffle:${guildId}:entries`)
      .ttl(`Raffle:${guildId}:timeout`)
      .hget(`Raffle:${guildId}:channels`, channel.id)
      .exec((error, result) => {
        if (error) {
          console.log(pe.render(error));
          resolve(null);
        }
        resolve(result);
      });
  });

  if (!response) {
    return `Something went wrong, please try again.`;
  }

  const status = response[0];
  const entryCount = response[1];
  const remainingTime = response[2];
  const lastMessageId = response[3];

  switch (status) {
    case state.inProgress:
    case state.closed:
      if (lastMessageId) {
        await channel.deleteMessage(lastMessageId);
      }

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
          value: time.formatSeconds(remainingTime),
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

      const response = await new Promise((resolve) => {
        redis.hset(`Raffle:${guildId}:channels`, channel.id, message.id, (error, result) => {
          if (error) {
            console.log(pe.render(error));
            resolve(null);
          }
          resolve(result);
        });
      });

      if (!response) {
        console.log(`[Error] Could not set the raffle message.\nGuild: ${guildId}\nChannel: ${channel.name}`);
      }
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
  const response = await new Promise((resolve) => {
    redis.multi()
      .get(`Raffle:${guildId}:state`)
      .sismember(`Raffle:${guildId}:pending`, userId)
      .hexists(`Raffle:${guildId}:confirmed`, userId)
      .exec((error, result) => {
        if (error) {
          console.log(pe.render(error));
          resolve(null);
        }
        resolve(result);
      });
  });

  if (!response) {
    return `Something went wrong, please try again.`;
  }

  const status = response[0];
  const inPending = response[1];
  const inConfirmed = response[2];

  switch (status) {
    case state.inProgress:
    case state.closed:
      // Check if the person is in the right groups
      if (inPending || inConfirmed) {
        const response = await new Promise((resolve) => {
          redis.multi()
            .hkeys(`Raffle:${guildId}:managers`)
            .srem(`Raffle:${guildId}:pending`, userId)
            .hdel(`Raffle:${guildId}:confirmed`, userId)
            .sadd(`Raffle:${guildId}:issues`, userId)
            .exec((error, result) => {
              if (error) {
                console.log(pe.render(error));
                resolve(null);
              }
              resolve(result);
            });
        });

        if (!response) {
          return `Something went wrong, please try again`;
        }

        const managers = response[0];

        // Fetch the user
        const user = bot.users.find((user) => {
          return userId === user.id;
        });

        await async.each(managers, async (managerId) => {
          const channel = await bot.getDMChannel(managerId);
          await channel.createMessage({
            embed: {
              title: `${user.mention} has an issue:`,
              description: message,
              color: 6897122,
            }
          });
        });

        return `Issue has been sent.\n` +
          `Expect a message from a mod soon.`;
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
  const response = await new Promise((resolve) => {
    redis.multi()
      .get(`Raffle:${guildId}:state`)
      .sismember(`Raffle:${guildId}:pending`, userId)
      .sismember(`Raffle:${guildId}:issues`, userId)
      .exec((error, result) => {
        if (error) {
          console.log(pe.render(error));
          resolve(null);
        }
        resolve(result);
      });
  });

  if (!response) {
    return `Something went wrong, please try again.`;
  }

  const status = response[0];
  const inPending = response[1];
  const inIssues = response[2];

  switch (status) {
    case state.inProgress:
    case state.closed:
      // Check if the person is in the pending or issues groups
      if (inPending || inIssues) {
        const response = await new Promise((resolve) => {
          redis.multi()
            .srem(`Raffle:${guildId}:pending`, userId)
            .srem(`Raffle:${guildId}:issues`, userId)
            .del(`Raffle:${guildId}:issues:${userId}`)
            .hset(`Raffle:${guildId}:confirmed`, userId, battleTag)
            .exec((error, result) => {
              if (error) {
                console.log(pe.render(error));
                resolve(null);
              }
              resolve(result);
            });
        });

        if (!response) {
          return `Something went wrong, please confirm again.`;
        }

        return `Confirmation complete.\n\n` +
          `**Please make sure you have Overwatch running on the correct region.**\n` +
          `**A mod will send you a custom game invite shortly.**\n\n` +
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
  const response = await new Promise((resolve) => {
    redis.multi()
      .get(`Raffle:${guildId}:state`)
      .sismember(`Raffle:${guildId}:pending`, userId)
      .sismember(`Raffle:${guildId}:issues`, userId)
      .hexists(`Raffle:${guildId}:confirmed`, userId)
      .exec((error, result) => {
        if (error) {
          console.log(pe.render(error));
          resolve(null)
        }
        resolve(result);
      });
  });

  if (!response) {
    return `Something went wrong, please try again.`;
  }

  const status = response[0];
  const inPending = response[1];
  const inIssues = response[2];
  const inConfirmed = response[3];

  switch (status) {
    case state.inProgress:
    case state.closed:
      // Remove the user from the list he is in.
      if (inPending || inIssues || inConfirmed) {
        const result = await new Promise((resolve) => {
          redis.multi()
            .srem(`Raffle:${guildId}:pending`, userId)
            .srem(`Raffle:${guildId}:issues`, userId)
            .del(`Raffle:${guildId}:issues:${userId}`)
            .hdel(`Raffle:${guildId}:confirmed`, userId)
            .exec((error, result) => {
              if (error) {
                console.log(pe.render(error));
                resolve(null);
              }
              resolve(result);
            });
        });

        if (!result) {
          return `Could not withdraw from the raffle at this time, please try again.`;
        }

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

  await Raffle.findByIdAndUpdate(guild.raffle._id, { $push: { managers: { $each: additions } } }, {
    new: true,
    safe: true
  });

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

  // Populate raffle
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

  await Raffle.findByIdAndUpdate(guild.raffle._id, { $pull: { managers: { $in: removals } } }, {
    new: true,
    safe: true
  });

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

const hashToArray = (hash) => {
  const result = [];

  if (hash) {
    let keys = Object.keys(hash);
    if (keys.length > 0) {
      for (let key of keys) {
        result.push({
          key,
          value: hash[key],
        });
      }
    }
  }

  return result;
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

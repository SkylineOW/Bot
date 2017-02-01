const bot = require('bot');

const Guild = require('data/models/guilds');
const User = require('utils/user');

/**
 * Determine which guild a command is for
 * @param msg The command message
 * @param func A function that should be executed with the correct guildId
 * @returns {Promise.<String>}
 */
const determine = async (msg, func) => {
  // Check if this message is a dm or not.
  if (msg.member) {
    // Message is posted in a guild
    return await func(msg.channel.guild.id);
  }

  // This is a dm.
  // Find the guilds the bot and user have in common.
  const guilds = getGuilds(msg.author.id);

  // If there is only 1 guild, assume its the guild the user want to control.
  if (guilds.length === 1) {
    return await func(guilds[0].id);
  }

  // Check if the user has a selected guild.
  const user = await User.fetchOrCreate(msg.author.id);

  if (!user || !user.guild) {
    return `Please use \`!guilds select\` to specify the guild this command is meant for first.`;
  }

  // User has a selected guild, start raffle of that guild.
  return await func(user.guild);
};

/**
 * Tries to find a guild with the given ID
 * @param guildId ID of the guild to find or create
 * @returns {Promise.<Query>}
 */
const fetch = async (guildId) => {
  return await Guild.findById(guildId);
};

/**
 * Finds or creates the guild with the provided ID
 * @param guildId ID of the guild to find
 * @returns {Promise.<Query>}
 */
const fetchOrCreate = async (guildId) => {
  // Fetch the guild
  let guild = await Guild.findById(guildId);

  // Create it if it doesn't exist.
  if (!guild) {
    guild = await Guild.create({_id: guildId});
  }

  return guild;
};

/**
 * Finds the guilds a user and bot have in common
 * @param UserId Id of the user to search for
 * @returns {Array.<Guild>} Array of guilds sorted by guild Id's
 */
const getGuilds = (UserId) => {
  // ToDo: Filter according to the correct permissions for the command as well.
  return bot.guilds.filter((guild) => {
    return guild.members.find((member) => {
      return UserId === member.id
    });
  }).sort((a, b) => {
    return a.id - b.id;
  });
};

/**
 * Displays a summary of the user's guilds in the channel of the provided message
 * @param msg Command message
 * @returns {Promise.<void>}
 */
const info = async (msg) => {
  const guilds = getGuilds(msg.author.id);

  const fields = [];

  for (let i = 0; i < guilds.length; i++) {
    let details = `**Members:** ${guilds[i].memberCount}`;
    details += `\n**Regiom:** ${guilds[i].region}`;
    details += `\n**Roles:**`;

    const member = guilds[i].members.find((member) => {
      return msg.author.id === member.id
    });

    guilds[i].roles.filter((role) => {
      return member.roles.indexOf(role.id) > 0;
    }).map((role) => {
      details += `\n• ${role.name}`
    });

    fields.push({
      name: `${i + 1} ❯ ${guilds[i].name}`,
      value: details,
      inline: true,
    });
  }

  await msg.channel.createMessage({
    embed: {
      color: 6897122,
      author: {
        name: `Guilds`,
      },
      fields: fields
    }
  });
};

/**
 * Sets a guild's raffle equal to the provided raffle
 * @param guildId ID of guild to change.
 * @param raffle New value of raffle
 * @returns {Promise.<Query>}
 */
const setRaffle = async (guildId, raffle) => {
  return await Guild.findByIdAndUpdate(guildId, {raffle: raffle}, {new: true, safe: true});
};

/**
 * Sets the guild a user is commanding
 * @param msg Command message
 * @param selection Chosen guild number
 * @returns {Promise.<string>}
 */
const select = async (msg, selection) => {
  // Get the guilds the bot and user have in common.
  const guilds = getGuilds(msg.author.id);

  // Validate the input against the guild array length.
  if (selection > guilds.length) {
    return `There is no guild with that number. Please use \`!guilds\` to find the number of the guild you wish to command.`;
  }

  // Update the user with the selected guild.
  await User.setGuild(msg.author.id, guilds[selection - 1].id);

  return `Your messages to the bot will now control the guild: ${guilds[selection - 1].name}`;
};

module.exports = {
  determine,
  fetch,
  fetchOrCreate,
  info,
  getGuilds,
  setRaffle,
  select
};

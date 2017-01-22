/**
 * Command for joining manager list.
 */

const Guild = require('data/mongoose').models.Guild;
const Raffle = require('data/mongoose').models.Raffle;

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Join the list to receive raffle results or mention people to add them.`,
  fullDescription: '',
  usage: '\`mention mention ...\`',
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
    // ToDo: Implement adding mentioned users and not just the command user.

    const addManager = async() => {
      // Fetch the guild
      let guild = await Guild.findById(msg.channel.guild.id);

      if (!guild) {
        // No guild, create a default one.
        guild = await Guild.create({_id: msg.channel.guild.id});
      }

      // If there are no raffle settings for the guild, create defaults based on message.
      if (!guild.raffle) {
        const raffle = await Raffle.create({managers: [msg.author.id], guild: guild});

        guild = await Guild.findByIdAndUpdate(msg.channel.guild.id, {raffle: raffle}, {new: true, safe: true});
      } else {

        guild = await new Promise((resolve) => {
          guild.populate('raffle', (error, result) => {
            resolve(result);
          });
        });

        // Check if the user is registered
        if (guild.raffle.managers.indexOf(msg.author.id) !== -1) {
          return `${msg.author.mention} is already managing the raffle.`;
        }

        await Raffle.findByIdAndUpdate(guild.raffle._id, {$push: {managers: msg.author.id}}, {new: true, safe: true});
      }

      if (guild.raffle.managers.length > 0) {
        return `${msg.author.mention} now also manages the raffle.`;
      } else {
        return `${msg.author.mention} now manages the raffle.`;
      }
    };

    // Managers can be added regardless of the raffle state.
    return await addManager();
  },
  options: options,
};
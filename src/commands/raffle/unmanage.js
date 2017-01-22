/**
 * Command for leaving manager list
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
  description: `Leave the list to receive raffle results or mention people to remove them.`,
  fullDescription: ``,
  usage: `mention mention ...`,
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
  exec: async(msg, args) => {
    // Input validation
    // ToDo: Implement removing mentioned users and not just the command user.

    const removeManager = async() => {
      // Fetch the guild
      let guild = await Guild.findById(msg.channel.guild.id);

      if (!guild || !guild.raffle) {
        //No guild, exit out.
        return `${msg.author.mention} is not managing the raffle.`;
      }

      guild = await new Promise((resolve) => {
        guild.populate('raffle', (error, result) => {
          resolve(result);
        });
      });

      if (guild.raffle.managers.indexOf(msg.author.id) === -1) {
        return `${msg.author.mention} is not managing the raffle.`;
      }

      await Raffle.findByIdAndUpdate(guild.raffle._id, {$pull: {managers: msg.author.id}}, {new: true, safe: true});
      return `The raffle is no longer managed by ${msg.author.mention}`;
    };

    // Managers can be removed regardless of the raffle state.
    return await removeManager();
  },
  options: options,
};
/**
 * Command for removing the raffle outputs from the channel this is typed in.
 */

const Guild = require('data/mongoose').models.Guild;
const Raffle = require('data/mongoose').models.Raffle;

const label = 'remove';
const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Remove the channel from the list the raffle should announce in.`,
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
      // Input validation
      if (args.length > 0) {
        return `Invalid usage. Do \`!help raffle remove\` to view proper usage.`;
      }

      const removeChannel = async() => {
        // Fetch the guild
        let guild = await Guild.findById(msg.guild.id);

        if (!guild || !guild.raffle) {
          // No guild, exit out.
          return `The raffle does not use this channel.`;
        }

        guild = await new Promise((resolve) => {
          guild.populate('raffle', (error, result) => {
            resolve(result);
          });
        });

        if(guild.raffle.channels.indexOf(msg.channel.id) === -1) {
          return `The raffle does not use this channel.`;
        }

        // Raffle needs at least 1 channel to post results in.
        if (guild.raffle.channels.length <= 1) {
          return 'The raffle needs at least one channel to post results in.\nPlease add another channel before removing this one.';
        }

        await Raffle.findByIdAndUpdate(guild.raffle._id, {$pull: {channels: msg.channel.id}}, {new: true, safe: true});
        return `The raffle no longer uses this channel.`;
      };

      // Channels can be removed regardless of the raffle state.
      return await removeChannel();

    }, options);

    // Register subcommands
  }
};
/**
 * Command for adding the raffle outputs to the channel this is typed in.
 */

const Guild = require('data/mongoose').models.Guild;
const Raffle = require('data/mongoose').models.Raffle;

const label = 'add';
const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: true,
  dmOnly: false,
  description: `Add the channel to the list the raffle should announce in.`,
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
      //Input validation
      if (args.length > 0) {
        return `Invalid usage. Do \`!help raffle add\` to view proper usage.`;
      }

      const addChannel = async() => {
        // Fetch the guild
        let guild = await Guild.findById(msg.guild.id);

        if (!guild) {
          // No guild, create a default one.
          guild = await Guild.create({_id: msg.guild.id});
        }

        // If there are no raffle settings for this guild, create default based on message.
        if (!guild.raffle) {
          const raffle = await Raffle.create({channels: [msg.channel.id], guild: guild});

          guild = await Guild.findByIdAndUpdate(msg.guild.id, {raffle: raffle}, {new: true, safe: true});
        } else {

          guild = await new Promise((resolve) => {
            guild.populate('raffle', (error, result) => {
              resolve(result);
            });
          });

          //Check if the channel is registered.
          if (guild.raffle.channels.indexOf(msg.channel.id) !== -1) {
            return 'The raffle already uses this channel.';
          }

          await Raffle.findByIdAndUpdate(guild.raffle._id, {$push: {channels: msg.channel.id}}, {new: true, safe: true});
        }

        return 'The raffle now uses this channel.';
      };

      // Channels can be added regardless of the raffle state.
      return await addChannel();
    }, options);

    // Register subcommands
  }
};

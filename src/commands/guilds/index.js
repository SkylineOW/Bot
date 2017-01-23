/**
 * Command for retrieving a list of guilds the bot and user has in common.
 */

const bot = require('bot');
const utils = require('utils');

const options = {
  aliases: [],
  caseInsensitive: false,
  deleteCommand: false,
  argsRequired: false,
  guildOnly: false,
  dmOnly: true, // Dm only since this shows private information about user roles.
  description: `Fetch a list of all the guilds you and the bot share.`,
  fullDescription: '', //ToDo: Fill in a proper description of the command.
  usage: '',
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
  exec: async (msg, args) => {
    if (args.length > 0) {
      return `Invalid usage. Do \`!help guilds\` to view proper usage.`;
    }

    try {
      const guilds = utils.getGuilds(bot, msg.author.id);

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
          name: `    ❯ ${guilds[i].name}`,
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
    }
    catch (error) {
      console.log(error.stack);
    }
  },
  options: options
};

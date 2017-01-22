// // Profile related
// bot.registerCommand('claim', async (msg, args) => {
//   //Input validation
//   if (args.length > 1) {
//     return `Only provide the battle tag you wish to claim in the format \`BattleTag-####\``
//   }
//   if(args[0].match(/^\D\w{2,11}-\d{4,5}$/) === null) {
//     return `Incorrect format.\nPlease provide your battle tag in the format \`BattleTag-####\``
//   }
//
//   const response = await bot.createMessage(msg.channel.id, `Claiming...`);
//
//   // Set of helper functions for repeating code and ease of use.
//   const CreateUser = async (id) => {
//     return await User.create({ _id: id });
//   };
//   const CreateProfile = async (user) => {
//     //TODO: Get all the values needed for the profile from ow api
//     return await Profile.create({ battle_tag: args[0], owner: user });
//   };
//   const ConnectProfile = async (user) => {
//     var profile = await Profile.findOne({ battle_tag: args[0] });
//     if (profile) {
//
//       // Battle tag is in use, check if this user owns it.
//       if (profile.owner === user._id) {
//         // Tag already attached, no need to claim again.
//         return await response.edit(`You have already claimed this battle tag.`);
//       }
//
//       // Tag belongs to someone else
//       return await response.edit(`This battle tag is already attached to an account. Remove it from that account first then try again.`);
//     }
//
//     // Battle tag is not in use, create a new profile for the battle tag.
//     profile = await CreateProfile(user);
//
//     // Add profile relation to user.
//     await user.setProfile(profile);
//
//     return await response.edit(`Battle tag successfully claimed.`);
//   };
//
//   var user = await User.findOne({ _id: msg.author.id });
//
//   if (user) {
//     // User was found, proceed to check the profile
//     if (user.profile) {
//       // Profile exists, populate it.
//       return await user.populate('profile', 'battle_tag', async (error, user) => {
//         // Check if the battle tag matches the provided tag
//         if(args[0] === user.profile.battle_tag) {
//           //Tag matches, no need to reclaim.
//           return await response.edit(`You have already claimed this battle tag.`);
//         }
//
//         // Different battle tag connected to account.
//         return await response.edit(`A different battle tag is attached to your account. Remove that battle tag first then try again.`);
//       });
//     }
//
//     // No Profile attached, handle connection.
//     await ConnectProfile(user);
//   }
//
//   // User was not found, create a user for this discord account.
//   user = await CreateUser(msg.author.id);
//
//   //Handle creation and connection of profile.
//   await ConnectProfile(user);
// }, {
//   aliases: [],
//   caseInsensitive: false,
//   deleteCommand: false,
//   argsRequired: true,
//   guildOnly: false,
//   dmOnly: false,
//   description: `Attach a battle tag to your discord account.`,
//   fullDescription: 'On the todo list! ;)',
//   usage: '\`!claim BattleTag-####\`',
//   requirements: {
//     userIDs: [],
//     permissions: {
//       'administrator': true,
//     },
//     roleIDs: [],
//     roleNames: [],
//     cooldown: 1000,
//     cooldownMessage: 'cooldown',
//     permissionMessage: 'permissions',
//   },
// });
module.exports = {
  exec: async (msg, args) => {},
  options: {}
};
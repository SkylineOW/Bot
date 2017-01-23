/**
 * Helper function that finds the guilds a user and bot have in common.
 * @param Bot to retrieve guilds from.
 * @param UserId Id of the user to search for.
 * @returns {Array.<Guild>} Array of guilds sorted by guild Id's.
 */
const getGuilds = (Bot, UserId) => {
  return Bot.guilds.filter((guild) => {
    return guild.members.find((member) => {
      return UserId === member.id
    });
  }).sort((a, b) => {
    return a.id - b.id;
  });
};

module.exports = {
  getGuilds,
};
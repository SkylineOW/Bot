const User = require('data/models/users');

/**
 * Tries to find a user with the provided ID
 * @param userId ID of the user
 * @returns {Promise.<Query>}
 */
const fetch = async (userId) => {
  return await User.findById(userId);
};

/**
 * Find or creates the user with the provided ID
 * @param userId ID of the user
 * @returns {Promise.<Query>}
 */
const fetchOrCreate = async (userId) => {
  //Fetch the user
  let user = await User.findById(userId);

  //Create it if it doesn't exist.
  if (!user) {
    user = await User.create({_id: userId});
  }

  return user;
};

/**
 * Sets the guild a user's dm commands control
 * @param userId ID of the user
 * @param guildId ID of the target guild
 * @returns {Promise.<Query>}
 */
const setGuild = async (userId, guildId) => {
  return User.findByIdAndUpdate(userId, {guild: guildId}, {new: true, safe: true, upsert: true});
};

module.exports = {
  fetch,
  fetchOrCreate,
  setGuild,
};
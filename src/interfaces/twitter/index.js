/**
 * Primary file for interfacing with twitter api.
 *
 * Create additional functions to simplify usage at other places.
 */

const Twitter = require('twitter');
const config = require('../../config');

/**
 * The main interface object with the twitter api. Primarily for one off implementations.
 * @type {Twitter}
 */
const client = new Twitter({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token_key: config.twitter.access_token_key,
  access_token_secret: config.twitter.access_token_secret,
});

module.exports = {
  client: client,

  /**
   * Returns a list of tweets of the provided user from the most recent up to the tweet with the provided ID.
   * @param user
   * @param since_id
   * @param callback
   */
  getLatest: function(user, since_id, callback) {
    return client.get('statuses/user_timeline', {
      screen_name: user,
      since_id: since_id,
      exclude_replies: true,
      trim_user: true,
    }, callback);
  }

};

/**
 * All the api calls related to interacting with twitch api.
 *
 * Create additional functions to simplify usage at other places.
 */

const axios = require('axios');
const config = require('config');

module.exports = {
  /**
   * Gets a json object describing the provided channel.
   * @param channel Channel string to query for.
   */
  getChannel: async function (channel) {
    try {
      return await axios.get(`https://api.twitch.tv/kraken/channels/${channel}`, {
        headers: {'Client-ID': config.twitch.client_id},
      });
    }
    catch (error) {
      return error.response.data;
    }
  },

  /**
   * Gets a json object describing the stream of the provided channel.
   * Returns null if the stream is offline.
   * @param channel Channel string to query for.
   */
  getStream: function (channel) {
    return axios.get(`https://api.twitch.tv/kraken/streams/${channel}`, {
      headers: {'Client-ID': config.twitch.client_id},
    });
  },
};

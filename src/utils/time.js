/**
 * Time related helper functions.
 */

const pe = require('utils/error');
const moment = require('moment');

/**
 * Converts seconds to a an HH:mm:ss format
 * @param seconds Time input as seconds
 * @param format The resulting format
 * @returns {String} Formatted time output
 */
const formatSeconds = (seconds, format = 'HH:mm:ss') => {
  try {
    if (seconds <= 0) {
      return 'Indefinite';
    }

    return moment().startOf('day').seconds(seconds).format(format);
  }
  catch (error) {
    console.log(pe.render(error));
  }
};

module.exports = {
  formatSeconds,
};
/**
 * Configuration file for the error handler
 */

const prettyError = require('pretty-error');
const pe = new prettyError();

pe.skipNodeFiles();

module.exports = pe;
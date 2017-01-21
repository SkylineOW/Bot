const axios = require('axios');

module.exports = {
  getAll: function(profile) {
    return axios(`https://owapi.net/api/v3/u/${profile}/blob`);
  },
};

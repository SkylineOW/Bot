const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  _id: {type: String, required: true, unique: true, index: true},
  guild: {type: String},
});

mongoose.model('User', UserSchema);
module.exports = mongoose.model('User');
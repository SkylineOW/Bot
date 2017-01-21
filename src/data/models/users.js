const mongoose = require('mongoose');

//Creation
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true, unique: true, index: true },
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
});

//Reading


//Updating
UserSchema.methods.setProfile = async function (profile) {
  this.profile = profile;
  return await this.save();
};

//Deletion

mongoose.model('User', UserSchema);
module.exports = mongoose.model('User');
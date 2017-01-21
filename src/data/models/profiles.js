const mongoose = require('mongoose');

//Creation
const ProfileSchema = new mongoose.Schema({
  battle_tag: { type: String, required: true, unique: true },
  region: { type: String, enum: ['NA', 'EU', 'KR'] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task'}
});

//Reading


//Updating


//Deletion

mongoose.model('Profile', ProfileSchema);
module.exports = mongoose.model('Profile');
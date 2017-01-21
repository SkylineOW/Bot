const mongoose = require('mongoose');

//Creation
var LogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  value: { type: String },
  created: { type: Date, default: Date.now() },
});

//Reading


//Updating


//Deletion

mongoose.model('Log', LogSchema);
module.exports = mongoose.model('Log');
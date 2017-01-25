/**
 * Guild specific data that should persist through server instances.
 */

const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
  _id: {type: String, required: true, unique: true, index: true},
  raffle: {type: mongoose.Schema.Types.ObjectId, ref: 'Raffle'},
});

mongoose.model('Guild', GuildSchema);
module.exports = mongoose.model('Guild');

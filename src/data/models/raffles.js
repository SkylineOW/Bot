/**
 * Raffle specific data that should persist through server instances.
 */

const mongoose = require('mongoose');

const RaffleSchema = new mongoose.Schema({
  channels: [{type: String, unique: true}],
  managers: [{type: String, unique: true}],
  guild: {type: mongoose.Schema.Types.ObjectId, ref: 'Guild'},
});

mongoose.model('Raffle', RaffleSchema);
module.exports = mongoose.model('Raffle');

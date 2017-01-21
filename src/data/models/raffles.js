/**
 * Raffle specific data that should persist through server instances.
 */

const mongoose = require('mongoose');

//Creation
const RaffleSchema = new mongoose.Schema({
  channels: [{type: String, unique: true}],
  managers: [{type: String, unique: true}],
  guild: {type: mongoose.Schema.Types.ObjectId, ref: 'Guild'},
});

// Reading

// Updating
RaffleSchema.methods.AddChannel = async function (channel) {
  if (this.channels.indexOf(channel) === -1) {
    this.channels.push(channel);
    console.log('Channel added');
    return await this.save();
  }

  console.log('Channel already added.');
  return this;
};

// Deletion
RaffleSchema.methods.RemoveChannel = async function (channel) {
  const index = this.channel.indexOf(channel);

  if (index > 1) {
    this.channels.splice(index, 1);
    console.log('Channel removed.');
    return await this.save();
  }

  console.log('Channel not found.');
  return this;
};

mongoose.model('Raffle', RaffleSchema);
module.exports = mongoose.model('Raffle');

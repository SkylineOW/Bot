/**
 * Guild specific data that should persist through server instances.
 */

const mongoose = require('mongoose');

// Creation
const GuildSchema = new mongoose.Schema({
  _id: { type: String, required: true, unique: true, index: true },
  broadcasts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast' }],
  raffle: { type: mongoose.Schema.Types.ObjectId, ref: 'Raffle'},
});

// Reading

// Updating
GuildSchema.methods.AddBroadcast = async function (broadcast) {
  if (this.broadcasts.indexOf(broadcast._id) === -1) {
    this.broadcasts.push(broadcast);
    console.log('Broadcast added.');
    return await this.save();
  }

  console.log('Broadcast already added.');
  return this;
};

// Deletion
GuildSchema.methods.RemoveBroadcast = async function (broadcast) {
  const index = this.owners.indexOf(broadcast._id);

  if(index > -1) {
    //TODO: Cascade deletion to the broadcast.

    this.broadcasts.splice(index, 1);
    console.log('Broadcast removed');
    return await this.save();
  }

  console.log('Broadcast not found.');
  return this;
};

mongoose.model('Guild', GuildSchema);
module.exports = mongoose.model('Guild');

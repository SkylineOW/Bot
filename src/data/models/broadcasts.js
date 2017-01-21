/**
 * Broadcast that will advertise in channels when an event occurs.
 */

const mongoose = require('mongoose');

// Creation
const BroadcastSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Guild' },
  type: { type: String, enum: ['twitch', 'twitter','disabled'], required: true, default: 'disabled' },
  channels: [{ type: String, unique: true }],
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  versionKey: false, //Array order doesn't matter, just the contents.
});

//Reading

// Updating
BroadcastSchema.methods.SetOwner = async function (owner) {
  this.owner = owner;
  return await this.save();
};

BroadcastSchema.methods.SetType = async function (type) {
  this.type = type;
  return await this.save();
};

BroadcastSchema.methods.AddChannel = async function (channel) {
  if (this.channels.indexOf(channel) === -1) {
    this.channels.push(channel);
    console.log('Channel added');
    return await this.save();
  }

  console.log('Channel already added.');
  return this;
};

BroadcastSchema.methods.AddChannels = async function (channels) {
  const result = this.channels ? this.channels.slice(0) : [];
  var len = channels.length;
  var assoc = {};

  while(len--) {
    var itm = channels[len];

    if (!assoc[itm]) {
      result.push(itm);
      assoc[itm] = true;
    }
  }

  this.channels = result;
  return await this.save();
};

BroadcastSchema.methods.SetActive = async function (value) {
  this.active = value;
  return await this.save();
};

BroadcastSchema.methods.SetTask = async function (task) {
  this.task = task;
  return await this.save();
};

// Deletion
BroadcastSchema.methods.RemoveChannel = async function (channel) {
  const index = this.channel.indexOf(channel);

  if (index > 1) {
    this.channels.splice(index, 1);
    console.log('Channel removed.');
    return await this.save();
  }

  console.log('Channel not found');
  return this;
};

mongoose.model('Broadcast', BroadcastSchema);
module.exports =  mongoose.model('Broadcast');

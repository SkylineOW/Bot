/**
 * Represents a task that should be performed once or periodically.
 *
 * Examples:
 * - Check if a streamer is streaming
 * - Relay tweets
 * - Perform a periodic calculation of some sort.
 */

const mongoose = require('mongoose');

// Creation
const TaskSchema = new mongoose.Schema({
  owners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  status: { type: String, enum: ['ready', 'executing'], default: 'ready' },
  next_performance: { type: Date, required: true },
  interval: { type: Number, default: 5 },
  type: { type: String, enum: ['twitch', 'twitter', 'profile'] },
  target: { type: String, required: true, index: true },
  deleted: { type: Boolean, default: false },
  versionKey: false, // Array order doesn't matter, just the contents.
});

// Reading

// Updating
TaskSchema.methods.AddOwner = async function (owner) {
  if (this.owners.indexOf(owner._id) === -1) {
    this.owners.push(owner);
    console.log('Owner added');
    return await this.save();
  }

  console.log('Owner already in collection');
  return this;
};

TaskSchema.methods.SetStatus = async function (status) {
  this.status = status;
  return await this.save();
};

TaskSchema.methods.SetLastPerformed = async function (time) {
  this.last_performed = time;
  return await this.save();
};

TaskSchema.methods.SetInterval = async function (interval) {
  this.interval = interval;
  return await this.save();
};

TaskSchema.methods.SetType = async function (type) {
  this.type = type;
  return await this.save();
};

TaskSchema.methods.SetTarget = async function (target) {
  this.target = target;
  return await this.save();
};

TaskSchema.methods.SetDelete = async function (deleted) {
  this.deleted = deleted;
  return await this.save();
};

// Deletion
TaskSchema.methods.RemoveOwner = async function (owner) {
  const index = this.owners.indexOf(owner._id);

  if(index > -1) {
    this.owners.splice(index, 1);
    console.log('Owner removed.');
    return await this.save();
  }

  console.log('Owner not found.');
  return this;
};

mongoose.model('Task', TaskSchema);
module.exports = mongoose.model('Task');

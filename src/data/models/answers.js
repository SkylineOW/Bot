const mongoose = require('mongoose');

//Creation
const AnswerSchema = new mongoose.Schema({
});

//Reading


//Updating


//Deletion

mongoose.model('Answer', AnswerSchema);
module.exports = mongoose.model('Answer');
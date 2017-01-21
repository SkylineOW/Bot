const mongoose = require('mongoose');

//Creation
const QuestionSchema = new mongoose.Schema({
});

//Reading


//Updating


//Deletion

mongoose.model('Question', QuestionSchema);
module.exports = mongoose.model('Question');
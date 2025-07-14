const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true }
});

module.exports = mongoose.model('User', UserSchema);

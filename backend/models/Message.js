const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: String,
  to: String,        // username if private message, else "All" id it's public message (only if it's not a group message)
  group: String,     // group name if group message, else null
  message: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);

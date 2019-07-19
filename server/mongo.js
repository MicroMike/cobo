const mongoose = require('mongoose');
const fs = require('fs');

const SAccount = new mongoose.Schema({
  account: String,
  pending: Boolean,
  check: Boolean,
  pause: Boolean,
  del: Boolean,
});
const MAccount = mongoose.model('Account', SAccount, 'accounts');

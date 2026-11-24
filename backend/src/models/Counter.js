const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: {
    type: String, // format: "YYYY-MM", e.g. "2026-11"
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  highestSerial: {
    type: Number,
    default: 0,
    min: 0
  },
  usedSerials: {
    type: [Number],
    default: []
  }
}, {
  timestamps: true,
  collection: 'counters'
});

CounterSchema.index({ year: 1, month: 1 });

module.exports = mongoose.model('Counter', CounterSchema);

const mongoose = require('mongoose');
const shortid = require('shortid');

// Limit characters for unique IDs
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true
    },
    shortUrl: {
        type: String,
        required: true,
        default: shortid.generate()
    },
    clicks: {
        type: Number,
        default: 0
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    modifiedDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Url', urlSchema);

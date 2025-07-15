const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

const MongoDbConnection = () => {
    try {
        mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        .then(() => console.log('MongoDB connected'))
        .catch((err) => console.log('MongoDB error:', err));
    } catch (error) {
        return console.log('MongoDB connection error:', error);
    }
}

module.exports = {
    MongoDbConnection
};


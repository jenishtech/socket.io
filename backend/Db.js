const mongoose = require('mongoose');

const MONGO_URI = `mongodb+srv://jenish:JfofIxVhvJ0ozEnz@cluster0.aoswjix.mongodb.net/chatapp_socket_io?retryWrites=true&w=majority&appName=Cluster0`

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


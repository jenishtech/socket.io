const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

//env variables
require('dotenv').config(); // Load environment variables from .env file


//database connection
const { MongoDbConnection } = require('./Db'); // Import the database connection
MongoDbConnection(); // Call the database connection
// Import models
const User = require('./models/User');
const Group = require('./models/Group');
const Message = require('./models/Message');


const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] }
});

let users = {}; // still keep in-memory socket.id → username


io.on("connection", (socket) => {
  socket.on("join", async (username) => {
    users[socket.id] = username;

    // Save user to DB if new
    await User.updateOne({ username }, { username }, { upsert: true });

    // Send full user list to everyone
    const userList = await User.find({}, 'username');
    io.emit("users_list", userList.map(u => u.username));

    // Send list of currently online users
    const onlineUsers = Object.values(users);
    io.emit("online_users", onlineUsers);

    // Send group list
    const groups = await Group.find({});
    io.emit("groups_list", groups);

    // Send last 20 public messages
    const publicMessages = await Message.find({ to: "All" }).sort({ timestamp: -1 }).limit(20);
    socket.emit("receive_message_history", publicMessages.reverse());

    // Private messages
    const privateMessages = await Message.find({
      $or: [{ sender: username }, { to: username }]
    }).sort({ timestamp: 1 });
    socket.emit("receive_private_message_history", privateMessages);

    // Group messages for groups user is in
    const userGroups = groups.filter(g => g.members.includes(username));
    for (const group of userGroups) {
      const groupMessages = await Message.find({ group: group.name }).sort({ timestamp: 1 });
      socket.emit("receive_group_message_history", { group: group.name, messages: groupMessages });
    }
  });

  // Create group (existing)
  socket.on("create_group", async (group) => {
    if (group.name && group.members?.length > 0) {
      const exists = await Group.findOne({ name: group.name });
      if (!exists) {
        await Group.create({ name: group.name, members: group.members });
        const groups = await Group.find({});
        io.emit("groups_list", groups);
      }
    }
  });

  // Send message (existing)
  socket.on("send_message", async (data) => {
    await Message.create(data);

    if (data.group) {
      const group = await Group.findOne({ name: data.group });
      if (group) {
        Object.entries(users).forEach(([id, uname]) => {
          if (group.members.includes(uname)) {
            io.to(id).emit("receive_message", data);
          }
        });
      }
    } else if (data.to && data.to !== "All") {
      const recipientSocketId = Object.keys(users).find(id => users[id] === data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receive_message", data);
        socket.emit("receive_message", data);
      }
    } else {
      io.emit("receive_message", data);
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    delete users[socket.id];

    // Update online users list
    const onlineUsers = Object.values(users);
    io.emit("online_users", onlineUsers);

    // Update user list
    const userList = await User.find({}, 'username');
    io.emit("users_list", userList.map(u => u.username));
  });
});


//router
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.get("/",async(req,res)=>{
  res.send("Server is running");
})

server.listen(process.env.PORT, () => console.log(`server running on port ${process.env.PORT}`));

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let users = {};
let groups = []; // [{name, members: []}]

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    users[socket.id] = username;
    io.emit("users_list", Object.values(users));
    io.emit("groups_list", groups);
  });

  socket.on("create_group", (group) => {
    if (
      group.name &&
      !groups.find((g) => g.name === group.name) &&
      Array.isArray(group.members) &&
      group.members.length > 0
    ) {
      groups.push({ name: group.name, members: group.members });
      io.emit("groups_list", groups);
    }
  });

  socket.on("send_message", (data) => {
    //send message to group. 
    if (data.group) {
      // Group message: send to all group members if online
      const group = groups.find((g) => g.name === data.group);
      if (group) {
        Object.entries(users).forEach(([id, uname]) => {
          if (group.members.includes(uname)) {
            io.to(id).emit("receive_message", data);
          }
        });
      }
    } 
    //send message to all users.
    else if (data.to && data.to !== "All") {
      const recipientSocketId = Object.keys(users).find(
        (id) => users[id] === data.to
      );
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receive_message", data);
        socket.emit("receive_message", data);
      }
    }
    //send mssage to private user. 
    else {
      io.emit("receive_message", data);
    }
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users_list", Object.values(users));
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
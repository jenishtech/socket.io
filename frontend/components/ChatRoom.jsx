import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./ChatRoom.css";

const socket = io("http://localhost:5000");

const ChatRoom = () => {
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || ""
  );
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [privateChats, setPrivateChats] = useState({});
  const [groups, setGroups] = useState([]); // [{name, members}]
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupChats, setGroupChats] = useState({});
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!username || username.trim() === "" || username === "null") {
      let name = "";
      while (!name) {
        name = prompt("Enter your name:")?.trim();
      }
      setUsername(name);
      localStorage.setItem("username", name);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      socket.emit("join", username);
    }
  }, [username]);

  useEffect(() => {
    socket.on("users_list", (userList) => {
      setUsers(userList.filter((u) => u !== username));
    });
    socket.on("groups_list", (serverGroups) => {
      setGroups(serverGroups);
    });
    socket.on("receive_message", (data) => {
      if (data.group) {
        setGroupChats((prev) => {
          const updated = { ...prev };
          if (!updated[data.group]) updated[data.group] = [];
          updated[data.group] = [...updated[data.group], data];
          return updated;
        });
      } else if (data.to && data.to !== "All") {
        const chatKey = data.sender === username ? data.to : data.sender;
        setPrivateChats((prev) => {
          const updated = { ...prev };
          if (!updated[chatKey]) updated[chatKey] = [];
          updated[chatKey] = [...updated[chatKey], data];
          return updated;
        });
      } else {
        setChatLog((prev) => [...prev, data]);
      }
    });
    return () => {
      socket.off("users_list");
      socket.off("groups_list");
      socket.off("receive_message");
    };
  }, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, privateChats, groupChats, selectedUser, selectedGroup]);

  const sendMessage = () => {
    if (message.trim() !== "") {
      if (selectedGroup) {           //send message to group
        const newMsg = { message, sender: username, group: selectedGroup };
        socket.emit("send_message", newMsg);
      } else if (selectedUser) {    //send message to private user
        const newMsg = { message, sender: username, to: selectedUser };
        socket.emit("send_message", newMsg);
      } else {                      //send message to public chat     
        const newMsg = { message, sender: username, to: "All" };
        socket.emit("send_message", newMsg);
      }
      setMessage("");
    }
  };

  // Group creation
  const handleCreateGroup = () => {
    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
    socket.emit("create_group", {
      name: newGroupName.trim(),
      members: [username, ...newGroupMembers],
    });
    setNewGroupName("");
    setNewGroupMembers([]);
  };

  // UI
  return (
    <div className="wa-container">
      <div className="wa-sidebar">
        <div className="wa-profile">
          <span className="wa-username">{username}</span>
        </div>
        <div className="wa-users">
          <div
            className={`wa-user ${
              !selectedUser && !selectedGroup ? "active" : ""
            }`}
            onClick={() => {
              setSelectedUser(null);
              setSelectedGroup(null);
            }}
          >
            <span>Public Chat</span>
          </div>
          {users.map((user) => (
            <div
              key={user}
              className={`wa-user ${selectedUser === user ? "active" : ""}`}
              onClick={() => {
                setSelectedUser(user);
                setSelectedGroup(null);
              }}
            >
              <span>{user}</span>
            </div>
          ))}
          <div className="wa-group-section">
            <div className="wa-group-title">Groups</div>
            {groups
              .filter((g) => g.members.includes(username))
              .map((group) => (
                <div
                  key={group.name}
                  className={`wa-user wa-group ${
                    selectedGroup === group.name ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedGroup(group.name);
                    setSelectedUser(null);
                  }}
                >
                  <span>#{group.name}</span>
                </div>
              ))}
            <div className="wa-group-create">
              <input
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <select
                multiple
                value={newGroupMembers}
                onChange={(e) =>
                  setNewGroupMembers(
                    Array.from(e.target.selectedOptions, (opt) => opt.value)
                  )
                }
              >
                {users.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button onClick={handleCreateGroup}>Create</button>
            </div>
          </div>
        </div>
      </div>
      <div className="wa-chat">
        <div className="chat-title">
          {selectedGroup
            ? `Group: #${selectedGroup}`
            : selectedUser
            ? `Chat with ${selectedUser}`
            : "🗨️ Public Chat Room"}
        </div>
        <div className="chat-box">
          {(selectedGroup
            ? groupChats[selectedGroup] || []
            : selectedUser
            ? privateChats[selectedUser] || []
            : chatLog
          ).map((msg, index) => (
            <div
              key={index}
              className={`message-wrapper ${
                msg.sender === username ? "own" : "other"
              }`}
            >
              <div className="message-bubble">
                {selectedGroup && (
                  <span className="private-label">[Group]</span>
                )}
                {selectedUser && (
                  <span className="private-label">[Private]</span>
                )}
                {msg.message}
              </div>
              <div className="message-sender">{msg.sender}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-box">
          <input
            type="text"
            value={message}
            placeholder="Type message"
            onChange={(e) => setMessage(e.target.value)}
            className="chat-input"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className="send-button">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;

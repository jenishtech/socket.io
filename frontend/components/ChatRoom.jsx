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
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupChats, setGroupChats] = useState({});
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const messagesEndRef = useRef(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  // Prompt for username
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

  // Send join event
  useEffect(() => {
    if (username) {
      socket.emit("join", username);
    }
  }, [username]);

  // Listen to server events
  useEffect(() => {
    socket.on("users_list", (userList) => {
      setUsers(userList.filter((u) => u !== username));
    });

    socket.on("groups_list", (serverGroups) => {
      setGroups(serverGroups);
    });

    socket.on("receive_message_history", (msgs) => {
      setChatLog(msgs);
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
          // Prevent duplicate message if already optimistically added
          if (
            updated[chatKey].length === 0 ||
            updated[chatKey][updated[chatKey].length - 1].message !==
              data.message ||
            updated[chatKey][updated[chatKey].length - 1].sender !== data.sender
          ) {
            updated[chatKey] = [...updated[chatKey], data];
          }
          return updated;
        });
      } else {
        setChatLog((prev) => {
          // Prevent duplicate message if already optimistically added
          if (
            prev.length === 0 ||
            prev[prev.length - 1].message !== data.message ||
            prev[prev.length - 1].sender !== data.sender
          ) {
            return [...prev, data];
          }
          return prev;
        });
      }
    });

    return () => {
      socket.off("users_list");
      socket.off("groups_list");
      socket.off("receive_message_history");
      socket.off("receive_message");
    };
  }, [username]);

  // Load chat histories
  useEffect(() => {
    socket.on("receive_private_message_history", (msgs) => {
      const chats = {};
      msgs.forEach((msg) => {
        const chatKey = msg.sender === username ? msg.to : msg.sender;
        if (!chats[chatKey]) chats[chatKey] = [];
        chats[chatKey].push(msg);
      });
      setPrivateChats(chats);
    });

    socket.on("receive_group_message_history", ({ group, messages }) => {
      setGroupChats((prev) => ({ ...prev, [group]: messages }));
    });

    return () => {
      socket.off("receive_private_message_history");
      socket.off("receive_group_message_history");
    };
  }, [username]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, privateChats, groupChats, selectedUser, selectedGroup]);

  // Send message
  const sendMessage = () => {
    if (message.trim() !== "") {
      let msgData;
      if (selectedGroup) {
        msgData = { message, sender: username, group: selectedGroup };
        socket.emit("send_message", msgData);
      } else if (selectedUser) {
        msgData = { message, sender: username, to: selectedUser };
        // Optimistically add message for sender
        setPrivateChats((prev) => {
          const updated = { ...prev };
          const chatKey = selectedUser;
          if (!updated[chatKey]) updated[chatKey] = [];
          updated[chatKey] = [...updated[chatKey], msgData];
          return updated;
        });
        socket.emit("send_message", msgData);
      } else {
        msgData = { message, sender: username, to: "All" };
        setChatLog((prev) => [...prev, msgData]);
        socket.emit("send_message", msgData);
      }
      setMessage("");
    }
  };

  // Create group
  const handleCreateGroup = () => {
    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
    socket.emit("create_group", {
      name: newGroupName.trim(),
      members: [username, ...newGroupMembers],
    });
    setNewGroupName("");
    setNewGroupMembers([]);
    setShowGroupForm(false);
  };

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
         <div>
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
         </div>
          <div className="wa-group-section">
            <div className="wa-group-title">
              <span>Groups</span>
              <button
                className="plus-button"
                onClick={() => setShowGroupForm(!showGroupForm)}
                title="Create Group"
              >
                +
              </button>
            </div>
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
                    setSelectedGroupMembers(group.members); // set members here
                  }}
                >
                  <span>#{group.name}</span>
                </div>
              ))}

            {showGroupForm && (
              <div className="wa-group-create">
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div className="checkbox-list">
                  {users.map((u) => (
                    <label key={u} className="checkbox-item">
                      <input
                        type="checkbox"
                        value={u}
                        checked={newGroupMembers.includes(u)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGroupMembers([...newGroupMembers, u]);
                          } else {
                            setNewGroupMembers(
                              newGroupMembers.filter((name) => name !== u)
                            );
                          }
                        }}
                      />
                      {u}
                    </label>
                  ))}
                </div>
                <button onClick={() => setShowGroupForm(false)}>Close</button>
                <button onClick={handleCreateGroup}>Create</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="wa-chat">
        <div className="chat-title">
          {selectedGroup ? (
            <div>
              <div>Group: #{selectedGroup}</div>
              <div className="group-members">
                Members: {selectedGroupMembers.join(", ")}
              </div>
            </div>
          ) : selectedUser ? (
          <>
            <div style={{ display: "flex", alignItems: "center" }}>
              Chat with : <h4>{selectedUser}</h4>
            </div>
          </>
          ) : (
            "🗨️ Public Chat Room"
          )}
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

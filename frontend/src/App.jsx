// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "../components/Login";
import ChatRoom from "../components/ChatRoom";

function App() {
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  return (
    <Router>
      <Routes>
        <Route path="/" element={username ? <Navigate to="/chat" /> : <Login onLogin={setUsername} />} />
        <Route path="/chat" element={username ? <ChatRoom /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

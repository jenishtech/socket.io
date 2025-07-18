import React, { useState } from "react";
import axios from "axios";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const API = import.meta.env.VITE_API_URL;
  // console.log("API: ", API);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (isRegister && !name.trim())) {
      return alert("All fields required");
    }
    try {
      if (isRegister) {
        await axios.post(`${API}/api/auth/register`, { username: name, email, password });
        alert('Registered successfully, now login!');
        setIsRegister(false);
      } else {
        const res = await axios.post(`${API}/api/auth/login`, { email, password });
        localStorage.setItem("username", res.data.username);
        localStorage.setItem("email", email);
        onLogin(res.data.username);
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Error');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{isRegister ? "Register" : "Login"} to Chat</h2>
        {isRegister && (
          <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">{isRegister ? "Register" : "Login"}</button>
        <button type="button" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Already have account? Login" : "No account? Register"}
        </button>
      </form>
    </div>
  );
};

export default Login;

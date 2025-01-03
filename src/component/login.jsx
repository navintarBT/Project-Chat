import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Username and password are required!");
      return;
    }

    try {
        const response = await axios.get('http://localhost:3001/read-user');
  
        if (response.status === 200) {
          const users = response.data;
          const user = users.find(user => user.userName === username && user.password === password);
  
          if (user) {
            const { status } = user;
            if (status === "sender") {
              navigate("/chatBot");
            } else {
              navigate("/receiver");
            }
          } else {
            alert("Invalid username or password!");
          }
        } else {
          alert("Failed to fetch user data. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Login failed. Please try again.");
      }
  };

  const handleRegister = () => {
    navigate('/register'); 
  };

  return (
    <div className="container">
      <h2 className="header">Login</h2>
      <div className="input-container">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input"
        />
      </div>
      <div className="input-container">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      <div id ="action">
      <button onClick={handleLogin} className="button">Login</button>
      <button onClick={handleRegister} className="button">Register</button>
      </div>
    </div>
  );
};

export default LoginPage;

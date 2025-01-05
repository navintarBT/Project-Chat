import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./register.css";
import axios from "axios";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!username || !email || !password || !status) {
      alert("All fields are required!");
      return;
    }

    const formData = {
     userName: username,
      gmail:email,
      password,
      status,
    };

    try {
      let response = await axios.post(`${serverUrl}/register`, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.data.success == true) {
      setUsername("");
      setEmail("");
      setPassword("");
      setStatus("");
      navigate("/login");
      }else{
        return
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Registration failed. Please try again.");
    }
  };
  const handleCancel = async () => {
    navigate("/login");
  }

  return (
    <div className="container">
      <h2 className="header">Register</h2>
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
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
      <div className="input-container">
        <label>
          <input
            type="radio"
            name="status"
            value="sender"
            checked={status === "sender"}
            onChange={(e) => setStatus(e.target.value)}
          />
          Sender
        </label>
        <label>
          <input
            type="radio"
            name="status"
            value="receiver"
            checked={status === "receiver"}
            onChange={(e) => setStatus(e.target.value)}
          />
          Receiver
        </label>
      </div>
      <div id ="action">
      <button id ="btn-register"onClick={handleRegister} className="button">Register</button>
      <button id ="btn-cancel"onClick={handleCancel} className="button">Cancel</button>
      </div>
      
    </div>
  );
};

export default RegisterPage;

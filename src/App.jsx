import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import ChatBox from "./component/chatBot";
import Receiver from "./component/receiver"; 
import LoginPage from "./component/login";
import RegisterPage from "./component/regrister";

const isAuthenticated = () => {
  return !!localStorage.getItem("authToken");
};

function App() {
  return (
    <Router>
      <div style={{ padding: "20px", fontFamily: "Arial" }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/chatBot"
            element={
              isAuthenticated() ? (
                <div>
                  <h1>Sender Page</h1>
                  <ChatBox />
                </div>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/receiver"
            element={
              isAuthenticated() ? (
                <div>
                  <h1>Receiver Page</h1>
                  <Receiver />
                </div>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

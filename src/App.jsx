import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import ChatBox from "./component/chatBot";
import ChatSidebar from "./component/chatSidebar";
import LoginPage from "./component/login";
import RegisterPage from "./component/regrister";
import PageStart from "./component/pageStart";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/pageStart"
          element={
            <div style={styles.chatContainer}>
              <ChatSidebar />
              <PageStart />
            </div>
          }
        />
        <Route
          path="/chatbot"
          element={
            <div style={styles.chatContainer}>
              <ChatSidebar />
              <ChatBox />
            </div>
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

const styles = {
  chatContainer: {
    display: "flex",
    flexDirection: "row",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
  },
};

export default App;

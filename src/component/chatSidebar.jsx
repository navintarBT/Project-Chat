import React from "react";
import "./chatSidebar.css";
import { useLocation, useNavigate } from "react-router-dom";

const ChatSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loggedInUser, allUsers } = location.state || {};
  const filteredUsers = allUsers.filter(user => user.id !== loggedInUser.id);
  const handleUserClick = (userId) => {
    console.log(userId);
    navigate(`/chatbot`, { state: { loggedInUser, allUsers, userId } });
  };

  return (
    <div className="sidebar">
      <div className="header">Chats</div>
      <input type="text" placeholder="Search or start a new chat" className="searchBar" />
      <div className="chatList">
        {filteredUsers.map((user) => (
          <div key={user.id} className="chatItem" onClick={() => handleUserClick(user.id)}>
            <div className="chatInfo">
              <strong>{user.userName}</strong>
              <div className="chatDetails">
                <span>Last message placeholder</span>
                <span>Time placeholder</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;

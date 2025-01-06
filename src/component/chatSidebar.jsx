import React from "react";
import "./chatSidebar.css";
import { useLocation, useNavigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";


const ChatSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loggedInUser, allUsers } = location.state || {};
  const filteredUsers = allUsers.filter(user => user.id !== loggedInUser.id);
  const handleUserClick = (userId, userName) => {
    console.log(userId);
    navigate(`/chatbot`, { state: { loggedInUser, allUsers, userId,userName  } });
  };

  const onLogout = (e) => {
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <div className="header">Chats
      <button className="logout-button" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
      <input type="text" placeholder="Search or start a new chat" className="searchBar" />
      <div className="chatList">
        {filteredUsers.map((user) => (
          <div key={user.id} className="chatItem" onClick={() => handleUserClick(user.id,user.userName)}>
            <div className="chatInfo">
             <i className="fas fa-user-circle" ></i>
              <strong>{user.userName}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;

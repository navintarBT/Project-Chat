import React, { useEffect, useState } from "react";
import "./chatBox.css";
import axios from "axios";
import { useLocation } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const ChatApp = () => {
  const location = useLocation();
  const { loggedInUser, allUsers, userId, userName } = location.state || {};
  const [inputValue, setInputValue] = useState('');
  const [fileBase, setFileBase] = useState(null);
  const [senderData, setSenderData] = useState(null);
  const [receiverData, setReceiverData] = useState(null);
  const [combinedData, setCombinedData] = useState([]);
  const [editAction, setEditAction] = useState(false);
  const [deleteAction, setDeleteAction] = useState(false);
  const [leadOnly, setLeadOnly] = useState(false);
  const [ws, setWs] = useState(null);
  let rowMap = new Map();
  let senderId = loggedInUser.id;
  let receiverId = userId;

  const handleSenderChange = (e) => {
    setInputValue(e.target.value);
  };

  const triggerFileInput = () => {
    const imageInput = document.getElementById("imageInput");
    if (imageInput) {
      imageInput.click();
    } 
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      const existingChatImageBox = document.querySelector('.chat-image-box');
      if (existingChatImageBox) {
        existingChatImageBox.remove();
      }
      reader.onload = (e) => {
        console.log(file);
        setFileBase(file)
        const chatImageBox = document.createElement('div');
        chatImageBox.className = 'chat-image-box';
        const deleteIcon = document.createElement('span');
        deleteIcon.innerHTML = '&#10060;';
        deleteIcon.className = 'delete-icon';
        deleteIcon.addEventListener('click', () => {
          chatImageBox.remove();
          setFileBase(null)
        });
        const checkboxElement = document.createElement('div');
        checkboxElement.className = 'checkbox-container';
        const checkBox = document.createElement('input');
        checkBox.type = 'checkbox';
        checkBox.id = 'readOnlyCheckBox';
        checkBox.checked = false;

        const checkBoxLabel = document.createElement('label');
        checkBoxLabel.htmlFor = 'readOnlyCheckBox';
        checkBoxLabel.textContent = 'Read Only';

        checkBox.addEventListener('change', () => {
          if (checkBox.checked) {
            setLeadOnly(true);
          } else {
            setLeadOnly(false);
          }
        });
        
        chatImageBox.appendChild(deleteIcon);
        const imageElement = document.createElement('img');
        imageElement.src = e.target.result;
        imageElement.alt = file.name;
        imageElement.style.maxWidth = '200px';
        imageElement.style.maxHeight = '200px';
        chatImageBox.appendChild(imageElement);

        if (file.type.startsWith('image/')) {
          checkboxElement.appendChild(checkBox);
        checkboxElement.appendChild(checkBoxLabel);
        chatImageBox.appendChild(checkboxElement);
        }
        const chatFooter = document.querySelector('.chat-footer');
        const parentElement = chatFooter.parentNode;
        parentElement.insertBefore(chatImageBox, chatFooter);
      };
      reader.readAsDataURL(file);
    }
  };

  // function post data of sender to  data base
  const handleSend = async () => {
    console.log(leadOnly);
    const message = inputValue;
    let fileBases = null;
    if (message === '' && fileBase == null) {
      return
    }
    if (fileBase) {
      fileBases = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(fileBase);
      });
    }
    const existingChatImageBox = document.querySelector('.chat-image-box');
    if (existingChatImageBox) {
      existingChatImageBox.remove();
    }
    const inputElement = document.querySelector('#sender');
    if (inputElement) {
      inputElement.value = '';
    }
    const formData = {
      message,
      senderId,
      receiverId,
      file: (fileBase && fileBase.type && fileBase.name && fileBases) ? {
        type: fileBase.type,
        name: fileBase.name,
        data: fileBases,
        read: false,
        status:leadOnly,
      } : null,
    };
    try {
      await axios.post(`${serverUrl}/send-message`, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fetchEmployeeData();
      setFileBase(null)
      setInputValue('')
    } catch (error) {
      return error
    }
  };

  // Fetch data from sender
  async function fetchEmployeeData() {
    try {
      const response = await axios.get(`${serverUrl}/get-messages`, {
        params: { senderId, receiverId },
      });
      console.log(response);
      const chatBodySender = document.querySelector(".chat-body-sender");
      if (chatBodySender) {
        chatBodySender.innerHTML = "";
      }
      rowMap.clear();
      setSenderData(response.data.data);
    } catch (error) {
      return error
    }
  }

  // WebSocket to fetch receiver data
  useEffect(() => {
    const connectWebSocket = () => {
      const newWs = new WebSocket(`ws://localhost:3001`);
      newWs.onopen = () => {
        newWs.send(JSON.stringify({
          senderId,
          receiverId,
        }));
      };
      newWs.onmessage = (event) => {
        const chatBodySender = document.querySelector(".chat-body-sender");
        if (chatBodySender) {
          chatBodySender.innerHTML = "";
        }
        rowMap.clear();
        const data = JSON.parse(event.data);
        console.log(data.action);
        if (data.action === 'delete') {
          setReceiverData((prevMessages) => prevMessages.filter((msg) => msg.id !== data.messageId));
          setSenderData((prevMessages) => prevMessages.filter((msg) => msg.id !== data.messageId));
        } else if (data.action === 'update') {
          setReceiverData((prevMessages) => prevMessages.map((msg) => msg.id === data.messageId ? { ...msg, message: data.newMessage } : msg));
          setSenderData((prevMessages) => prevMessages.map((msg) => msg.id === data.messageId ? { ...msg, message: data.newMessage } : msg));
        } else if (data.action === 'read') {
          setReceiverData((prevMessages) => prevMessages.map((msg) => msg.id === data.messageId ? { ...msg, read: true } : msg));
          setSenderData((prevMessages) => prevMessages.map((msg) => msg.id === data.messageId ? { ...msg, read: true } : msg));
        } else {
          setReceiverData(data.data);
        }
      };
      newWs.onclose = () => {
        console.log("Disconnected from WebSocket server");
      };
      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
        newWs.close();
      };
      setWs(newWs);
    };

    fetchEmployeeData();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [location, senderId, receiverId, userName, deleteAction, editAction]);

  useEffect(() => {
    if (!senderData || !receiverData) return;

    const uniqueChats = [...senderData, ...receiverData].filter((message, index, self) =>
      index === self.findIndex((m) => m.id === message.id)
    );

    uniqueChats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    setCombinedData(uniqueChats);
  }, [senderData, receiverData]);

  useEffect(() => {
    if (combinedData.length > 0) {
      showData(combinedData);
    }
  }, [combinedData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible'&& location.pathname === '/chatbot') {
        combinedData.forEach((message) => {
          if (!message.read && message.receiverId === loggedInUser.id && !message.file?.type.startsWith('image/')) {
            markMessageAsRead(message.id);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [combinedData]);


  const markMessageAsRead = async (messageId) => {
    try {
      await axios.put(`${serverUrl}/mark-message-read`, {
        messageId,
        senderId,
        receiverId,
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: 'read',
            messageId,
            senderId,
            receiverId,
          })
        );
      }
    } catch (error) {
      return error
    }
  };

  function showData(chatData) {
    chatData.forEach((message) => {
      if (message.senderId === loggedInUser.id) {
        dataDisplay(message, "chat-message-box");
      } else {
        dataDisplay(message, "chat-message-box-receiver");
      }
    });
  }
  function base64ToBlob(base64, mime) {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }

  function dataDisplay(sender, cls) {
    let messageElement;
    if (rowMap.has(sender.id)) {
      messageElement = rowMap.get(sender.id);
      messageElement.innerHTML = '';
    } else {
      messageElement = document.createElement('div');
      messageElement.className = `${cls}`;
      if (cls === 'chat-message-box') {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.innerHTML = `
          <button class="edit-button">Edit</button>
          <button class="delete-button">Delete</button>
        `;
        messageElement.appendChild(popup);
      
        messageElement.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          console.log("object");
          popup.style.display = 'block';
        });
      
        document.addEventListener('click', (event) => {
          if (!popup.contains(event.target)) {
            popup.style.display = 'none';
          }
        });
      
        let deleteButton = popup.querySelector('.delete-button');
        deleteButton.addEventListener('click', async () => {
          const messageId = messageElement.getAttribute('id');
          try {
            await axios.delete(`${serverUrl}/delete-message`, {
              data: { messageId, senderId, receiverId },
            });
      
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  action: 'delete',
                  messageId,
                  senderId,
                  receiverId,
                })
              );
            }
            messageElement.remove();
            setDeleteAction((prev) => !prev);
            popup.style.display = 'none';
          } catch (error) {
            console.error('Error deleting message:', error);
          }
        });
      
        let editButton = popup.querySelector('.edit-button');
        editButton.addEventListener('click', () => {
          if (messageElement.querySelector('.edit-input')) {
            return;
          }
        
          const currentMessage = messageElement.querySelector('p').textContent;
          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.value = currentMessage;
          editInput.className = 'edit-input';
        
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.className = 'file-input';
        
          const saveButton = document.createElement('button');
          saveButton.textContent = 'Save';
          saveButton.className = 'save-button';
        
          const clearButton = document.createElement('button');
          clearButton.textContent = 'Cancel';
          clearButton.className = 'clear-button';
        
          popup.style.display = 'none';
        
          saveButton.addEventListener('click', async () => {
            const newMessage = editInput.value;
            const messageId = messageElement.getAttribute('id');
            let fileData = null;
            console.log(fileInput.files);
        
            if (fileInput.files.length > 0) {
              const file = fileInput.files[0];
              fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
              });
            }
        
            try {
              let a = await axios.put(`${serverUrl}/update-message`, {
                messageId,
                senderId,
                receiverId,
                newMessage,
                newFile: fileData ? {
                  type: fileInput.files[0].type,
                  name: fileInput.files[0].name,
                  data: fileData,
                } : null,
              });
              console.log(a);
        
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    action: 'update',
                    messageId,
                    senderId,
                    receiverId,
                    newMessage,
                    newFile: fileData ? {
                      type: fileInput.files[0].type,
                      name: fileInput.files[0].name,
                      data: fileData,
                    } : null,
                  })
                );
              }

        
              // messageElement.querySelector('p').textContent = newMessage;
              // if (fileData) {
              //   const fileLink = document.createElement('a');
              //   fileLink.href = fileData;
              //   fileLink.download = fileInput.files[0].name;
              //   fileLink.textContent = fileInput.files[0].name;
              //   messageElement.appendChild(fileLink);
              // }
              messageElement.removeChild(editInput);
              messageElement.removeChild(fileInput);
              messageElement.removeChild(saveButton);
              messageElement.removeChild(clearButton);
              setEditAction((prev) => !prev);

            } catch (error) {
              console.error('Error updating message:', error);
            }
          });
        
          clearButton.addEventListener('click', () => {
            messageElement.removeChild(editInput);
            messageElement.removeChild(fileInput);
            messageElement.removeChild(saveButton);
            messageElement.removeChild(clearButton);
          });
        
          messageElement.appendChild(editInput);
          messageElement.appendChild(fileInput);
          messageElement.appendChild(saveButton);
          messageElement.appendChild(clearButton);
        });
      }
      messageElement.setAttribute('id', sender.id);
      rowMap.set(sender.id, messageElement);
    }
    
    const timestamp = new Date(sender.timestamp).toLocaleString();
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';

    if (sender.file) {
      const { data: fileData, type: fileType, name: fileName } = sender.file;
      let blob = base64ToBlob(fileData, fileType);
      let blobUrl = URL.createObjectURL(blob);
      if (fileType.startsWith('image/')) {
        if (sender.senderId !== loggedInUser.id) {
          const imageElement = document.createElement('img');
          const downloadLink = document.createElement('a');
          const openIcon = document.createElement('i');
          imageElement.src = fileData;
          imageElement.alt = fileName;
          const imageContainer = document.createElement('div');
          imageContainer.className = 'image-container';
          imageContainer.appendChild(imageElement);
          if(sender.read==true) {
            if(sender.senderId !== loggedInUser.id) {
              downloadLink.href = blobUrl;
              downloadLink.download = fileName;
              const messageText = document.createElement('p');
              messageText.textContent = 'Download';
              downloadLink.appendChild(messageText);
              imageElement.className = 'image';
            } else {
              imageElement.className = 'blurred-image';
            openIcon.className = 'fas fa-eye open-icon';
            imageContainer.appendChild(openIcon);
            }
          }else {
            imageElement.className = 'blurred-image';
            openIcon.className = 'fas fa-eye open-icon';
            imageContainer.appendChild(openIcon);
          }
            openIcon.addEventListener('click', async () => {
              imageElement.classList.remove('blurred-image');
              openIcon.style.display = 'none';
              await markMessageAsRead(sender.id);
              imageContainer.className = 'fas fa-check-double read';
            });

          messageContainer.appendChild(imageContainer);
          messageContainer.appendChild(downloadLink);


        } else {
          const imageElement = document.createElement('img');
          imageElement.src = fileData;
          imageElement.alt = fileName;
          imageElement.className = 'image';
          messageContainer.appendChild(imageElement);
        }

      } else {
        const fileLink = document.createElement('a');
        fileLink.href = blobUrl;
        fileLink.download = fileName;
        fileLink.textContent = fileName;
        fileLink.style.textDecoration = 'underline';
        fileLink.target = '_blank';
        messageContainer.appendChild(fileLink);
        fileLink.addEventListener('click', async () => {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000); 
        await markMessageAsRead(sender.id);
      });
    }
      const messageText = document.createElement('p');
      messageText.textContent = sender.message || '';
      messageContainer.appendChild(messageText);
    } else {
      const messageText = document.createElement('p');
      messageText.textContent = sender.message || '';
      messageContainer.appendChild(messageText);
    }

    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    const timestampElement = document.createElement('span');
    timestampElement.className = 'timestamp';
    timestampElement.textContent = timestamp;
    messageInfo.appendChild(timestampElement);
    if(sender.senderId === loggedInUser.id){
      const readStatusIcon = document.createElement('i');
    readStatusIcon.className = sender.read ? 'fas fa-check-double read' : 'fas fa-check unread';
    messageInfo.appendChild(readStatusIcon);
    }
    messageContainer.appendChild(messageInfo);
    messageElement.appendChild(messageContainer);

    const senderChatSection = document.querySelector('.chat-section.sender');
    if (senderChatSection) {
      let chatBody = senderChatSection.querySelector('.chat-body-sender');
      if (!chatBody) {
        chatBody = document.createElement('div');
        chatBody.className = 'chat-body-sender';
        senderChatSection.insertBefore(chatBody, senderChatSection.querySelector('.main-chat-footer'));
      }
      if (!chatBody.contains(messageElement)) {
        chatBody.appendChild(messageElement);
      }
      chatBody.scrollTop = chatBody.scrollHeight;
    } else {
      return
    }
  }

  return (
    <div className="chat-container">
      <input
        id="imageInput"
        type="file"
        accept="image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,
      application/pdf,application/vnd.ms-excel,
      application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />
      <div className="chat-section sender">
        <div className="chat-header">
          <div className="profile-icon">
            <i className="fas fa-user-circle"></i>
            <label >{userName}</label>
          </div>
        </div>
        <div className="main-chat-footer">
          <div className="chat-footer">
            <button className="add-button-sender" onClick={triggerFileInput}>+</button>
            <input
              className="input-bar"
              id="sender"
              type="text"
              value={inputValue}
              onChange={handleSenderChange}
              placeholder="Type here..."
            />
            <button className="sender-button" onClick={() => handleSend(true)}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
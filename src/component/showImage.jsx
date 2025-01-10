import React from 'react';
import { useLocation } from 'react-router-dom';
import './showImage.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import { useNavigate } from 'react-router-dom';



const ShowImage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {loggedInUser, allUsers,userId,userName, picture } = location.state || {};
  console.log(userName);
  let userReady = true;
  return (
    <div className='show-image-container'>
     <div className='Previous '>
       <span className="prev-icon" onClick={() => navigate('/chatbot',{ state: { loggedInUser, allUsers,userId,userName,userReady} })}>
        &#8592; Back
      </span>
     </div>
    <div className="show-image">
      <img
        src={picture.data}
        alt={picture.name}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        onLoad={(e) => {
          const img = e.target;
          console.log(`Image size: ${img.naturalWidth} x ${img.naturalHeight}`);
        }}
      />
    </div>
    </div>
  );
};

export default ShowImage;
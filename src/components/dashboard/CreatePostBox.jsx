import React from "react";
import "../../styles/CreatePostBox.css";
const CreatePostBox = ({ user, setIsModalOpen, setPostType }) => (
  <div className="create-post-box">
    <div className="create-post-top" onClick={() => setIsModalOpen(true)}>
      <img
        src={
          user?.avatar ||
          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        }
        alt="avatar"
        className="create-avatar"
      />
      <input
        type="text"
        placeholder={`${user?.name || "Bạn"} ơi, bạn đang nghĩ gì thế?`}
        readOnly
        className="create-input"
      />
    </div>
    <hr />
    <div className="create-post-actions">
      <button
        className="action-btn photo"
        onClick={() => {
          setPostType("normal");
          setIsModalOpen(true);
        }}
      >
        <i className="fas fa-images"></i> Bài viết thường
      </button>
      <button
        className="action-btn live"
        onClick={() => {
          setPostType("medical");
          setIsModalOpen(true);
        }}
      >
        <i className="fas fa-stethoscope"></i> Hỏi bác sĩ
      </button>
    </div>
  </div>
);

export default CreatePostBox;

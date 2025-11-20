import React from "react";
import "../../styles/CreatePostBox.css";

// ✅ Helper: build full avatar URL (same logic as Navbar)
const getAvatarUrl = (a) => {
  const defaultAvatar =
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
  const avatar = a || "";
  if (!avatar) return defaultAvatar;
  if (avatar.startsWith("http")) return avatar;
  const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
  const path = avatar.startsWith("/") ? avatar : `/${avatar}`;
  return base ? `${base}${path}` : path;
};

const CreatePostBox = ({ user, setIsModalOpen, setPostType }) => (
  <div className="create-post-box">
    <div className="create-post-top" onClick={() => setIsModalOpen(true)}>
      <img
        src={
          // ✅ Use helper so relative '/media/...' becomes full URL when needed
          getAvatarUrl(user?.avatar)
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

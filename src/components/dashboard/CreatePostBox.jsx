import React from "react";
import "../../styles/CreatePostBox.css";
import { useTranslation } from "react-i18next";
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
const CreatePostBox = ({ user, setIsModalOpen, setPostType }) => {
  const { t } = useTranslation(); // Hook

  return (
    <div className="create-post-box">
      <div className="create-post-top" onClick={() => setIsModalOpen(true)}>
        <img
          src={getAvatarUrl(user?.avatar)}
          alt="avatar"
          className="create-avatar"
        />

        <input
          type="text"
          placeholder={t("dashboard.what_thinking", {
            name: user?.name || "Bạn",
          })}
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
          <i className="fas fa-images"></i> {t("dashboard.post_normal")}
        </button>
        <button
          className="action-btn live"
          onClick={() => {
            setPostType("medical");
            setIsModalOpen(true);
          }}
        >
          <i className="fas fa-stethoscope"></i> {t("dashboard.ask_doctor")}
        </button>
      </div>
    </div>
  );
};

export default CreatePostBox;

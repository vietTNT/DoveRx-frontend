import React from "react";
import "../../styles/CreatePostBox.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { resolveImageUrl } from "../../utils/imageHelper";
// const getAvatarUrl = (a) => {
//   const defaultAvatar =
//     "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
//   const avatar = a || "";
//   if (!avatar) return defaultAvatar;
//   if (avatar.startsWith("http")) return avatar;
//   const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
//   const path = avatar.startsWith("/") ? avatar : `/${avatar}`;
//   return base ? `${base}${path}` : path;
// };

const CreatePostBox = ({ user, setIsModalOpen, setPostType }) => {
  const { t } = useTranslation();
  const navigate = useNavigate(); // Khởi tạo hook
  const [displayAvatar, setDisplayAvatar] = useState(user?.avatar);
  //Quản lý avatar bằng state để cập nhật tức thời khi nhận sự kiện
  useEffect(() => {
    // Luôn đồng bộ nếu props user thay đổi (khi login/logout)
    setDisplayAvatar(user?.avatar);
  }, [user?.avatar]);

  useEffect(() => {
    const handleUpdate = (e) => {
      //  Khi nhận tín hiệu đổi ảnh (kể cả ảnh blob tạm thời), cập nhật ngay
      if (e.detail?.user?.avatar) {
        setDisplayAvatar(e.detail.user.avatar);
      }
    };
    window.addEventListener("user:updated", handleUpdate);
    return () => window.removeEventListener("user:updated", handleUpdate);
  }, []);
  // Hàm xử lý khi click vào avatar
  const handleAvatarClick = (e) => {
    e.stopPropagation(); // Ngăn sự kiện nổi bọt để không mở modal
    if (user?.id) {
      navigate(`/profile/${user.id}`);
    }
  };

  return (
    <div className="create-post-box">
      <div className="create-post-top">
        {/* Click vào avatar sẽ về trang cá nhân */}
        <img
          src={resolveImageUrl(displayAvatar, 100)}
          alt="avatar"
          className="create-avatar"
          onClick={handleAvatarClick}
          style={{ cursor: "pointer" }}
        />

        {/* Click vào input thì mở modal tạo bài */}
        <input
          type="text"
          placeholder={t("dashboard.what_thinking", {
            name: user?.name || t("profile.you", "Bạn"),
          })}
          readOnly
          className="create-input"
          onClick={() => setIsModalOpen(true)}
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

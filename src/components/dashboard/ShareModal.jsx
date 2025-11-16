import React, { useState } from "react";
import "../../styles/ShareModal.css";

const ShareModal = ({ onClose, user, friends, onShare }) => {
  const [message, setMessage] = useState("");
  const shareOptions = [
    { icon: "fab fa-facebook-messenger", label: "Messenger" },
    { icon: "fab fa-whatsapp", label: "WhatsApp" },
    { icon: "fas fa-book-open", label: "Tin của bạn" },
    { icon: "fas fa-link", label: "Sao chép liên kết" },
    { icon: "fas fa-users", label: "Nhóm" },
    { icon: "fas fa-user", label: "Trang cá nhân" },
  ];

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-header">
          <span>Chia sẻ</span>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="share-user">
          <div className="share-user-info">
            <img src={user.avatar} alt="avatar" />
            <div>
              <strong>{user.name}</strong>
              <div className="share-privacy">
                <button>Bảng feed</button>
                <button>
                  <i className="fas fa-globe-asia"></i> Công khai
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="share-body">
          <textarea
            placeholder="Hãy nói gì đó về nội dung này..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="share-footer">
          <button className="share-now-btn" onClick={() => onShare?.(message)}>
            Chia sẻ ngay
          </button>
        </div>

        <div className="share-section">
          <h4>Gửi bằng Messenger</h4>
          <div className="messenger-list">
            {friends.map((f) => (
              <div className="messenger-item" key={f.id}>
                <img src={f.avatar} alt={f.name} />
                <span>{f.name}</span>
              </div>
            ))}
          </div>

          <h4>Chia sẻ lên</h4>
          <div className="share-options">
            <div className="share-option">
              <i className="fab fa-facebook-messenger"></i>
              <p>Messenger</p>
            </div>
            <div className="share-option">
              <i className="fab fa-whatsapp"></i>
              <p>WhatsApp</p>
            </div>
            <div className="share-option">
              <i className="fas fa-book-open"></i>
              <p>Tin của bạn</p>
            </div>
            <div className="share-option">
              <i className="fas fa-link"></i>
              <p>Sao chép liên kết</p>
            </div>
            <div className="share-option">
              <i className="fas fa-users"></i>
              <p>Nhóm</p>
            </div>
            <div className="share-option">
              <i className="fas fa-user"></i>
              <p>Trang cá nhân</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

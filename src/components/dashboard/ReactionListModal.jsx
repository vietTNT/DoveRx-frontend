import React, { useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { getPostReactions } from "../../services/socialApi";
import "../../styles/ReactionListModal.css";

const ReactionListModal = ({ isOpen, onClose, postId, emojiList }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      getPostReactions(postId)
        .then((data) => {
          setUsers(data);
          setActiveTab("all");
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setUsers([]);
    }
  }, [isOpen, postId]);

  const tabsData = useMemo(() => {
    const counts = {};
    users.forEach((u) => {
      counts[u.type] = (counts[u.type] || 0) + 1;
    });

    const availableTypes = Object.keys(counts).map((type) => {
      const emoji = emojiList.find((e) => e.type === type);
      return {
        type,
        count: counts[type],
        icon: emoji?.icon || "👍",
        label: emoji?.label || type,
        color: emoji?.color,
      };
    });

    return availableTypes;
  }, [users, emojiList]);

  const filteredUsers = useMemo(() => {
    if (activeTab === "all") return users;
    return users.filter((u) => u.type === activeTab);
  }, [users, activeTab]);

  if (!isOpen) return null;

  // 🔥 2. SỬA ĐOẠN RETURN: Dùng createPortal để đưa Modal ra ngoài cùng body
  return ReactDOM.createPortal(
    <div className="reaction-modal-overlay" onClick={onClose}>
      <div
        className="reaction-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reaction-modal-header">
          <div className="header-title">Cảm xúc về bài viết</div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="reaction-tabs">
          <button
            className={`tab-item ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span className="tab-label">Tất cả</span>
            <span className="tab-count">{users.length}</span>
          </button>

          {tabsData.map((tab) => (
            <button
              key={tab.type}
              className={`tab-item ${activeTab === tab.type ? "active" : ""}`}
              onClick={() => setActiveTab(tab.type)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="reaction-modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="empty-text">Chưa có ai thả cảm xúc này.</p>
          ) : (
            <ul className="reaction-user-list">
              {filteredUsers.map((item, index) => {
                const emoji = emojiList.find((e) => e.type === item.type);
                return (
                  <li key={index} className="reaction-user-item">
                    <div className="avatar-wrapper">
                      <img
                        src={
                          item.user.avatar ||
                          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                        }
                        alt="avatar"
                        className="user-avatar"
                      />
                      <div className="small-reaction-icon">{emoji?.icon}</div>
                    </div>
                    <div className="user-info">
                      <span className="user-name">{item.user.name}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body // 👈 QUAN TRỌNG: Gắn vào body
  );
};

export default ReactionListModal;

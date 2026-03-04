// export default SidebarRight;
import React, { useState, useEffect } from "react";
import "../../styles/SidebarRight.css";
import { getOrCreateConversation } from "../../services/chatApi";
import { getFriends } from "../../services/friendApi";
import { useTranslation } from "react-i18next";

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

const SidebarRight = () => {
  const { t } = useTranslation();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoading(true);
        const data = await getFriends();
        // Kiểm tra an toàn xem data có phải là mảng không
        setFriends(Array.isArray(data) ? data : data.results || []);
      } catch (error) {
        console.error("❌ SidebarRight: Error loading friends:", error);
      } finally {
        setLoading(false);
      }
    };
    loadFriends();

    const handleFriendsUpdated = () => loadFriends();
    window.addEventListener("friendsUpdated", handleFriendsUpdated);
    return () =>
      window.removeEventListener("friendsUpdated", handleFriendsUpdated);
  }, []);

  // LUỒNG XỬ LÝ : Chỉ bắn sự kiện, không giữ state chat
  const handleContactClick = async (contact) => {
    try {
      const conv = await getOrCreateConversation(contact.id);
      if (conv && conv.id) {
        window.dispatchEvent(
          new CustomEvent("OPEN_CHAT_POPUP", {
            detail: {
              conversationId: conv.id,
              targetUser: contact,
            },
          }),
        );
      }
    } catch (err) {
      console.error("Lỗi khi mở cuộc trò chuyện:", err);
    } finally {
      setIsOpeningChat(false); // Mở khóa sau khi xử lý xong
    }
  };
  if (loading) {
    return (
      <aside className="sidebar-right">
        <div className="p-4 text-center text-gray-500">
          {t("common.loading", "Đang tải...")}
        </div>
      </aside>
    );
  }
  return (
    <aside className="sidebar-right">
      <div className="contacts-header">
        <h4>{t("user_profile.friend_status")}</h4>
      </div>
      <ul className="contact-list">
        {friends.map((contact) => (
          <li
            key={contact.id}
            className="contact-item"
            onClick={() => handleContactClick(contact)}
          >
            <div className="avatar-wrapper">
              <img src={getAvatarUrl(contact.avatar)} alt={contact.name} />
              {contact.online && <span className="online-indicator"></span>}
            </div>
            <span className="contact-name">{contact.name}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default SidebarRight;

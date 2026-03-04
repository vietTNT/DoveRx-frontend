import React, { useEffect, useState } from "react";
import api from "../api/api";
import { sendFriendRequest } from "../services/friendApi";
import { resolveImageUrl } from "../utils/imageHelper";
import "../styles/FriendSuggestions.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import websocketService from "../services/websocket";
const FriendSuggestions = () => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // State chống Double-click
  const [isActionLoading, setIsActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSuggestions();

    // =========================================================
    // 1. LẮNG NGHE SỰ KIỆN TỪ NAVBAR/PROFILE (Khi mình tự bấm chấp nhận)
    // =========================================================
    const handleFriendUpdate = (event) => {
      if (event.detail && event.detail.friends) {
        const friendIds = event.detail.friends.map((f) => String(f.id));
        // Lọc những người đã thành bạn bè ra khỏi danh sách gợi ý
        setSuggestions((prev) =>
          prev.filter((s) => !friendIds.includes(String(s.id))),
        );
      }
    };

    // =========================================================
    // 2. LẮNG NGHE WEBSOCKET (Khi người kia gửi lời mời hoặc chấp nhận mình)
    // =========================================================
    const handleSocketUpdate = () => {
      // Khi có bất kỳ thay đổi nào về quan hệ bạn bè từ server bắn về
      // Cách an toàn nhất là gọi lại API lấy danh sách gợi ý mới
      loadSuggestions(false); // false: không hiển thị lại màn hình loading
    };

    window.addEventListener("friendsUpdated", handleFriendUpdate);
    websocketService.on("friend_request_received", handleSocketUpdate);
    websocketService.on("friend_request_accepted", handleSocketUpdate);

    return () => {
      window.removeEventListener("friendsUpdated", handleFriendUpdate);
      websocketService.off("friend_request_received", handleSocketUpdate);
      websocketService.off("friend_request_accepted", handleSocketUpdate);
    };
  }, []);

  const loadSuggestions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data } = await api.get("/api/accounts/friends/suggestions/");
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Lỗi tải gợi ý:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    if (isActionLoading) return; // Chặn spam click
    setIsActionLoading(true); // Khóa nút
    try {
      await sendFriendRequest(userId);
      // Gửi thành công -> Xóa khỏi UI ngay lập tức
      setSuggestions(suggestions.filter((s) => s.id !== userId));
    } catch (error) {
      console.error("Lỗi kết bạn:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  //  Hàm xử lý chuyển hướng
  const goToProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  if (loading)
    return (
      <div className="suggestions-loading">
        {t("common.loading", "Đang tải...")}
      </div>
    );
  if (!suggestions.length) return null;
  if (suggestions.length === 0) return null;
  return (
    <div className="friend-suggestions">
      <h3>{t("profile.friend_suggestions", "Gợi ý kết bạn")}</h3>
      <div className="suggestions-list">
        {suggestions.map((user) => (
          <div key={user.id} className="suggestion-card">
            {/* Thêm onClick và style con trỏ chuột cho ảnh */}
            <img
              src={resolveImageUrl(user.avatar)}
              alt={user.name}
              className="suggestion-avatar"
              onClick={() => goToProfile(user.id)}
              style={{ cursor: "pointer" }}
            />

            <div className="suggestion-info">
              {/*  Thêm onClick và style con trỏ chuột cho tên */}
              <strong
                onClick={() => goToProfile(user.id)}
                style={{ cursor: "pointer" }}
              >
                {user.name}
              </strong>

              {user.mutual_friends_count > 0 && (
                <span className="mutual-friends">
                  {user.mutual_friends_count}{" "}
                  {t("profile.mutual_friends", "bạn chung")}
                </span>
              )}
              {user.specialty && (
                <span className="specialty">{user.specialty}</span>
              )}
            </div>

            <button
              className="btn-add-friend"
              onClick={() => handleAddFriend(user.id)}
            >
              {t("profile.add_friend", "Kết bạn")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendSuggestions;

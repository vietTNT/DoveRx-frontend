import React, { useEffect, useState } from "react";
import api from "../api/api";
import { sendFriendRequest } from "../services/friendApi";
import { resolveImageUrl } from "../utils/imageHelper";
import "../styles/FriendSuggestions.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
const FriendSuggestions = () => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data } = await api.get("/api/accounts/friends/suggestions/");
      setSuggestions(data.suggestions);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      setSuggestions(suggestions.filter((s) => s.id !== userId));
    } catch (error) {}
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

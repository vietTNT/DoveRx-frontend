import React, { useEffect, useState } from "react";
import api from "../api/api";
import { sendFriendRequest } from "../services/friendApi";
import { resolveImageUrl } from "../utils/imageHelper";
import "../styles/FriendSuggestions.css";

const FriendSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data } = await api.get("/api/accounts/friends/suggestions/");
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error("❌ Lỗi tải gợi ý:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      setSuggestions(suggestions.filter((s) => s.id !== userId));
    } catch (error) {
      console.error("❌ Lỗi gửi lời mời:", error);
    }
  };

  if (loading) return <div className="suggestions-loading">Đang tải...</div>;
  if (!suggestions.length) return null;

  return (
    <div className="friend-suggestions">
      <h3>Gợi ý kết bạn</h3>
      <div className="suggestions-list">
        {suggestions.map((user) => (
          <div key={user.id} className="suggestion-card">
            <img
              src={resolveImageUrl(user.avatar)}
              alt={user.name}
              className="suggestion-avatar"
            />
            <div className="suggestion-info">
              <strong>{user.name}</strong>
              {user.mutual_friends_count > 0 && (
                <span className="mutual-friends">
                  {user.mutual_friends_count} bạn chung
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
              Kết bạn
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendSuggestions;
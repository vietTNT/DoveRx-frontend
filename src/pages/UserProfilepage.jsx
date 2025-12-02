import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { resolveImageUrl } from "../utils/imageHelper";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../services/friendApi";
import api from "../api/api";
import "../styles/userProfile/UserProfilepage.css";
import { useTranslation } from "react-i18next";

const UserProfilePage = ({ user: currentUser, onLogout }) => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/accounts/users/${userId}/`);
        setUser(data);
        setFriendshipStatus(data.friendship_status);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  const handleSendFriendRequest = async () => {
    try {
      await sendFriendRequest(userId);
      setFriendshipStatus("pending");
      alert(`✅ ${t("user_profile.friend_request_sent")}`);
    } catch (error) {
      alert(`❌ ${t("common.error")}`);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await acceptFriendRequest(userId);
      setFriendshipStatus("accepted");
      alert(`✅ ${t("user_profile.friend_request_accepted")}`);
    } catch (error) {
      alert(`❌ ${t("common.error")}`);
    }
  };

  const handleRejectRequest = async () => {
    try {
      await rejectFriendRequest(userId);
      setFriendshipStatus("rejected");
      alert(`✅ ${t("user_profile.friend_request_rejected")}`);
    } catch (error) {
      alert(`❌ ${t("common.error")}`);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar user={currentUser} onLogout={onLogout} />
        <div className="loading">{t("common.loading")}...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar user={currentUser} onLogout={onLogout} />
        <div className="error">{t("user_profile.user_not_found")}</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar user={currentUser} onLogout={onLogout} />
      <div className="user-profile-container">
        <div className="user-profile-card">
          <img
            src={resolveImageUrl(user.avatar)}
            alt={user.name}
            className="user-profile-avatar"
          />
          <h2>{user.name}</h2>

          <p className="user-email">{user.email}</p>

          {/* Friend Actions */}
          <div className="friend-actions">
            {friendshipStatus === "accepted" && (
              <>
                <button className="btn-primary">
                  💬 {t("user_profile.message")}
                </button>
                <span className="friend-badge">
                  ✓ {t("user_profile.friend_status")}
                </span>
              </>
            )}

            {friendshipStatus === "pending" && (
              <span className="pending-badge">
                ⏳ {t("user_profile.request_sent")}
              </span>
            )}

            {friendshipStatus?.startsWith("received_pending") && (
              <>
                <button className="btn-success" onClick={handleAcceptRequest}>
                  ✓ {t("user_profile.accept")}
                </button>
                <button className="btn-danger" onClick={handleRejectRequest}>
                  ✗ {t("user_profile.reject")}
                </button>
              </>
            )}

            {!friendshipStatus && (
              <button className="btn-primary" onClick={handleSendFriendRequest}>
                <i className="fas fa-user-plus"></i>{" "}
                {t("user_profile.add_friend")}
              </button>
            )}
          </div>

          {/* User Info */}
          <div className="user-info">
            <h3>{t("user_profile.info_title")}</h3>
            {user.bio && <p>{user.bio}</p>}
            {user.specialty && (
              <p>
                <strong>{t("profile.specialty")}:</strong> {user.specialty}
              </p>
            )}
            {user.workplace && (
              <p>
                <strong>{t("profile.workplace")}:</strong> {user.workplace}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;

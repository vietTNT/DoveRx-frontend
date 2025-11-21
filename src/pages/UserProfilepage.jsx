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

const UserProfilePage = ({ user: currentUser, onLogout }) => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        // Giả sử bạn có API get user by ID
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
      alert("✅ Đã gửi lời mời kết bạn!");
    } catch (error) {
      alert("❌ Không thể gửi lời mời kết bạn");
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await acceptFriendRequest(userId);
      setFriendshipStatus("accepted");
      alert("✅ Đã chấp nhận lời mời kết bạn!");
    } catch (error) {
      alert("❌ Không thể chấp nhận lời mời");
    }
  };

  const handleRejectRequest = async () => {
    try {
      await rejectFriendRequest(userId);
      setFriendshipStatus("rejected");
      alert("✅ Đã từ chối lời mời kết bạn");
    } catch (error) {
      alert("❌ Không thể từ chối lời mời");
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar user={currentUser} onLogout={onLogout} />
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar user={currentUser} onLogout={onLogout} />
        <div className="error">Không tìm thấy người dùng</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar user={currentUser} onLogout={onLogout} />
      <div className="user-profile-container">
        <div className="user-profile-card">
          <img
            // src={
            //   user.avatar ||
            //   "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            // }
            src={resolveImageUrl(user.avatar)}
            alt={user.name}
            className="user-profile-avatar"
          />
          <h2>{user.name}</h2>
          <p className="user-role">
            {user.role === "doctor" ? "👨‍⚕️ Bác sĩ" : "👤 Người dùng"}
          </p>
          <p className="user-email">{user.email}</p>

          {/* Friend Actions */}
          <div className="friend-actions">
            {friendshipStatus === "accepted" && (
              <>
                <button className="btn-primary">💬 Nhắn tin</button>
                <span className="friend-badge">✓ Bạn bè</span>
              </>
            )}

            {friendshipStatus === "pending" && (
              <span className="pending-badge">⏳ Đã gửi lời mời</span>
            )}

            {friendshipStatus?.startsWith("received_pending") && (
              <>
                <button className="btn-success" onClick={handleAcceptRequest}>
                  ✓ Chấp nhận
                </button>
                <button className="btn-danger" onClick={handleRejectRequest}>
                  ✗ Từ chối
                </button>
              </>
            )}

            {!friendshipStatus && (
              <button className="btn-primary" onClick={handleSendFriendRequest}>
                <i className="fas fa-user-plus"></i> Kết bạn
              </button>
            )}
          </div>

          {/* User Info */}
          <div className="user-info">
            <h3>Thông tin</h3>
            {user.bio && <p>{user.bio}</p>}
            {user.specialty && (
              <p>
                <strong>Chuyên khoa:</strong> {user.specialty}
              </p>
            )}
            {user.workplace && (
              <p>
                <strong>Nơi làm việc:</strong> {user.workplace}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;

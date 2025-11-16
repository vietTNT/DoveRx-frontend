import api from "../api/api";

// ===== Search =====
export const searchUsers = async (query) => {
  const { data } = await api.get("/api/accounts/search/", {
    params: { q: query },
  });
  return data.results;
};

/**
 * Lấy danh sách bạn bè
 * @returns {Promise<Array>} - Array của friends
 */
export const getFriends = async () => {
  try {
    const response = await api.get("/api/accounts/friends/");
    console.log("✅ Friends loaded:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error loading friends:", error);
    throw error;
  }
};

export const getFriendRequests = async () => {
  const { data } = await api.get("/api/accounts/friends/requests/");
  return data;
};

export const sendFriendRequest = async (toUserId) => {
  const { data } = await api.post("/api/accounts/friends/send/", {
    to_user_id: toUserId,
  });
  return data;
};

/**
 * Chấp nhận lời mời kết bạn
 * @param {number} fromUserId - ID của user gửi lời mời
 * @returns {Promise} - Trả về thông tin friend mới
 */
export const acceptFriendRequest = async (fromUserId) => {
  try {
    const response = await api.post("/api/accounts/friends/accept/", {
      from_user_id: fromUserId,
    });
    console.log("✅ Friend request accepted:", response.data);
    return response.data; // { message, friendship_id, friend }
  } catch (error) {
    console.error("❌ Error accepting friend request:", error);
    throw error;
  }
};

/**
 * Từ chối lời mời kết bạn
 * @param {number} fromUserId - ID của user gửi lời mời
 * @returns {Promise}
 */
export const rejectFriendRequest = async (fromUserId) => {
  try {
    const response = await api.post("/api/accounts/friends/reject/", {
      from_user_id: fromUserId,
    });
    console.log("✅ Friend request rejected:", response.data);
    return response.data; // { message, from_user_id }
  } catch (error) {
    console.error("❌ Error rejecting friend request:", error);
    throw error;
  }
};

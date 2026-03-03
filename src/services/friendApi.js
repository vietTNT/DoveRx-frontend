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
// api/friendApi.js
export const getSuggestions = async () => {
  const { data } = await api.get("/api/accounts/friends/suggestions/");
  return data;
};
export const getUserFriends = async (userId) => {
  try {
    // Lưu ý: Bạn cần đảm bảo Backend đã có endpoint này.
    // Nếu chưa, hãy dùng tạm hàm getFriends() nếu xem profile chính mình.
    const { data } = await api.get(`/api/accounts/friends/list/${userId}/`);
    return data;
  } catch (error) {
    console.error("Error fetching friends:", error);
    throw error;
  }
};
/**
 * Hủy kết bạn
 * @param {number} friendId
 */
export const unfriendUser = async (friendId) => {
  try {
    const response = await api.post("/api/accounts/friends/unfriend/", {
      friend_id: friendId,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error unfriending:", error);
    throw error;
  }
};
/**
 * Hủy lời mời kết bạn mình ĐÃ GỬI
 * @param {number} toUserId - ID của user mà mình đã gửi lời mời
 */
export const cancelFriendRequest = async (toUserId) => {
  try {
    const response = await api.post("/api/accounts/friends/cancel/", {
      to_user_id: toUserId,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error canceling friend request:", error);
    throw error;
  }
};

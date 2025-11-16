import api from "../api/api";

const API_URL = "http://localhost:8000/api/chat";

// ===== Conversations =====
export const fetchConversations = async () => {
  const { data } = await api.get("/api/chat/conversations/");
  return data;
};

export const getOrCreateConversation = async (contactId) => {
  try {
    console.log(
      `🔄 [chatApi] Getting/Creating conversation with user ${contactId}`
    );

    const token = localStorage.getItem("access");
    // ✅ THÊM: Kiểm tra token
    if (!token || token === "undefined" || token === "null") {
      console.error("❌ [chatApi] Invalid token:", token);
      throw new Error("No access token. Please login again.");
    }
    const response = await fetch(
      `${API_URL}/conversations/with/${contactId}/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // if (!response.ok) {
    //   throw new Error(`Failed to get conversation: ${response.status}`);
    // }
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ [chatApi] Response error (${response.status}):`,
        errorText
      );

      if (response.status === 401) {
        console.error("❌ [chatApi] Token expired or invalid!");

        // ✅ THÊM: Thử refresh token
        try {
          console.log("🔄 [chatApi] Attempting to refresh token...");
          const { refreshTokenIfNeeded } = await import("./auth");
          const newToken = await refreshTokenIfNeeded();

          if (newToken) {
            console.log("✅ [chatApi] Token refreshed, retrying...");
            // Retry với token mới
            const retryResponse = await fetch(
              `${API_URL}/conversations/with/${contactId}/`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${newToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch (refreshError) {
          console.error("❌ [chatApi] Refresh token failed:", refreshError);
        }

        // Nếu refresh thất bại → Redirect login
        localStorage.clear();
        window.location.href = "/doctor-login";
        throw new Error("Session expired. Please login again.");
      }

      throw new Error(`Failed to get conversation: ${response.status}`);
    }
    const conversation = await response.json();
    console.log(
      `✅ [chatApi] Got conversation ${conversation.id} with user ${contactId}`
    );

    return conversation;
  } catch (error) {
    console.error("❌ [chatApi] Error getting conversation:", error);
    throw error;
  }
};

// ===== Messages =====
export const fetchMessages = async (conversationId) => {
  try {
    console.log(
      `🔄 [chatApi] Fetching messages for conversation ${conversationId}`
    );

    // ✅ SỬA: Gọi endpoint đúng
    const { data } = await api.get(
      `/api/chat/conversations/${conversationId}/messages/`
    );

    console.log(`✅ [chatApi] Fetched ${data.length} messages`);
    return data;
  } catch (error) {
    console.error("❌ [chatApi] Error fetching messages:", error);
    throw error;
  }
};

export const sendMessage = async (conversationId, text) => {
  const { data } = await api.post("/api/chat/messages/send/", {
    conversation_id: conversationId,
    text,
  });
  return data;
};

export const markAsRead = async (conversationId) => {
  const { data } = await api.post("/api/chat/messages/mark_as_read/", {
    conversation_id: conversationId,
  });
  return data;
};

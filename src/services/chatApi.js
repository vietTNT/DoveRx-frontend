import api from "../api/api";

// ===== Conversations =====
export const fetchConversations = async () => {
  const { data } = await api.get("/api/chat/conversations/");
  return data;
};
// Hàm upload file
export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  // Không cần set Header Content-Type, axios/fetch tự làm việc này với FormData
  const { data } = await api.post("/api/chat/upload/", formData);
  return data; // Trả về { url: "...", type: "image" | "video" | "file" }
};
export const getOrCreateConversation = async (contactId) => {
  try {
    // Không cần tự check token hay try-catch refresh thủ công nữa
    // api instance sẽ tự làm hết
    const { data } = await api.get(
      `/api/chat/conversations/with/${contactId}/`,
    );
    return data;
  } catch (error) {
    console.error("❌ [chatApi] Error getting conversation:", error);
    throw error;
  }
};
// ===== Messages =====
export const fetchMessages = async (conversationId) => {
  try {
    console.log(
      `🔄 [chatApi] Fetching messages for conversation ${conversationId}`,
    );

    const { data } = await api.get(
      `/api/chat/conversations/${conversationId}/messages/`,
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
  const { data } = await api.post("/api/chat/messages/read_sync/", {
    conversation_id: conversationId,
  });
  return data;
};
export const sharePostToMessage = async ({ recipientId, postId, text }) => {
  const { data } = await api.post("/api/chat/messages/share_post/", {
    recipient_id: recipientId, // Backend nhận snake_case
    post_id: postId,
    text: text || "",
  });
  return data;
};

export const recallMessage = async (messageId) => {
  const { data } = await api.post(`/api/chat/messages/${messageId}/recall/`);
  return data;
};

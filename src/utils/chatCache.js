// src/utils/chatCache.js

const CACHE_PREFIX = "chat_cache_";
const MAX_CACHE_SIZE = 20; // ✅ Giảm xuống 20 để load siêu tốc (chỉ cần đủ lấp đầy màn hình)

// Helper: Tạo key duy nhất cho mỗi cuộc trò chuyện
const getCacheKey = (conversationId) => `${CACHE_PREFIX}${conversationId}`;

/**
 * Lưu danh sách tin nhắn vào LocalStorage
 * @param {string|number} conversationId
 * @param {Array} messages - Danh sách tin nhắn đầy đủ
 */
export const saveToCache = (conversationId, messages) => {
  if (!conversationId || !Array.isArray(messages)) return;

  try {
    // ✅ BƯỚC 1: Sắp xếp lại theo thời gian (Cũ -> Mới)
    // Để đảm bảo khi cắt slice(-20) ta luôn lấy được 20 tin MỚI NHẤT thực sự
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    // ✅ BƯỚC 2: Chỉ lưu 20 tin nhắn cuối cùng
    const lastMessages = sortedMessages.slice(-MAX_CACHE_SIZE);

    // Lưu dưới dạng chuỗi JSON
    localStorage.setItem(
      getCacheKey(conversationId),
      JSON.stringify(lastMessages)
    );
  } catch (error) {
    // LocalStorage có thể bị đầy (QuotaExceededError)
    console.warn("⚠️ [ChatCache] Failed to save to cache:", error);
  }
};

/**
 * Lấy tin nhắn từ LocalStorage
 * @param {string|number} conversationId
 * @returns {Array} Danh sách tin nhắn hoặc mảng rỗng
 */
export const loadFromCache = (conversationId) => {
  if (!conversationId) return [];

  try {
    const cachedData = localStorage.getItem(getCacheKey(conversationId));
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.error("❌ [ChatCache] Error loading from cache:", error);
    // Nếu file cache lỗi, xóa nó đi để tránh lỗi lần sau
    clearChatCache(conversationId);
  }
  return [];
};

/**
 * Xóa cache của một cuộc trò chuyện (dùng khi logout hoặc xóa chat)
 */
export const clearChatCache = (conversationId) => {
  if (conversationId) {
    localStorage.removeItem(getCacheKey(conversationId));
  }
};

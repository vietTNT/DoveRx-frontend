// src/utils/chatCache.js

const CACHE_PREFIX = "chat_cache_";
const MAX_CACHE_SIZE = 50; // Chỉ lưu 50 tin gần nhất để nhẹ máy

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
    // Chỉ lưu 50 tin nhắn cuối cùng để tránh đầy bộ nhớ
    const lastMessages = messages.slice(-MAX_CACHE_SIZE);

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

// src/utils/postCache.js

const POST_CACHE_KEY = "doverx_feed_cache";
const MAX_CACHE_SIZE = 20; // Chỉ lưu 20 bài mới nhất để tránh đầy bộ nhớ

/**
 * Lưu danh sách bài viết vào LocalStorage
 * @param {Array} posts - Danh sách bài viết (đã map sang UI)
 */
export const savePostsToCache = (posts) => {
  if (!Array.isArray(posts)) return;

  try {
    // Chỉ lấy 20 bài đầu tiên (mới nhất)
    const topPosts = posts.slice(0, MAX_CACHE_SIZE);
    localStorage.setItem(POST_CACHE_KEY, JSON.stringify(topPosts));
  } catch (error) {
    console.warn("⚠️ [PostCache] Failed to save posts:", error);
  }
};

/**
 * Lấy bài viết từ LocalStorage
 * @returns {Array} Danh sách bài viết hoặc mảng rỗng
 */
export const loadPostsFromCache = () => {
  try {
    const cached = localStorage.getItem(POST_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error("❌ [PostCache] Error loading posts:", error);
    return [];
  }
};

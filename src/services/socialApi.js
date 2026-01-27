import api from "../api/api";

// — Posts —
export const fetchPosts = async () => {
  const { data } = await api.get("/api/social/posts/");
  return data;
};

export const createPost = async ({ kind, content, content_medical, files }) => {
  const fd = new FormData();
  fd.append("kind", kind || "normal");

  if (kind === "medical")
    fd.append("content_medical", JSON.stringify(content_medical || {}));
  else fd.append("content", content || "");

  (files || []).forEach((f) => fd.append("media", f));

  const { data } = await api.post("/api/social/posts/", fd);

  return data;
};

export const reactPost = async (postId, type) =>
  type
    ? api.post(`/api/social/posts/${postId}/reactions/`, { type })
    : api.delete(`/api/social/posts/${postId}/reactions/`);

export const sharePost = async (postId, message) => {
  const { data } = await api.post(`/api/social/posts/${postId}/share/`, {
    message,
  });
  return data;
};

// — Comments —
export const listComments = async (postId) => {
  const { data } = await api.get(`/api/social/comments/?post=${postId}`);
  return data;
};
export const addComment = async ({ postId, text, parentId }) => {
  const { data } = await api.post(`/api/social/comments/`, {
    post: postId,
    text,
    parent: parentId || null,
  });
  return data;
};
export const editComment = (id, text) =>
  api.patch(`/api/social/comments/${id}/`, { text });
export const deleteComment = (id) => api.delete(`/api/social/comments/${id}/`);
export const reactComment = (id, type) =>
  type
    ? api.post(`/api/social/comments/${id}/reactions/`, { type })
    : api.delete(`/api/social/comments/${id}/reactions/`);
// Sửa bài viết
export const updatePost = async (postId, text) => {
  const { data } = await api.patch(`/api/social/posts/${postId}/`, {
    content: text,
  });
  return data;
};

// Xóa bài viết
export const deletePost = async (postId) => {
  await api.delete(`/api/social/posts/${postId}/`);
  return true;
};
// Lấy danh sách người thả cảm xúc
export const getPostReactions = async (postId) => {
  const { data } = await api.get(`/api/social/posts/${postId}/reactions/`);
  return data;
};
// 1. Lấy danh sách thông báo
export const getNotifications = async () => {
  const { data } = await api.get("/api/social/notifications/");
  return data;
};

// 2. Đánh dấu tất cả là đã đọc
export const markAllNotificationsRead = async () => {
  const { data } = await api.post("/api/social/notifications/mark_all_read/");
  return data;
};

// 3. Đánh dấu 1 cái là đã đọc (khi click vào nó)
export const markNotificationRead = async (id) => {
  const { data } = await api.post(`/api/social/notifications/${id}/mark_read/`);
  return data;
};
// Lấy chi tiết 1 bài viết theo ID
export const getPostById = async (postId) => {
  const { data } = await api.get(`/api/social/posts/${postId}/`);
  return data;
};

export const adminDeletePost = (id) => api.delete(`/api/social/posts/${id}/`);

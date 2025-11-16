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
  const { data } = await api.post("/api/social/posts/", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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

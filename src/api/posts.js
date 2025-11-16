// src/api/posts.js
import api from "../api"; // chính là instance axios bạn đã có

export async function createPost({
  text,
  files = [],
  kind = "normal",
  contentMedical = null,
}) {
  const form = new FormData();
  form.append("kind", kind);

  if (kind === "medical") {
    form.append("content_medical", JSON.stringify(contentMedical || {}));
  } else {
    form.append("content", text || "");
  }

  files.forEach((f) => form.append("media", f)); // nhiều ảnh/video -> key "media"

  const res = await api.post("/api/posts/", form); // KHÔNG set Content-Type thủ công
  return res.data;
}

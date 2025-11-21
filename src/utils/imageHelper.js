// src/utils/imageHelper.js

export const resolveImageUrl = (url) => {
  // 1. Ảnh mặc định nếu null/undefined
  if (!url) return "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  // 2. Nếu là Blob/File (Preview khi chọn ảnh từ máy)
  if (url instanceof File || url instanceof Blob) {
    return URL.createObjectURL(url);
  }

  // 3. Nếu là Object (trường hợp backend trả về {url: "..."})
  const finalUrl = typeof url === "object" ? url.url || "" : url;

  // 4. Kiểm tra link tuyệt đối (Cloudinary, Google, v.v.)
  if (finalUrl.startsWith("http") || finalUrl.startsWith("https")) {
    return finalUrl;
  }

  // 5. Nếu là link tương đối (/media/...), nối domain backend vào
  const baseUrl = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
  const path = finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`;

  return `${baseUrl}${path}`;
};

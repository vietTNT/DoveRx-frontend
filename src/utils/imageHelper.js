// src/utils/imageHelper.js

export const getOptimizedUrl = (url, width = "auto", height = "auto") => {
  if (!url) return "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  // Nếu là ảnh Blob (preview khi vừa chọn ảnh xong chưa upload)
  if (url.startsWith("blob:")) return url;

  // Nếu là ảnh từ Cloudinary
  if (url.includes("cloudinary.com")) {
    // 🛠️ Giải thích tham số:
    // f_auto: Tự chọn định dạng (WebP/AVIF) tốt nhất cho trình duyệt
    // q_auto: Tự nén ảnh mà mắt thường không thấy giảm chất lượng
    // c_limit,w_{width}: Resize ảnh vừa khung, không bị méo
    const transformations = `f_auto,q_auto,c_limit,w_${width},h_${height}`;

    // Chèn transformations vào sau /upload/
    return url.replace("/upload/", `/upload/${transformations}/`);
  }

  // Ảnh link ngoài hoặc local backend
  return url;
};

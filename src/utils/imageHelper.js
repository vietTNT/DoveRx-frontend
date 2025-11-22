// src/utils/imageHelper.js

export const resolveImageUrl = (url, width = 600) => {
  // 1. Ảnh mặc định
  if (!url) return "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  // 2. Nếu là Blob/File (Preview khi upload) -> Giữ nguyên
  if (url instanceof File || url instanceof Blob) {
    return URL.createObjectURL(url);
  }

  // 3. Xử lý URL từ object
  let finalUrl = typeof url === "object" ? url.url || "" : url;

  // 4. 🔥 TỐI ƯU CLOUDINARY: Chèn tham số resize vào URL
  // URL gốc: https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg
  // URL tối ưu: https://res.cloudinary.com/demo/image/upload/w_600,q_auto,f_auto/v1234/sample.jpg
  if (finalUrl.includes("cloudinary.com") && finalUrl.includes("/upload/")) {
    // Kiểm tra xem đã có tham số resize chưa để tránh chèn 2 lần
    if (!finalUrl.includes("/w_")) {
      // Chèn w_{width}, q_auto (chất lượng tự động), f_auto (định dạng tự động - webp/avif)
      const transformation = `w_${width},q_auto,f_auto`;
      return finalUrl.replace("/upload/", `/upload/${transformation}/`);
    }
  }

  // 5. Xử lý link tương đối
  if (finalUrl.startsWith("http") || finalUrl.startsWith("https")) {
    return finalUrl;
  }
  const baseUrl = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
  const path = finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`;
  return `${baseUrl}${path}`;
};

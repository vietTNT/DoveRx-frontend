// src/utils/imageHelper.js

export const resolveImageUrl = (url, width = 600) => {
  // 1. Ảnh mặc định
  if (!url) return "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  // 2. Nếu là Blob/File trực tiếp (Input là File object)
  if (url instanceof File || url instanceof Blob) {
    return URL.createObjectURL(url);
  }

  // 3. Xử lý URL từ object (lấy string ra)
  let finalUrl = typeof url === "object" ? url.url || "" : url;

  // 🔥 SỬA LỖI TẠI ĐÂY: Nếu chuỗi là blob url (preview ảnh), trả về ngay
  if (typeof finalUrl === "string" && finalUrl.startsWith("blob:")) {
    return finalUrl;
  }

  // 4. Kiểm tra nếu là VIDEO thì TRẢ VỀ NGUYÊN GỐC
  if (finalUrl.includes("/video/upload/")) {
    return finalUrl;
  }

  // 5. TỐI ƯU ẢNH CLOUDINARY
  if (finalUrl.includes("cloudinary.com") && finalUrl.includes("/upload/")) {
    if (!finalUrl.includes("/w_")) {
      const transformation = `w_${width},q_auto,f_auto`;
      return finalUrl.replace("/upload/", `/upload/${transformation}/`);
    }
  }

  // 6. Xử lý link tương đối / tuyệt đối
  if (finalUrl.startsWith("http") || finalUrl.startsWith("https")) {
    return finalUrl;
  }

  const baseUrl = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
  const path = finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`;
  return `${baseUrl}${path}`;
};

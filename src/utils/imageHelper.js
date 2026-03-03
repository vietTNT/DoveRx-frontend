// src/utils/imageHelper.js

export const resolveImageUrl = (url, width = 600) => {
  const FALLBACK_IMAGE =
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  if (!url) return FALLBACK_IMAGE;

  // 1. Xử lý Blob/File
  if (url instanceof File || url instanceof Blob) {
    return URL.createObjectURL(url);
  }

  // 2. Xử lý object
  let finalUrl = url;
  if (typeof url === "object") {
    finalUrl = url.url || url.file || url.image || "";
  }

  if (typeof finalUrl !== "string" || !finalUrl) return FALLBACK_IMAGE;
  if (finalUrl.startsWith("blob:")) return finalUrl;

  if (!finalUrl.startsWith("http")) {
    const baseUrl = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
    const path = finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`;
    finalUrl = `${baseUrl}${path}`;
  }

  // 4. KIỂM TRA VIDEO

  const isVideo =
    finalUrl.includes("/video/upload/") ||
    /\.(mp4|mov|avi|webm|mkv)$/i.test(finalUrl);

  if (isVideo) {
    // Nếu URL đang là /auto/upload/ mà đuôi là video -> Nên sửa thành /video/upload/ nếu cần

    return finalUrl;
  }

  // 5. Xử lý Cloudinary cho ẢNH
  if (finalUrl.includes("cloudinary.com") && finalUrl.includes("/upload/")) {
    finalUrl = finalUrl.replace("/auto/upload/", "/image/upload/");

    finalUrl = finalUrl.replace(/([a-zA-Z])\s+(\d+|auto)/g, "$1_$2");

    if (!finalUrl.includes("/w_")) {
      const transformation = `w_${width},q_auto,f_auto`;
      finalUrl = finalUrl.replace("/upload/", `/upload/${transformation}/`);
    }
  }

  return finalUrl;
};

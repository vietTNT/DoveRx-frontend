// utils/timeUtils.js
export const getTimeAgo = (timestamp) => {
  const diff = Math.floor((Date.now() - timestamp) / 60000);
  if (diff < 1) return "Vừa xong";
  if (diff < 60) return `${diff} phút trước`;
  if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
  return `${Math.floor(diff / 1440)} ngày trước`;
};

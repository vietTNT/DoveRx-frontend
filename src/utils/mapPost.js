// export const mapPostToUI = (srv) => ({
//   id: srv.id,
//   author: srv.author?.name || "Người dùng",
//   avatar:
//     srv.author?.avatar ||
//     "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
//   time: srv.time, // bạn có thể format “2 giờ trước”
//   content: srv.kind === "medical" ? srv.content : srv.content || "",
//   images: (srv.images || []).map((m) => ({ url: m.url, type: m.type })),
//   _raw: srv,
// });
// src/utils/mapPost.js

export const mapPostToUI = (srv) => {
  // 1. Lấy thông tin reaction từ server (Backend trả về user_reaction là string "like", "love"...)
  // Backend đã sửa trả về 'user_reaction', nhưng ta check thêm 'my_reaction' để dự phòng
  let reactionType = srv.user_reaction || srv.my_reaction || null;

  // Nếu my_reaction trả về là object {type: 'like'...} (code cũ), ta lấy .type ra
  if (reactionType && typeof reactionType === "object") {
    reactionType = reactionType.type;
  }

  return {
    id: srv.id,
    author: srv.author?.name || "Người dùng",
    avatar:
      srv.author?.avatar ||
      "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    time: srv.time,

    // ✅ Nội dung bài viết
    content: srv.kind === "medical" ? srv.content : srv.content || "",

    // ✅ Hình ảnh
    images: (srv.images || []).map((m) => ({ url: m.url, type: m.type })),

    // ✅ QUAN TRỌNG: Mapping các trường Reaction để UI nhận diện
    user_reaction: reactionType, // Để Dashboard check logic
    my_reaction: reactionType, // Để PostCard hiển thị nút like xanh
    current_reaction: reactionType, // Dự phòng

    // ✅ Số lượng reaction
    reaction_counts: srv.reaction_counts || {},

    // ✅ Giữ lại raw data để debug nếu cần
    _raw: srv,
  };
};

// src/utils/mapPost.js

export const mapPostToUI = (srv) => {
  // 1. Lấy thông tin reaction
  let reactionType = srv.user_reaction || srv.my_reaction || null;
  if (reactionType && typeof reactionType === "object") {
    reactionType = reactionType.type;
  }

  // ✅ FIX QUAN TRỌNG: Lấy dữ liệu bài gốc từ 'shared_post_data' (Backend gửi)
  // Nếu không có thì mới tìm 'shared_post'
  const rawShared = srv.shared_post_data || srv.shared_post;

  return {
    id: srv.id,

    // 2. Author (Người thực hiện hành động chia sẻ)
    author: {
      id: srv.author?.id,
      name: srv.author?.name || "Người dùng",
      avatar:
        srv.author?.avatar ||
        "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    },

    time: srv.time,

    // 3. Phân loại bài viết
    kind: srv.kind || "normal",

    // 4. Nội dung status của người share (Lời dẫn)
    content: srv.kind === "medical" ? srv.content : srv.content || "",

    // Hình ảnh của bài share (thường là null vì ảnh nằm trong bài gốc)
    images: (srv.images || []).map((m) => ({ url: m.url, type: m.type })),

    // =================================================================
    // 5. [FIXED] DỮ LIỆU BÀI VIẾT GỐC (Dùng khi kind === 'share')
    // =================================================================
    shared_post: rawShared
      ? {
          id: rawShared.id,
          content: rawShared.content || "", // Nội dung bài gốc
          time: rawShared.time,
          kind: rawShared.kind || "normal",

          // Thống kê của bài gốc
          reaction_counts: rawShared.reaction_counts || {},
          comments_count: rawShared.comments_count || 0,

          // Tác giả bài gốc (Quan trọng để hiển thị kiểu Facebook)
          author: {
            id: rawShared.author?.id,
            name: rawShared.author?.name || "Người dùng gốc",
            avatar:
              rawShared.author?.avatar ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          },

          // ✅ FIX ẢNH: Map đúng mảng images của bài gốc
          images: (rawShared.images || []).map((m) => ({
            url: m.url,
            type: m.type || "image",
          })),
        }
      : null,
    // =================================================================

    // 6. Reaction & Thống kê của bài chia sẻ
    user_reaction: reactionType,
    my_reaction: reactionType,
    current_reaction: reactionType,
    reaction_counts: srv.reaction_counts || {},

    shares_count: srv.shares_count || srv.shares || 0,
    comments_count: srv.comments_count || 0,

    // Raw data
    _raw: srv,
  };
};

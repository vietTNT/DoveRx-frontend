export const mapPostToUI = (srv) => {
  // Lấy thông tin reaction (giữ nguyên logic cũ)
  let reactionType = srv.user_reaction || srv.my_reaction || null;
  if (reactionType && typeof reactionType === "object") {
    reactionType = reactionType.type;
  }

  return {
    id: srv.id,

    // ✅ CHUẨN HÓA: Author bây giờ luôn là một OBJECT đầy đủ
    author: {
      id: srv.author?.id,
      name: srv.author?.name || "Người dùng",
      avatar:
        srv.author?.avatar ||
        "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    },

    time: srv.time,

    // Nội dung & Hình ảnh
    content: srv.kind === "medical" ? srv.content : srv.content || "",
    images: (srv.images || []).map((m) => ({ url: m.url, type: m.type })),

    // Reaction
    user_reaction: reactionType,
    my_reaction: reactionType,
    current_reaction: reactionType,
    reaction_counts: srv.reaction_counts || {},

    // Raw data
    _raw: srv,
  };
};

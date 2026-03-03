// export const mapPostToUI = (srv) => {
//   // 1. Lấy thông tin reaction
//   let reactionType = srv.user_reaction || srv.my_reaction || null;
//   if (reactionType && typeof reactionType === "object") {
//     reactionType = reactionType.type;
//   }

//   //  Lấy dữ liệu bài gốc từ 'shared_post_data' (Backend gửi)
//   // Nếu không có thì mới tìm 'shared_post'
//   const rawShared = srv.shared_post_data || srv.shared_post;

//   return {
//     id: srv.id,

//     // 2. Author (Người thực hiện hành động chia sẻ)
//     author: {
//       id: srv.author?.id,
//       name: srv.author?.name || "Người dùng",
//       avatar:
//         srv.author?.avatar ||
//         "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
//     },

//     time: srv.time,

//     // 3. Phân loại bài viết
//     kind: srv.kind || "normal",

//     // 4. Nội dung status của người share (Lời dẫn)
//     content: srv.kind === "medical" ? srv.content : srv.content || "",

//     // Hình ảnh của bài share (thường là null vì ảnh nằm trong bài gốc)
//     images: (srv.images || []).map((m) => ({ url: m.url, type: m.type })),

//     // =================================================================
//     // 5. DỮ LIỆU BÀI VIẾT GỐC (Dùng khi kind === 'share')
//     // =================================================================
//     shared_post: rawShared
//       ? {
//           id: rawShared.id,
//           content: rawShared.content || "", // Nội dung bài gốc
//           time: rawShared.time,
//           kind: rawShared.kind || "normal",

//           // Thống kê của bài gốc
//           reaction_counts: rawShared.reaction_counts || {},
//           comments_count: rawShared.comments_count || 0,

//           // Tác giả bài gốc (Quan trọng để hiển thị kiểu Facebook)
//           author: {
//             id: rawShared.author?.id,
//             name: rawShared.author?.name || "Người dùng gốc",
//             avatar:
//               rawShared.author?.avatar ||
//               "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
//           },

//           // Map đúng mảng images của bài gốc
//           images: (rawShared.images || []).map((m) => ({
//             url: m.url,
//             type: m.type || "image",
//           })),
//         }
//       : null,
//     // =================================================================
//     visibility: srv.visibility || "public",
//     // 6. Reaction & Thống kê của bài chia sẻ
//     user_reaction: reactionType,
//     my_reaction: reactionType,
//     current_reaction: reactionType,
//     reaction_counts: srv.reaction_counts || {},

//     shares_count: srv.shares_count || srv.shares || 0,
//     comments_count: srv.comments_count || 0,

//     // Raw data
//     _raw: srv,
//   };
// };
// src/utils/mapPost.js

export const mapPostToUI = (srv) => {
  // 1. Lấy thông tin reaction
  let reactionType = srv.user_reaction || srv.my_reaction || null;
  if (reactionType && typeof reactionType === "object") {
    reactionType = reactionType.type;
  }

  // 2. Lấy dữ liệu bài gốc từ 'shared_post_data' (hoặc 'shared_post')
  const rawShared = srv.shared_post_data || srv.shared_post;
  let rawMainContent = srv.content_medical || srv.content || "";
  //  Xử lý an toàn tuyệt đối cho Medical Content
  let safeContent = rawMainContent;
  if (srv.kind === "medical") {
    if (typeof srv.content === "string") {
      try {
        safeContent = JSON.parse(srv.content);
      } catch (err) {
        console.warn("⚠️ [mapPost] Lỗi parse JSON medical content:", err);
        safeContent = {}; // Fallback an toàn nếu chuỗi lỗi
      }
    } else if (typeof srv.content === "object" && srv.content !== null) {
      safeContent = srv.content;
    } else {
      safeContent = {}; // Fallback nếu là null/undefined
    }
  }

  //  Xử lý an toàn bài viết Share
  let mappedSharedPost = null;
  if (rawShared) {
    if (rawShared.status === "unavailable") {
      // Trường hợp bài gốc bị xóa / khóa
      mappedSharedPost = {
        status: "unavailable",
        message: rawShared.message || "Nội dung này hiện không khả dụng.",
      };
    } else {
      let rawSharedContent =
        rawShared.content_medical || rawShared.content || "";
      let sharedSafeContent = rawSharedContent;
      if (rawShared.kind === "medical") {
        if (typeof rawSharedContent === "string") {
          try {
            sharedSafeContent = JSON.parse(rawSharedContent);
          } catch (err) {
            console.warn("Lỗi parse bài share Y khoa:", err);
            sharedSafeContent = {};
          }
        } else if (
          typeof rawSharedContent === "object" &&
          rawSharedContent !== null
        ) {
          sharedSafeContent = rawSharedContent;
        } else {
          sharedSafeContent = {};
        }
      }
      // Trường hợp bài gốc bình thường
      mappedSharedPost = {
        id: rawShared.id,
        content: sharedSafeContent,
        time: rawShared.time,
        kind: rawShared.kind || "normal",
        category: rawShared.category || "other",
        visibility: rawShared.visibility || "public", // Bổ sung quyền riêng tư bài gốc
        reaction_counts: rawShared.reaction_counts || {},
        comments_count: rawShared.comments_count || 0,
        author: {
          id: rawShared.author?.id || null, // Fallback rõ ràng là null
          name: rawShared.author?.name || "Người dùng gốc",
          avatar:
            rawShared.author?.avatar ||
            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        },
        images: (rawShared.images || []).map((m) => ({
          url: m.url,
          type: m.type || "image",
        })),
      };
    }
  }

  return {
    id: srv.id,

    //  Bổ sung visibility cho bài viết hiện tại
    visibility: srv.visibility || "public",
    category: srv.category || "other",

    author: {
      id: srv.author?.id || null, // Tránh undefined
      name: srv.author?.name || "Người dùng",
      avatar:
        srv.author?.avatar ||
        "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    },

    time: srv.time,
    kind: srv.kind || "normal",
    content: safeContent, //  Đã được parse an toàn

    images: (srv.images || []).map((m) => ({ url: m.url, type: m.type })),

    // Đã qua xử lý phân nhánh unavailable/available
    shared_post: mappedSharedPost,

    user_reaction: reactionType,
    my_reaction: reactionType,
    current_reaction: reactionType,
    reaction_counts: srv.reaction_counts || {},

    shares_count: srv.shares_count || srv.shares || 0,
    comments_count: srv.comments_count || 0,

    _raw: srv,
  };
};

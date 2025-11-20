import React, { useState, useRef, useEffect } from "react";
import ShareModal from "./ShareModal";
import CommentModal from "./CommentModal";
import "../../styles/PostCard.css";
import { toast } from "react-toastify";
import {
  reactPost,
  sharePost,
  listComments,
  addComment,
  editComment as apiEditComment,
  deleteComment as apiDeleteComment,
  reactComment,
} from "../../services/socialApi";
import websocketService from "../../services/websocket";

// ✅ THÊM HELPER FUNCTION
const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user?.id || null;
  } catch (error) {
    console.error("❌ [getCurrentUserId] Error:", error);
    return null;
  }
};

/* ---------- Comment Input ---------- */
export const CommentInput = ({
  placeholder,
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  mentionName = "",
}) => (
  <div className="comment-input">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
    />
    <button onClick={onSubmit}>Gửi</button>
  </div>
);

/* ---------- Comment Item (đệ quy) ---------- */
export const CommentItem = ({
  c,
  level = 0,
  MAX_REPLIES_VISIBLE,
  MAX_NEST_LEVEL,
  emojiList,
  activeCommentPopup,
  setActiveCommentPopup,
  toggleCommentLike,
  setCommentReaction,
  toggleReplyBox,
  getEditDraft,
  setEditDraft,
  saveEdit,
  startEdit,
  deleteComment,
  getReplyDraft,
  setReplyDraft,
  submitReply,
  mutateComments,
  updateNode,
  currentUser,
  getTimeAgo,
}) => {
  const hidePopupTimer = useRef(null);

  const armCommentPopup = (id) => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    setActiveCommentPopup(id);
  };

  const disarmCommentPopup = () => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    hidePopupTimer.current = setTimeout(() => setActiveCommentPopup(null), 300);
  };
  const timeData = c.created_at || c.createdAt;
  return (
    <div className="comment-item" style={{ marginLeft: level > 0 ? 36 : 0 }}>
      <img
        src={
          c.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        }
        alt="avatar"
        className="comment-avatar"
      />
      <div className="comment-content">
        <div className="comment-bubble">
          <strong className="comment-author">{c.user}</strong>

          {c.editing ? (
            <CommentInput
              placeholder="Chỉnh sửa bình luận..."
              value={getEditDraft(c.id)}
              onChange={(val) => setEditDraft(c.id, val)}
              onSubmit={() => saveEdit(c.id)}
              autoFocus
            />
          ) : (
            <p className="comment-text">{c.text}</p>
          )}
        </div>

        <div className="comment-actions">
          <div
            className="comment-react-wrapper"
            onMouseEnter={() => armCommentPopup(`c-${c.id}`)}
            onMouseLeave={disarmCommentPopup}
          >
            <span
              className={`comment-react ${c.reaction ? "active" : ""}`}
              onMouseEnter={() => armCommentPopup(`c-${c.id}`)}
              onClick={() => toggleCommentLike(c.id)}
            >
              {c.reaction ? (
                <>
                  {c.reaction.icon} {c.reaction.label}
                </>
              ) : (
                <>
                  <i className="far fa-thumbs-up" /> Thích
                </>
              )}
            </span>

            {activeCommentPopup === `c-${c.id}` && (
              <div
                className="comment-reaction-popup"
                onMouseEnter={() => armCommentPopup(`c-${c.id}`)}
                onMouseLeave={disarmCommentPopup}
              >
                {emojiList.map((e) => (
                  <span
                    key={e.type}
                    className="reaction-icon"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      setCommentReaction(c.id, e.type);
                      setActiveCommentPopup(null);
                    }}
                  >
                    {e.icon}
                  </span>
                ))}
              </div>
            )}
          </div>

          {level < MAX_NEST_LEVEL && (
            <>
              <span> · </span>
              <span
                className="comment-reply"
                onClick={() => toggleReplyBox(c.id)}
              >
                <i className="far fa-comment-dots" /> Trả lời
              </span>
            </>
          )}

          <span> · </span>
          <span className="comment-time">
            {timeData ? getTimeAgo(timeData) : "Vừa xong"}
          </span>

          {c.likes > 0 && (
            <span className="reaction-count" style={{ marginLeft: 8 }}>
              {c.reaction?.icon || "👍"} {c.likes}
            </span>
          )}

          {/* ✅ Kiểm tra quyền xóa: So sánh user.id thay vì user.name */}
          {currentUser?.id && currentUser.id === c.userId && !c.editing && (
            <>
              <span> · </span>
              <span
                className="comment-edit"
                onClick={() => startEdit(c.id, c.text)}
              >
                <i className="far fa-edit" /> Sửa
              </span>
              <span> · </span>
              <span
                className="comment-delete"
                onClick={() => deleteComment(c.id)}
              >
                <i className="far fa-trash-alt" /> Xóa
              </span>
            </>
          )}
        </div>

        {/* ✅ Input trả lời với tag tên người dùng */}
        {c.replyOpen && (
          <CommentInput
            placeholder={`Trả lời ${c.user}...`}
            value={getReplyDraft(c.id)}
            onChange={(val) => setReplyDraft(c.id, val)}
            onSubmit={() => submitReply(c.id, c.user)}
            mentionName={c.user}
            autoFocus
          />
        )}

        {/* ✅ Hiển thị replies với nút "Xem thêm" */}
        {c.replies && c.replies.length > 0 && (
          <>
            {(c.replies || [])
              .slice(
                0,
                c.showAllReplies ? c.replies.length : MAX_REPLIES_VISIBLE
              )
              .map((r) => (
                <CommentItem
                  key={r.id}
                  c={r}
                  level={level + 1}
                  MAX_REPLIES_VISIBLE={MAX_REPLIES_VISIBLE}
                  MAX_NEST_LEVEL={MAX_NEST_LEVEL}
                  emojiList={emojiList}
                  activeCommentPopup={activeCommentPopup}
                  setActiveCommentPopup={setActiveCommentPopup}
                  toggleCommentLike={toggleCommentLike}
                  setCommentReaction={setCommentReaction}
                  toggleReplyBox={toggleReplyBox}
                  getEditDraft={getEditDraft}
                  setEditDraft={setEditDraft}
                  saveEdit={saveEdit}
                  startEdit={startEdit}
                  deleteComment={deleteComment}
                  getReplyDraft={getReplyDraft}
                  setReplyDraft={setReplyDraft}
                  submitReply={submitReply}
                  mutateComments={mutateComments}
                  updateNode={updateNode}
                  currentUser={currentUser}
                  getTimeAgo={getTimeAgo}
                />
              ))}

            {c.replies.length > MAX_REPLIES_VISIBLE && !c.showAllReplies && (
              <p
                className="view-more-replies"
                onClick={() =>
                  mutateComments((list) =>
                    updateNode(list, c.id, (node) => ({
                      ...node,
                      showAllReplies: true,
                    }))
                  )
                }
              >
                Xem thêm {c.replies.length - MAX_REPLIES_VISIBLE} phản hồi
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- Post Card ---------- */
const PostCard = ({
  p,
  currentUser,
  reactions,
  setReactions,
  comments,
  setComments,
  emojiList,
  activePopup,
  setActivePopup,
  openLightbox,
  createNewComment,
  getTimeAgo,
  lightbox,
}) => {
  // Dratfs cho reply / edit
  const [drafts, setDrafts] = useState({ reply: {}, edit: {} });
  const [commentModalOpen, setCommentModalOpen] = useState(false); // ✅ State cho modal
  const [selectedPost, setSelectedPost] = useState(null);
  const getReplyDraft = (id) => drafts.reply[id] || "";
  const setReplyDraft = (id, value) =>
    setDrafts((prev) => ({ ...prev, reply: { ...prev.reply, [id]: value } }));
  const getEditDraft = (id) => drafts.edit[id] || "";
  const setEditDraft = (id, value) =>
    setDrafts((prev) => ({ ...prev, edit: { ...prev.edit, [id]: value } }));

  const MAX_REPLIES_VISIBLE = 2;
  const MAX_NEST_LEVEL = 2;

  const [activeCommentPopup, setActiveCommentPopup] = useState(null);
  const [activePostPopup, setActivePostPopup] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const postPopupTimer = useRef(null);
  const armPostPopup = (id) => {
    if (postPopupTimer.current) clearTimeout(postPopupTimer.current);
    setActivePostPopup(id);
  };

  // 3. Hàm đóng popup (có độ trễ 300ms để kịp di chuột sang)
  const disarmPostPopup = () => {
    if (postPopupTimer.current) clearTimeout(postPopupTimer.current);
    postPopupTimer.current = setTimeout(() => {
      setActivePostPopup(null);
    }, 300);
  };
  const myReactionType = reactions[p.id]; // stored as string type, e.g. "like"
  // Tìm emoji tương ứng để hiển thị icon/label
  const myReactionEmoji = myReactionType
    ? emojiList.find((e) => e.type === myReactionType)
    : null;
  useEffect(() => {
    const initialReactionType =
      p.user_reaction || p.current_reaction || p.my_reaction;
    if (initialReactionType && !reactions[p.id]) {
      // Chỉ lưu chuỗi type vào state
      setReactions((prev) => ({ ...prev, [p.id]: initialReactionType }));
    }
  }, [p, reactions, setReactions]);
  const countAllComments = (list) =>
    (list || []).reduce(
      (total, c) => total + 1 + countAllComments(c.replies),
      0
    );
  const sendReactionWS = (postId, type) => {
    websocketService.send("post_react", {
      post_id: postId,
      reaction_type: type,
    });
  };

  /* ---- Load comments for this post ---- */
  useEffect(() => {
    if (!comments[p.id]?.list) {
      listComments(p.id)
        .then((data) => {
          setComments((prev) => ({
            ...prev,
            [p.id]: {
              list: data,
              draft: prev[p.id]?.draft || "",
              open: true,
              limit: prev[p.id]?.limit || 3,
            },
          }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  /* ---- helpers to mutate nested comments ---- */
  const mutateComments = (mutateFn) => {
    setComments((prev) => {
      const postState = prev[p.id] || {
        list: [],
        draft: "",
        open: true,
        limit: 3,
      };
      const newList = mutateFn(postState.list || []);
      return { ...prev, [p.id]: { ...postState, list: newList } };
    });
  };

  const updateNode = (list, id, updater) =>
    (list || []).map((node) => {
      if (node.id === id) return updater(node);
      const replies = node.replies
        ? updateNode(node.replies, id, updater)
        : node.replies;
      return { ...node, replies };
    });

  const removeNode = (list, id) =>
    (list || [])
      .filter((n) => n.id !== id)
      .map((n) => ({
        ...n,
        replies: n.replies ? removeNode(n.replies, id) : n.replies,
      }));

  /* ---- comment actions ---- */
  const toggleCommentLike = (cid) => {
    let had = false;
    setComments((prev) => {
      const postState = prev[p.id] || { list: [] };
      const newList = updateNode(postState.list || [], cid, (c) => {
        had = !!c.reaction;
        return had
          ? { ...c, reaction: null, likes: Math.max(0, (c.likes || 1) - 1) }
          : {
              ...c,
              reaction: { type: "like", icon: "👍", label: "Thích" },
              likes: (c.likes || 0) + 1,
            };
      });
      return { ...prev, [p.id]: { ...postState, list: newList } };
    });
    (had ? reactComment(cid, null) : reactComment(cid, "like")).catch(() => {});
  };

  const setCommentReaction = (cid, type) => {
    // ✅ Tìm emoji tương ứng với type
    const emoji = emojiList.find((e) => e.type === type) || {
      type: "like",
      icon: "👍",
      label: "Thích",
    };

    setComments((prev) => {
      const postState = prev[p.id] || { list: [] };
      const newList = updateNode(postState.list || [], cid, (c) => ({
        ...c,
        reaction: emoji,
        likes: Math.max(1, c.likes || 1),
      }));
      return { ...prev, [p.id]: { ...postState, list: newList } };
    });
    reactComment(cid, type).catch(() => {});
  };

  const toggleReplyBox = (cid) =>
    mutateComments((list) =>
      updateNode(list, cid, (c) => ({ ...c, replyOpen: !c.replyOpen }))
    );

  // const submitReply = (cid) => {
  //   const text = (getReplyDraft(cid) || "").trim();
  //   if (!text) return;
  //   setReplyDraft(cid, "");

  //   addComment({ postId: p.id, text, parentId: cid })
  //     .then((created) => {
  //       setComments((prev) => {
  //         const postState = prev[p.id] || { list: [] };
  //         const newList = updateNode(postState.list || [], cid, (node) => ({
  //           ...node,
  //           replies: [...(node.replies || []), created],
  //           replyOpen: false,
  //         }));
  //         return { ...prev, [p.id]: { ...postState, list: newList } };
  //       });
  //     })
  //     .catch(() => {});
  // };
  // ✅ Cập nhật submitReply để thêm mention
  const submitReply = (cid, mentionedUser) => {
    const text = (getReplyDraft(cid) || "").trim();
    if (!text) return;

    // ✅ Tự động thêm @mention vào đầu nếu chưa có
    const finalText = text.startsWith(`@${mentionedUser}`)
      ? text
      : `@${mentionedUser} ${text}`;

    setReplyDraft(cid, "");

    addComment({
      postId: p.id,
      text: finalText,
      parentId: cid,
      mentionedUser, // ✅ Gửi thông tin người được tag
    })
      .then((created) => {
        setComments((prev) => {
          const postState = prev[p.id] || { list: [] };
          const newList = updateNode(postState.list || [], cid, (node) => ({
            ...node,
            // replies: [...(node.replies || []), { ...created, mentionedUser }],
            replyOpen: false,
          }));
          return { ...prev, [p.id]: { ...postState, list: newList } };
        });
      })
      .catch(() => {});
  };
  const startEdit = (cid, currentText) => {
    setEditDraft(cid, currentText || "");
    mutateComments((list) =>
      updateNode(list, cid, (c) => ({ ...c, editing: true }))
    );
  };

  const saveEdit = (cid) => {
    const text = (getEditDraft(cid) || "").trim();
    setEditDraft(cid, "");
    apiEditComment(cid, text).catch(() => {});
    setComments((prev) => {
      const postState = prev[p.id] || { list: [] };
      const newList = updateNode(postState.list || [], cid, (c) => ({
        ...c,
        text,
        editing: false,
      }));
      return { ...prev, [p.id]: { ...postState, list: newList } };
    });
  };

  const deleteComment = async (cid) => {
    const currentUserId = getCurrentUserId(); // ✅ Gọi hàm helper

    // ✅ Kiểm tra quyền xóa
    const findComment = (list, id) => {
      for (const node of list) {
        if (node.id === id) return node;
        if (node.replies) {
          const found = findComment(node.replies, id);
          if (found) return found;
        }
      }
      return null;
    };

    const postState = comments[p.id];
    if (!postState?.list) return;

    const comment = findComment(postState.list, cid);
    if (!comment) {
      console.warn("⚠️ [PostCard] Comment not found");
      return;
    }

    // ✅ Chỉ người tạo mới được xóa (so sánh userId thay vì user.id)
    if (comment.userId !== currentUserId) {
      toast.error("❌ Bạn không có quyền xóa bình luận này");
      return;
    }

    // ✅ Xác nhận trước khi xóa
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) {
      return;
    }

    try {
      // ✅ Gọi API delete
      await apiDeleteComment(cid);
      console.log("✅ [PostCard] Comment deleted:", cid);

      // ✅ WebSocket sẽ broadcast event delete_comment
      // → Dashboard sẽ tự động xóa comment khỏi UI
    } catch (err) {
      console.error("❌ [PostCard] Delete failed:", err);

      if (err.response?.status === 403) {
        toast.error("❌ Bạn không có quyền xóa bình luận này");
      } else {
        toast.error("❌ Xóa bình luận thất bại");
      }
    }
  };

  // const setPostReaction = (type) => {
  //   const item = emojiList.find((r) => r.type === type) || {
  //     icon: "👍",
  //     label: "Thích",
  //   };

  //   // 1️⃣ GỬI WEBSOCKET REALTIME
  //   websocketService.send("post_react", {
  //     post_id: p.id,
  //     reaction_type: type,
  //   });

  //   // 2️⃣ CẬP NHẬT UI LOCAL
  //   setReactions((prev) => ({ ...prev, [p.id]: item }));

  //   // 3️⃣ LƯU DB BẰNG API
  //   reactPost(p.id, type).catch(() => {});
  //   setActivePostPopup(null);
  // };
  // const totalReacts = Object.values(p.reaction_counts || {}).reduce(
  //   (a, b) => a + b,
  //   0
  // );
  const setPostReaction = (type) => {
    // Gửi socket
    websocketService.send("post_react", {
      post_id: p.id,
      reaction_type: type,
    });

    // ✅ Cập nhật State: Chỉ lưu chuỗi type
    setReactions((prev) => ({ ...prev, [p.id]: type }));

    // Gọi API
    reactPost(p.id, type).catch(() => {});

    // Đóng popup
    setActivePostPopup(null);
  };
  const togglePostReaction = () => {
    // Lấy reaction hiện tại của user (từ state reactions hoặc từ props p)
    const currentReaction = reactions[p.id];

    if (currentReaction) {
      // TRƯỜNG HỢP 1: Đã like -> Bấm để BỎ LIKE
      websocketService.send("post_react", {
        post_id: p.id,
        reaction_type: null, // null nghĩa là xóa reaction
      });

      setReactions((prev) => {
        const copy = { ...prev };
        delete copy[p.id]; // Xóa khỏi state
        return copy;
      });

      reactPost(p.id, null).catch(() => {}); // Gọi API xóa
    } else {
      // TRƯỜNG HỢP 2: Chưa like -> Bấm để LIKE (Mặc định là 👍)
      websocketService.send("post_react", {
        post_id: p.id,
        reaction_type: "like",
      });

      setReactions((prev) => ({ ...prev, [p.id]: "like" })); // lưu CHUỖI type

      reactPost(p.id, "like").catch(() => {}); // Gọi API like
    }
  };

  const copyPostLink = async () => {
    try {
      if (typeof window !== "undefined" && navigator?.clipboard) {
        const url = `${window.location.origin}${window.location.pathname}#post-${p.id}`;
        await navigator.clipboard.writeText(url);
        setShareMessage("Đã sao chép liên kết");
      } else {
        setShareMessage("Trình duyệt không hỗ trợ sao chép");
      }
    } catch {
      setShareMessage("Sao chép thất bại");
    }
    setTimeout(() => setShareMessage(""), 2000);
    setShareOpen(false);
  };

  const handleWebShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: p.author,
          text: typeof p.content === "string" ? p.content : "",
          url: `${window.location.origin}${window.location.pathname}#post-${p.id}`,
        });
        setShareMessage("Đã chia sẻ");
      } catch {
        setShareMessage("Hủy chia sẻ");
      }
      setTimeout(() => setShareMessage(""), 2000);
      setShareOpen(false);
    } else {
      copyPostLink();
    }
  };

  /* ---- render ---- */
  const limit = comments[p.id]?.limit || 3;
  const list = comments[p.id]?.list || [];
  const visible = list.slice(0, limit);

  return (
    <div className="post-card" id={`post-${p.id}`}>
      <div className="post-header">
        <img src={p.avatar} alt="avatar" className="post-avatar" />
        <div className="post-info">
          <strong>{p.author}</strong>
          <span>{getTimeAgo(p.time)}</span>
        </div>
      </div>

      {/* content */}
      {(() => {
        let content = p.content;
        try {
          if (typeof content === "string" && content.startsWith("{")) {
            content = JSON.parse(content); // ✅ parse JSON string
          }
        } catch (err) {
          console.warn("Lỗi parse JSON nội dung:", err);
        }

        if (typeof content === "object") {
          return (
            <div className="post-content medical-post">
              <p>
                <strong>🩺 Triệu chứng:</strong> {content.symptom || "—"}
              </p>
              <p>
                <strong>⏱️ Thời gian:</strong> {content.duration || "—"}
              </p>
              <p>
                <strong>⚖️ Mức độ:</strong> {content.severity || "—"}
              </p>
              <p>
                <strong>📈 Yếu tố ảnh hưởng:</strong> {content.factors || "—"}
              </p>
              <p>
                <strong>💊 Tiền sử cá nhân:</strong>{" "}
                {content.historyPersonal || "—"}
              </p>
              <p>
                <strong>🧬 Tiền sử gia đình:</strong>{" "}
                {content.historyFamily || "—"}
              </p>
              <p>
                <strong>💉 Thuốc đang dùng:</strong> {content.medication || "—"}
              </p>
              <p>
                <strong>🧠 Lối sống:</strong> {content.lifestyle || "—"}
              </p>
            </div>
          );
        } else {
          return <p className="post-content">{content}</p>;
        }
      })()}

      {/* media */}
      {p.images && p.images.length > 0 && (
        <div className="post-image-container">
          {" "}
          {/* ✅ Bọc thêm div này để xử lý tràn viền mobile */}
          <div
            className={`post-images ${p.images.length > 1 ? "multiple" : ""}`}
            data-count={
              p.images.length
            } /* ✅ Thêm dòng này để CSS bắt được số lượng ảnh */
          >
            {p.images
              .slice(0, p.images.length > 4 ? 4 : p.images.length)
              .map((m, idx) => (
                <div
                  key={idx}
                  className="image-wrapper"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(p.images, idx);
                  }}
                >
                  {/* Overlay +N */}
                  {idx === 3 && p.images.length > 4 && (
                    <div className="overlay-more">+{p.images.length - 4}</div>
                  )}

                  {/* Render Video hoặc Ảnh */}
                  {(!lightbox?.open || lightbox.index !== idx) &&
                  m.type?.startsWith("video") ? (
                    <video
                      src={m.url}
                      className="post-media"
                      muted // Autoplay cần mute
                    />
                  ) : !m.type?.startsWith("video") ? (
                    <img
                      src={m.url}
                      alt={`post-${p.id}-${idx}`}
                      className="post-media"
                      loading="lazy" /* ✅ Tối ưu hiệu năng tải trang */
                    />
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* actions */}
      <div className="post-actions">
        <div className="post-stats">
          {/* {reactions[p.id] && (
            <span className="reaction-count">{reactions[p.id].icon} 1</span>
          )} */}
          {Object.keys(p.reaction_counts || {}).length > 0 && (
            <span className="reaction-count">
              {Object.entries(p.reaction_counts).map(([type, count]) => (
                <span key={type}>
                  {emojiList.find((e) => e.type === type)?.icon || "👍"} {count}
                </span>
              ))}
            </span>
          )}

          {countAllComments(list) > 0 && (
            <span className="comment-share-count">
              {countAllComments(list)} bình luận
            </span>
          )}
        </div>

        <div className="post-buttons">
          {/* like */}

          <div
            className="post-action-group"
            // 👇 SỬA: Dùng hàm arm/disarm thay vì setActive trực tiếp
            onMouseEnter={() => armPostPopup(`p-${p.id}`)}
            onMouseLeave={disarmPostPopup}
          >
            <button
              className={`post-like-btn ${myReactionType ? "active" : ""}`}
              onClick={togglePostReaction}
            >
              {myReactionEmoji?.icon || "👍"}{" "}
              {myReactionEmoji?.label || "Thích"}
            </button>

            {activePostPopup === `p-${p.id}` && (
              <div
                className="reaction-popup"
                // 👇 SỬA: Thêm sự kiện này vào chính popup để giữ nó mở khi chuột đang chọn icon
                onMouseEnter={() => armPostPopup(`p-${p.id}`)}
                onMouseLeave={disarmPostPopup}
              >
                {emojiList.map((e) => (
                  <span
                    key={e.type}
                    className="reaction-icon"
                    onClick={() => setPostReaction(e.type)}
                  >
                    {e.icon}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* comment toggle */}
          <div className="post-action-group">
            <button onClick={() => setCommentModalOpen(true)}>
              💬 Bình luận
            </button>
          </div>

          {/* share */}
          <div className="post-action-group">
            <button onClick={() => setShareOpen(true)}>🔗 Chia sẻ</button>
            {shareOpen && (
              <ShareModal
                onClose={() => setShareOpen(false)}
                user={currentUser}
                friends={[]}
                onShare={async (msg) => {
                  try {
                    await sharePost(p.id, msg || "");
                  } catch {}
                  setShareOpen(false);
                  setShareMessage("Đã chia sẻ");
                  setTimeout(() => setShareMessage(""), 2000);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ✅ Comment Modal */}
      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        post={p}
        comments={comments}
        currentUser={currentUser}
        emojiList={emojiList}
        activeCommentPopup={activeCommentPopup}
        setActiveCommentPopup={setActiveCommentPopup}
        toggleCommentLike={toggleCommentLike}
        setCommentReaction={setCommentReaction}
        toggleReplyBox={toggleReplyBox}
        getEditDraft={getEditDraft}
        setEditDraft={setEditDraft}
        saveEdit={saveEdit}
        startEdit={startEdit}
        deleteComment={deleteComment}
        getReplyDraft={getReplyDraft}
        setReplyDraft={setReplyDraft}
        submitReply={submitReply}
        mutateComments={mutateComments}
        updateNode={updateNode}
        getTimeAgo={getTimeAgo}
        commentDraft={comments[p.id]?.draft || ""}
        setCommentDraft={(val) =>
          setComments((prev) => ({
            ...prev,
            [p.id]: { ...prev[p.id], draft: val },
          }))
        }
        onSubmitComment={async () => {
          const text = comments[p.id]?.draft?.trim();
          if (!text) return;
          try {
            const created = await addComment({ postId: p.id, text });
            setComments((prev) => ({
              ...prev,
              [p.id]: {
                ...prev[p.id],
                draft: "",
              },
            }));
          } catch {}
        }}
        MAX_REPLIES_VISIBLE={MAX_REPLIES_VISIBLE}
        MAX_NEST_LEVEL={MAX_NEST_LEVEL}
        reactions={reactions}
        setReactions={setReactions}
        activePopup={activePopup}
        setActivePopup={setActivePopup}
        onShareClick={() => {
          setSelectedPost(p);
          setShareOpen(true);
        }}
      />
    </div>
  );
};

export default PostCard;

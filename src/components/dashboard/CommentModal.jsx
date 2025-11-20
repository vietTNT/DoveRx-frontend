import React, { useRef, useEffect } from "react";
import "../../styles/CommentModal.css";
import { CommentItem, CommentInput } from "./PostCard";

// Fallback chung
const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

// Helper: chuẩn hoá avatar (string | {url: string} | File/Blob)
const resolveAvatar = (avatar) => {
  if (!avatar) return DEFAULT_AVATAR;

  // Nếu là object với .url (thường DRF returns { url: "/media/..." })
  if (typeof avatar === "object") {
    if (avatar.url) {
      const url = avatar.url;
      // Nếu là đường dẫn tương đối, thêm API_BASE nếu có
      if (url.startsWith("/")) {
        const base = process.env.REACT_APP_API_BASE || "";
        return base.replace(/\/$/, "") + url;
      }
      return url;
    }
    // Nếu là File/Blob
    if (avatar instanceof Blob || avatar instanceof File) {
      try {
        return URL.createObjectURL(avatar);
      } catch {
        return DEFAULT_AVATAR;
      }
    }
    return DEFAULT_AVATAR;
  }

  // Nếu là string
  if (typeof avatar === "string") {
    if (avatar === "null" || avatar === "undefined" || avatar.trim() === "") {
      return DEFAULT_AVATAR;
    }
    if (avatar.startsWith("/")) {
      const base = process.env.REACT_APP_API_BASE || "";
      return base.replace(/\/$/, "") + avatar;
    }
    return avatar;
  }

  return DEFAULT_AVATAR;
};

const CommentModal = ({
  isOpen,
  onClose,
  post,
  comments,
  currentUser,
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
  getTimeAgo,
  onSubmitComment,
  commentDraft,
  setCommentDraft,
  MAX_REPLIES_VISIBLE,
  MAX_NEST_LEVEL,
  reactions,
  setReactions,
  activePopup,
  setActivePopup,
  onShareClick,
}) => {
  const commentListRef = useRef(null);
  const hidePopupTimer = useRef(null);
  const postPopupTimer = useRef(null);
  // ✅ Di chuyển tất cả logic lên trước if (!isOpen)
  const list = comments[post.id]?.list || [];
  const myReaction = reactions[post.id];
  const reactionSummary = post.reactionSummary || {
    like: 0,
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };
  const totalReactions = Object.values(reactionSummary).reduce(
    (sum, count) => sum + count,
    0
  );

  const armPopup = (id) => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    setActivePopup(id);
  };

  const disarmPopup = () => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    hidePopupTimer.current = setTimeout(() => setActivePopup(null), 300);
  };

  const toggleReaction = (type) => {
    setReactions((prev) => ({
      ...prev,
      [post.id]: prev[post.id] === type ? null : type,
    }));
    setActivePopup(null);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        // ✅ FIX: Kiểm tra ref.current có tồn tại không trước khi gọi scrollHeight
        if (commentListRef.current) {
          commentListRef.current.scrollTop =
            commentListRef.current.scrollHeight;
        }
      }, 100);

      // ✅ Optional: Clear timeout khi component unmount hoặc dependency thay đổi để an toàn hơn
      return () => clearTimeout(timer);
    }
  }, [list.length, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div
        className="comment-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="comment-modal-header">
          <h3>Bài viết của {post.author}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="comment-modal-body" ref={commentListRef}>
          {/* ✅ Sử dụng lại cấu trúc từ PostCard */}
          <div className="modal-post-content">
            {/* Header */}
            <div className="post-header">
              <img
                src={resolveAvatar(post.avatar)}
                alt="avatar"
                className="post-avatar"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <div className="post-info">
                <strong>{post.author}</strong>
                <span>{getTimeAgo(post.time)}</span>
              </div>
            </div>

            {/* Nội dung */}
            {(() => {
              let content = post.content;
              try {
                if (typeof content === "string" && content.startsWith("{")) {
                  content = JSON.parse(content);
                }
              } catch (err) {
                console.warn("Lỗi parse JSON:", err);
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
                      <strong>📈 Yếu tố ảnh hưởng:</strong>{" "}
                      {content.factors || "—"}
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
                      <strong>💉 Thuốc đang dùng:</strong>{" "}
                      {content.medication || "—"}
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

            {/* Hình ảnh/Video */}
            {post.images && post.images.length > 0 && (
              <div
                className={`post-images ${
                  post.images.length > 1 ? "multiple" : ""
                }`}
              >
                {post.images.slice(0, 4).map((m, idx) => (
                  <div key={idx} className="image-wrapper">
                    {idx === 3 && post.images.length > 4 && (
                      <div className="overlay-more">
                        +{post.images.length - 4}
                      </div>
                    )}
                    {m.type?.startsWith("video") ? (
                      <video src={m.url} controls />
                    ) : (
                      <img src={m.url} alt={`post-${idx}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ✅ Thống kê (giống PostCard) */}
            <div className="post-stats">
              {totalReactions > 0 && (
                <div className="reaction-summary">
                  <div className="reaction-icons">
                    {reactionSummary.like > 0 && <span>👍</span>}
                    {reactionSummary.love > 0 && <span>❤️</span>}
                    {reactionSummary.haha > 0 && <span>😂</span>}
                    {reactionSummary.wow > 0 && <span>😮</span>}
                    {reactionSummary.sad > 0 && <span>😢</span>}
                    {reactionSummary.angry > 0 && <span>😠</span>}
                  </div>
                  <span className="reaction-count">{totalReactions}</span>
                </div>
              )}
              <span className="comment-count">{list.length} bình luận</span>
            </div>

            {/* ✅ Actions (giống PostCard) */}
            <div className="post-buttons">
              <div
                className="post-action-group"
                onMouseEnter={() => armPopup(`modal-${post.id}`)} // ✅ Thêm sự kiện
                onMouseLeave={disarmPopup} // ✅ Thêm sự kiện
              >
                <button
                  className={`post-like-btn ${myReaction ? "active" : ""}`}
                  onClick={() =>
                    toggleReaction(myReaction ? myReaction : "like")
                  }
                >
                  {/* ✅ Logic hiển thị Icon: Nếu đã like thì hiện icon màu, chưa thì hiện mặc định */}
                  {myReaction ? (
                    <>
                      {/* Tìm icon trong emojiList dựa trên myReaction (string 'like', 'love'...) */}
                      <span>
                        {emojiList.find((e) => e.type === myReaction)?.icon}
                      </span>
                      <span>
                        {emojiList.find((e) => e.type === myReaction)?.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>👍</span>
                      <span>Thích</span>
                    </>
                  )}
                </button>

                {/* Popup Cảm xúc */}
                {activePopup === `modal-${post.id}` && (
                  <div
                    className="reaction-popup"
                    onMouseEnter={() => armPopup(`modal-${post.id}`)} // ✅ Giữ popup mở
                    onMouseLeave={disarmPopup}
                  >
                    {emojiList.map((e) => (
                      <span
                        key={e.type}
                        className="reaction-icon"
                        title={e.label}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          toggleReaction(e.type);
                        }}
                      >
                        {e.icon}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="post-action-group">
                <button>💬 Bình luận</button>
              </div>

              <div className="post-action-group">
                <button onClick={() => onShareClick(post)}>🔗 Chia sẻ</button>
              </div>
            </div>
          </div>

          {/* Danh sách bình luận */}
          <div className="modal-comment-list">
            {list.length > 0 ? (
              list.map((c, index) => (
                <CommentItem
                  key={`modal-comment-${c.id}-${index}`} // ✅ Thêm prefix unique
                  c={c}
                  level={0}
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
              ))
            ) : (
              <p className="no-comments">
                Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
              </p>
            )}
          </div>
        </div>

        {/* Footer - Input bình luận */}
        <div className="comment-modal-footer">
          <img
            src={resolveAvatar(currentUser?.avatar)}
            alt="avatar"
            className="comment-user-avatar"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
          <CommentInput
            placeholder="Viết bình luận..."
            value={commentDraft}
            onChange={setCommentDraft}
            onSubmit={onSubmitComment}
          />
        </div>
      </div>
    </div>
  );
};

export default CommentModal;

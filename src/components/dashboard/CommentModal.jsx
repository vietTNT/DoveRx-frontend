import React, { useRef, useEffect, useState } from "react";
import "../../styles/CommentModal.css";
import { CommentItem, CommentInput } from "./PostCard";

// Fallback chung
const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

// Helper: chuẩn hoá avatar
const resolveAvatar = (avatar) => {
  if (!avatar) return DEFAULT_AVATAR;
  if (typeof avatar === "object") {
    if (avatar.url) {
      const url = avatar.url;
      if (url.startsWith("/")) {
        const base = process.env.REACT_APP_API_BASE || "";
        return base.replace(/\/$/, "") + url;
      }
      return url;
    }
    try {
      return URL.createObjectURL(avatar);
    } catch {
      return DEFAULT_AVATAR;
    }
  }
  if (typeof avatar === "string") {
    if (avatar === "null" || avatar === "undefined" || avatar.trim() === "")
      return DEFAULT_AVATAR;
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
  onTogglePostReaction,
  onSetPostReaction,
}) => {
  const commentListRef = useRef(null);
  const hidePopupTimer = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 350;

  const list = comments[post.id]?.list || [];
  const myReaction = reactions[post.id];

  // Thông tin tác giả
  const authorName = post.author?.name || post.author || "Người dùng";
  const authorAvatar = post.author?.avatar || post.avatar;

  // TÍNH TOÁN ICON REACTION ĐỂ HIỂN THỊ ĐÚNG
  const counts = post.reaction_counts || {};
  const totalReactions = Object.values(counts).reduce(
    (sum, c) => sum + (Number(c) || 0),
    0
  );

  // Lọc ra những loại reaction có số lượng > 0 để hiển thị icon (VD: Like, Love)
  const activeReactionTypes = Object.keys(counts).filter(
    (type) => counts[type] > 0
  );

  const armPopup = (id) => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    setActivePopup(id);
  };
  const disarmPopup = () => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    hidePopupTimer.current = setTimeout(() => setActivePopup(null), 300);
  };

  const handleToggleReaction = () => {
    if (onTogglePostReaction) onTogglePostReaction();
    else
      setReactions((prev) => ({
        ...prev,
        [post.id]: prev[post.id] ? null : "like",
      }));
    setActivePopup(null);
  };

  const handleSelectReaction = (type) => {
    if (onSetPostReaction) onSetPostReaction(type);
    else setReactions((prev) => ({ ...prev, [post.id]: type }));
    setActivePopup(null);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (commentListRef.current)
          commentListRef.current.scrollTop =
            commentListRef.current.scrollHeight;
      }, 100);
      return () => clearTimeout(timer);
    } else setIsExpanded(false);
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
          <h3>Bài viết của {authorName}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="comment-modal-body" ref={commentListRef}>
          <div className="modal-post-content">
            <div className="post-header">
              <img
                src={resolveAvatar(authorAvatar)}
                alt="avatar"
                className="post-avatar"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <div className="post-info">
                <strong>{authorName}</strong>
                <span>{getTimeAgo(post.time)}</span>
              </div>
            </div>

            {/* Post Content */}
            {(() => {
              let content = post.content;
              try {
                if (typeof content === "string" && content.startsWith("{"))
                  content = JSON.parse(content);
              } catch (err) {
                console.warn("Error parsing JSON:", err);
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
                  </div>
                );
              } else {
                const text = content || "";
                const isLongText = text.length > CHAR_LIMIT;
                return (
                  <div className="post-content-wrapper">
                    <p className="post-content">
                      {isLongText && !isExpanded
                        ? `${text.substring(0, CHAR_LIMIT)}...`
                        : text}
                      {isLongText && !isExpanded && (
                        <span
                          className="see-more-btn"
                          onClick={() => setIsExpanded(true)}
                        >
                          Xem thêm
                        </span>
                      )}
                    </p>
                    {isLongText && isExpanded && (
                      <span
                        className="see-less-btn"
                        onClick={() => setIsExpanded(false)}
                      >
                        Thu gọn
                      </span>
                    )}
                  </div>
                );
              }
            })()}

            {/* Media */}
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
                    {m.type?.startsWith("video") ||
                    (m.url && m.url.includes("/video/")) ? (
                      <video src={m.url} controls className="post-media" />
                    ) : (
                      <img
                        src={m.url}
                        alt={`post-${idx}`}
                        className="post-media"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="post-stats">
              <div className="reaction-summary">
                {totalReactions > 0 && (
                  <div
                    className="reaction-icons"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {activeReactionTypes.slice(0, 3).map((type) => (
                      <span key={type} title={type}>
                        {emojiList.find((e) => e.type === type)?.icon || "👍"}
                      </span>
                    ))}

                    {activeReactionTypes.length === 0 && <span>👍</span>}

                    <span style={{ marginLeft: "4px", color: "#65676b" }}>
                      {totalReactions}
                    </span>
                  </div>
                )}
              </div>
              <span className="comment-count">{list.length} bình luận</span>
            </div>

            <div className="post-buttons">
              <div
                className="post-action-group"
                onMouseEnter={() => armPopup(`modal-${post.id}`)}
                onMouseLeave={disarmPopup}
              >
                <button
                  className={`post-like-btn ${myReaction ? "active" : ""}`}
                  onClick={() => handleToggleReaction()}
                >
                  {myReaction ? (
                    <>
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
                {activePopup === `modal-${post.id}` && (
                  <div
                    className="reaction-popup"
                    onMouseEnter={() => armPopup(`modal-${post.id}`)}
                    onMouseLeave={disarmPopup}
                  >
                    {emojiList.map((e) => (
                      <span
                        key={e.type}
                        className="reaction-icon"
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          handleSelectReaction(e.type);
                        }}
                      >
                        {e.icon}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="post-action-group">
                <button onClick={() => onShareClick(post)}>🔗 Chia sẻ</button>
              </div>
            </div>
          </div>

          <div className="modal-comment-list">
            {list.length > 0 ? (
              list.map((c, index) => (
                <CommentItem
                  key={`modal-comment-${c.id}-${index}`}
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
                Chưa có bình luận nào. Hãy là người đầu tiên!
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
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
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};

export default CommentModal;

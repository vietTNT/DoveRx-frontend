import React, { useRef, useEffect, useState } from "react";
import "../../styles/CommentModal.css";
import ReactDOM from "react-dom";
import { CommentItem, CommentInput } from "./PostCard";
import { useTranslation } from "react-i18next";
import shareIcon from "../../assets/icons/share.png";
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
  const { t } = useTranslation();
  const commentListRef = useRef(null);
  const hidePopupTimer = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSharedExpanded, setIsSharedExpanded] = useState(false);
  const CHAR_LIMIT = 350;

  const list = comments[post.id]?.list || [];
  const myReaction = reactions[post.id];
  const myReactionEmoji = myReaction
    ? emojiList.find((e) => e.type === myReaction)
    : null;

  // KIỂM TRA QUYỀN TRẢ LỜI BÌNH LUẬN: Nếu bài viết là "medical" thì chỉ bác sĩ hoặc tác giả mới được bình luận
  const canComment =
    post?.kind !== "medical" ||
    currentUser?.role === "doctor" ||
    String(currentUser?.id) === String(post?.author?.id || post?.author);
  // Thông tin tác giả
  const authorName = post.author?.name || post.author || t("navbar.role_user");
  const authorAvatar = post.author?.avatar || post.avatar;

  // TÍNH TOÁN ICON REACTION ĐỂ HIỂN THỊ ĐÚNG
  const counts = post.reaction_counts || {};
  const totalReactions = Object.values(counts).reduce(
    (sum, c) => sum + (Number(c) || 0),
    0,
  );

  // Lọc ra những loại reaction có số lượng > 0 để hiển thị icon (VD: Like, Love)
  const activeReactionTypes = Object.keys(counts).filter(
    (type) => counts[type] > 0,
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
    else {
      // Fallback local nếu không có hàm từ cha
      const newType = myReaction ? null : "like";
      setReactions((prev) => {
        const copy = { ...prev };
        if (newType) copy[post.id] = newType;
        else delete copy[post.id];
        return copy;
      });
    }
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

  return ReactDOM.createPortal(
    <div className="comment-modal-overlay" onClick={onClose}>
      <div
        className="comment-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="comment-modal-header">
          <h3>{t("dashboard.post_of", { name: authorName })}</h3>
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
                      <strong>
                        {t("dashboard.medical_form.title_symptom")}
                      </strong>{" "}
                      {content.symptom || "—"}
                    </p>
                    <p>
                      <strong> {t("dashboard.medical_form.duration")}</strong>{" "}
                      {content.duration || "—"}
                    </p>
                    <p>
                      <strong> {t("dashboard.medical_form.severity")}</strong>{" "}
                      {content.severity || "—"}
                    </p>
                    <p>
                      <strong> {t("dashboard.medical_form.factors")}</strong>{" "}
                      {content.factors || "—"}
                    </p>
                    {(content.historyPersonal ||
                      content.historyFamily ||
                      content.medication) && (
                      <>
                        <hr
                          style={{ margin: "8px 0", borderColor: "#e0e0e0" }}
                        />
                        {content.historyPersonal && (
                          <p>
                            <strong>
                              {t("dashboard.medical_form.history_personal")}
                            </strong>{" "}
                            {content.historyPersonal}
                          </p>
                        )}
                        {content.historyFamily && (
                          <p>
                            <strong>
                              {t("dashboard.medical_form.history_family")}
                            </strong>{" "}
                            {content.historyFamily}
                          </p>
                        )}
                        {content.medication && (
                          <p>
                            <strong>
                              {t("dashboard.medical_form.medication")}
                            </strong>{" "}
                            {content.medication}
                          </p>
                        )}
                      </>
                    )}

                    {content.lifestyle && (
                      <>
                        <hr
                          style={{ margin: "8px 0", borderColor: "#e0e0e0" }}
                        />
                        <p>
                          <strong>
                            {t("dashboard.medical_form.lifestyle")}
                          </strong>{" "}
                          {content.lifestyle}
                        </p>
                      </>
                    )}
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
                          {t("dashboard.more_see")}
                        </span>
                      )}
                    </p>
                    {isLongText && isExpanded && (
                      <span
                        className="see-less-btn"
                        onClick={() => setIsExpanded(false)}
                      >
                        {t("dashboard.less_see")}
                      </span>
                    )}

                    {/* ================= BẮT ĐẦU: HIỂN THỊ KHUNG BÀI ĐƯỢC SHARE ================= */}
                    {post.kind === "share" && post.shared_post && (
                      <div
                        className="shared-post-box"
                        style={{
                          marginTop: "12px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          overflow: "hidden",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (post.shared_post.status !== "unavailable") {
                            window.dispatchEvent(
                              new CustomEvent("open_post_notification", {
                                detail: { postId: post.shared_post.id },
                              }),
                            );
                            onClose(); // Đóng modal hiện tại để nhảy tới bài gốc
                          }
                        }}
                      >
                        {post.shared_post.status === "unavailable" ? (
                          <div
                            style={{
                              padding: "20px",
                              background: "#f0f2f5",
                              textAlign: "center",
                              color: "#65676b",
                              fontStyle: "italic",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <i
                              className="fas fa-ban"
                              style={{ fontSize: "20px" }}
                            ></i>
                            <span>
                              {post.shared_post.message ||
                                t("post.content_unavailable")}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                padding: "10px",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                backgroundColor: "#f7f8fa",
                                borderBottom: "1px solid #eee",
                              }}
                            >
                              <img
                                src={resolveAvatar(
                                  post.shared_post.author?.avatar,
                                )}
                                alt="shared-avatar"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <strong
                                  style={{ fontSize: "14px", color: "#050505" }}
                                >
                                  {post.shared_post.author?.name ||
                                    t("navbar.role_user")}
                                </strong>
                                <span
                                  style={{ fontSize: "12px", color: "#65676b" }}
                                >
                                  {getTimeAgo(post.shared_post.time)}
                                </span>
                              </div>
                            </div>

                            <div style={{ padding: "10px" }}>
                              {(() => {
                                let spContent = post.shared_post.content;
                                let isMedical =
                                  post.shared_post.kind === "medical";

                                if (
                                  typeof spContent === "string" &&
                                  spContent.trim().startsWith("{")
                                ) {
                                  try {
                                    spContent = JSON.parse(spContent);
                                    isMedical = true;
                                  } catch (e) {}
                                }

                                if (
                                  isMedical &&
                                  typeof spContent === "object" &&
                                  spContent !== null
                                ) {
                                  return (
                                    <div
                                      className="post-content medical-post"
                                      style={{ padding: "10px" }}
                                    >
                                      <p style={{ marginBottom: "4px" }}>
                                        <strong>
                                          {t(
                                            "dashboard.medical_form.title_symptom",
                                          )}
                                          :
                                        </strong>{" "}
                                        {spContent.symptom || "—"}
                                      </p>
                                      <p style={{ marginBottom: "4px" }}>
                                        <strong>
                                          {t("dashboard.medical_form.severity")}
                                          :
                                        </strong>{" "}
                                        {spContent.severity || "—"}
                                      </p>

                                      {/* NÚT BẤM ĐỂ MỞ RỘNG INLINE */}
                                      {!isSharedExpanded ? (
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài
                                            setIsSharedExpanded(true);
                                          }}
                                          style={{
                                            color: "#2d88ff",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            display: "inline-block",
                                            marginTop: "4px",
                                          }}
                                          className="hover:underline"
                                        >
                                          {t("post.expand_medical_form")}
                                        </span>
                                      ) : (
                                        <div
                                          className="animate-fadeIn"
                                          style={{
                                            marginTop: "8px",
                                            paddingTop: "8px",
                                            borderTop: "1px dashed #e0e0e0",
                                          }}
                                        >
                                          <p style={{ marginBottom: "4px" }}>
                                            <strong>
                                              {t(
                                                "dashboard.medical_form.duration",
                                              )}
                                              :
                                            </strong>{" "}
                                            {spContent.duration || "—"}
                                          </p>
                                          {spContent.factors && (
                                            <p style={{ marginBottom: "4px" }}>
                                              <strong>
                                                {" "}
                                                {t(
                                                  "dashboard.medical_form.factors",
                                                )}
                                                :
                                              </strong>{" "}
                                              {spContent.factors}
                                            </p>
                                          )}
                                          {(spContent.historyPersonal ||
                                            spContent.historyFamily) && (
                                            <div
                                              className="medical-divider"
                                              style={{ margin: "8px 0" }}
                                            >
                                              {spContent.historyPersonal && (
                                                <p
                                                  style={{
                                                    marginBottom: "4px",
                                                  }}
                                                >
                                                  <strong>
                                                    {t(
                                                      "dashboard.medical_form.history_personal",
                                                    )}
                                                    :
                                                  </strong>{" "}
                                                  {spContent.historyPersonal}
                                                </p>
                                              )}
                                              {spContent.historyFamily && (
                                                <p
                                                  style={{
                                                    marginBottom: "4px",
                                                  }}
                                                >
                                                  <strong>
                                                    {t(
                                                      "dashboard.medical_form.history_family",
                                                    )}
                                                    :
                                                  </strong>{" "}
                                                  {spContent.historyFamily}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                          {(spContent.medication ||
                                            spContent.lifestyle) && (
                                            <div
                                              className="medical-divider"
                                              style={{ margin: "8px 0" }}
                                            >
                                              {spContent.medication && (
                                                <p
                                                  style={{
                                                    marginBottom: "4px",
                                                  }}
                                                >
                                                  <strong>
                                                    {t(
                                                      "dashboard.medical_form.medication",
                                                    )}
                                                    :
                                                  </strong>{" "}
                                                  {spContent.medication}
                                                </p>
                                              )}
                                              {spContent.lifestyle && (
                                                <p
                                                  style={{
                                                    marginBottom: "4px",
                                                  }}
                                                >
                                                  <strong>
                                                    {t(
                                                      "dashboard.medical_form.lifestyle",
                                                    )}
                                                    :
                                                  </strong>{" "}
                                                  {spContent.lifestyle}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài
                                              setIsSharedExpanded(false);
                                            }}
                                            style={{
                                              color: "#65676b",
                                              fontSize: "13px",
                                              fontWeight: "600",
                                              cursor: "pointer",
                                              display: "inline-block",
                                              marginTop: "8px",
                                            }}
                                            className="hover:underline"
                                          >
                                            {t("post.collapse")}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <p
                                    style={{
                                      fontSize: "14px",
                                      color: "#050505",
                                      margin: 0,
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {typeof spContent === "string"
                                      ? spContent
                                      : ""}
                                  </p>
                                );
                              })()}
                            </div>

                            {post.shared_post.images &&
                              post.shared_post.images.length > 0 && (
                                <div
                                  style={{
                                    width: "100%",
                                    borderTop: "1px solid #eee",
                                    backgroundColor: "#000",
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  {post.shared_post.images[0].type ===
                                  "video" ? (
                                    <video
                                      src={post.shared_post.images[0].url}
                                      controls
                                      style={{
                                        width: "100%",
                                        maxHeight: "300px",
                                        objectFit: "contain",
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={post.shared_post.images[0].url}
                                      alt="shared-media"
                                      style={{
                                        width: "100%",
                                        height: "auto",
                                        maxHeight: "300px",
                                        objectFit: "contain",
                                        display: "block",
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    )}

                    {post.kind === "share" && !post.shared_post && (
                      <div
                        style={{
                          padding: "15px",
                          background: "#f0f2f5",
                          borderRadius: "8px",
                          marginTop: "10px",
                          textAlign: "center",
                          color: "#65676b",
                          fontStyle: "italic",
                        }}
                      >
                        {t("post.post_unavailable")}
                      </div>
                    )}
                    {/* ================= KẾT THÚC: HIỂN THỊ KHUNG BÀI ĐƯỢC SHARE ================= */}
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
              <span className="comment-count">
                {list.length} {t("dashboard.comment_count")}
              </span>
            </div>

            <div className="post-buttons">
              <div
                className="post-action-group"
                onMouseEnter={() => armPopup(`modal-${post.id}`)}
                onMouseLeave={disarmPopup}
                onClick={(e) => {
                  if (
                    window.innerWidth <= 480 &&
                    activePopup !== `modal-${post.id}`
                  ) {
                    e.preventDefault();
                    setActivePopup(`modal-${post.id}`);
                  } else {
                    handleToggleReaction();
                  }
                }}
              >
                <button
                  className={`post-like-btn ${myReaction ? "active" : ""}`}
                  onClick={() => handleToggleReaction()}
                >
                  {myReaction ? (
                    <>
                      <span>{myReactionEmoji?.icon}</span>
                      <span>{myReactionEmoji?.label}</span>
                    </>
                  ) : (
                    <>
                      <span>👍</span>
                      <span>{t("dashboard.like")}</span>
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
                        onTouchStart={(ev) => {
                          // Mobile
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
                <button onClick={() => onShareClick(post)}>
                  <img
                    src={shareIcon}
                    alt="Share"
                    className="post-action-icon"
                  />{" "}
                  {t("dashboard.share")}
                </button>
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
                  canComment={canComment}
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
              <p className="no-comments">{t("dashboard.no_comments_yet")}</p>
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
          {canComment ? (
            <CommentInput
              placeholder={t("dashboard.write_comment")}
              value={commentDraft}
              onChange={setCommentDraft}
              onSubmit={onSubmitComment}
              autoFocus
            />
          ) : (
            <div
              style={{
                flex: 1,
                padding: "10px 15px",
                backgroundColor: "#f0f2f5",
                borderRadius: "20px",
                color: "#65676b",
                fontSize: "13px",
                margin: "0",
              }}
            >
              {t("post.only_doctor_comment")}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommentModal;

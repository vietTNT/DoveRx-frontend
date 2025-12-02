import React, { useState, useRef, useEffect } from "react";
import ShareModal from "./ShareModal";
import CommentModal from "./CommentModal";
import "../../styles/PostCard.css";
import { toast } from "react-toastify";
import { resolveImageUrl } from "../../utils/imageHelper";
import {
  reactPost,
  sharePost,
  listComments,
  addComment,
  editComment as apiEditComment,
  deleteComment as apiDeleteComment,
  reactComment,
  deletePost,
  updatePost,
} from "../../services/socialApi";
import websocketService from "../../services/websocket";
import ReactionListModal from "./ReactionListModal";
import { useTranslation } from "react-i18next";
import commentIcon from "../../assets/icons/comment.png";
import shareIcon from "../../assets/icons/share.png";
// HELPER FUNCTION
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
}) => {
  const { t } = useTranslation();
  return (
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
      <button onClick={onSubmit}>{t("chat.send")}</button>
    </div>
  );
};

/* ---------- Comment Item ---------- */
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
  const { t } = useTranslation();
  const hidePopupTimer = useRef(null);

  const armCommentPopup = (id) => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    hidePopupTimer.current = setTimeout(() => {
      setActiveCommentPopup(id);
    }, 500);
  };

  const disarmCommentPopup = () => {
    if (hidePopupTimer.current) clearTimeout(hidePopupTimer.current);
    hidePopupTimer.current = setTimeout(() => setActiveCommentPopup(null), 300);
  };
  const timeData = c.time || c.created_at || c.createdAt;
  // Check quyền owner: so sánh userId của comment với currentUser.id
  const isOwner =
    currentUser?.id &&
    (String(currentUser.id) === String(c.userId) ||
      String(currentUser.id) === String(c.user_id) ||
      String(currentUser.id) === String(c.author_id));
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
              placeholder={t("dashboard.edit_comment")}
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
            // hỗ trợ mobile
            // onTouchStart={() => armCommentPopup(`c-${c.id}`)}
            // onTouchEnd={disarmCommentPopup}
            onClick={(e) => {
              if (
                window.innerWidth <= 481 &&
                activeCommentPopup !== `c-${c.id}`
              ) {
                e.preventDefault();
                setActiveCommentPopup(`c-${c.id}`);
              } else {
                toggleCommentLike(c.id);
              }
            }}
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
                  <i className="far fa-thumbs-up" /> {t("dashboard.like")}
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
                <i className="far fa-comment-dots" /> {t("dashboard.comment")}
              </span>
            </>
          )}

          <span> · </span>
          <span className="comment-time">
            {timeData ? getTimeAgo(timeData) : t("time.just_now")}
          </span>

          {c.likes > 0 && (
            <span className="reaction-count" style={{ marginLeft: 8 }}>
              {c.reaction?.icon || "👍"} {c.likes}
            </span>
          )}

          {/* NÚT SỬA / XÓA */}
          {isOwner && !c.editing && (
            <>
              <span> · </span>
              <span
                className="comment-edit"
                onClick={() => startEdit(c.id, c.text)}
              >
                <i className="far fa-edit" /> {t("common.edit")}
              </span>
              <span> · </span>
              <span
                className="comment-delete"
                onClick={() => deleteComment(c.id)}
              >
                <i className="far fa-trash-alt" /> {t("common.delete")}
              </span>
            </>
          )}
        </div>

        {/* Input trả lời với tag tên người dùng */}
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

        {/* Hiển thị replies với nút "Xem thêm" */}
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
  onDeletePost,
  onUpdatePost,
  lightbox,
}) => {
  const { t } = useTranslation();
  // State & Refs
  const MAX_REPLIES_VISIBLE = 2;
  const MAX_NEST_LEVEL = 2;
  const CHAR_LIMIT = 350;
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [drafts, setDrafts] = useState({ reply: {}, edit: {} });
  const [activeCommentPopup, setActiveCommentPopup] = useState(null);
  const [activePostPopup, setActivePostPopup] = useState(null);
  const postPopupTimer = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const menuRef = useRef(null);
  const [showReactionList, setShowReactionList] = useState(false);
  const isAuthor =
    currentUser?.id &&
    (String(currentUser.id) === String(p.author?.id) ||
      p.isOptimistic === true);

  const myReactionType = reactions[p.id];
  const myReactionEmoji = myReactionType
    ? emojiList.find((e) => e.type === myReactionType)
    : null;

  // Effects
  useEffect(() => {
    // Chỉ set reaction nếu trong state chưa có, nhưng API lại trả về có
    // VÀ chỉ set 1 lần khi post load lần đầu (mount)
    const apiReaction = p.user_reaction || p.my_reaction || p.current_reaction;

    // Kiểm tra nếu state global chưa có reaction cho bài này
    if (apiReaction && reactions[p.id] === undefined) {
      setReactions((prev) => ({ ...prev, [p.id]: apiReaction }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  useEffect(() => {
    if (!comments[p.id]?.list) {
      listComments(p.id)
        .then((data) => {
          setComments((prev) => ({
            ...prev,
            [p.id]: { list: data, draft: "", open: true, limit: 3 },
          }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers Post
  const handleDeleteClick = async () => {
    if (window.confirm(t("dashboard.delete_post_confirm"))) {
      try {
        await deletePost(p.id);
        if (onDeletePost) onDeletePost(p.id);
        toast.success(t("dashboard.delete_success"));
      } catch (error) {
        toast.error(t("dashboard.delete_error"));
      }
    }
  };
  const handleEditClick = () => {
    const currentText = typeof p.content === "string" ? p.content : "";
    setEditContent(currentText);
    setIsEditing(true);
    setShowMenu(false);
  };
  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      const updatedData = await updatePost(p.id, editContent);
      setIsEditing(false);
      if (onUpdatePost) onUpdatePost(updatedData);
      toast.success(t("dashboard.update_success"));
    } catch (error) {
      toast.error(t("dashboard.update_error"));
    }
  };

  // Handlers Comments & Reactions
  const getReplyDraft = (id) => drafts.reply[id] || "";
  const setReplyDraft = (id, value) =>
    setDrafts((prev) => ({ ...prev, reply: { ...prev.reply, [id]: value } }));
  const getEditDraft = (id) => drafts.edit[id] || "";
  const setEditDraft = (id, value) =>
    setDrafts((prev) => ({ ...prev, edit: { ...prev.edit, [id]: value } }));
  const mutateComments = (fn) =>
    setComments((prev) => {
      const ps = prev[p.id] || { list: [], draft: "", open: true, limit: 3 };
      return { ...prev, [p.id]: { ...ps, list: fn(ps.list || []) } };
    });
  const updateNode = (l, id, up) =>
    l.map((n) =>
      n.id === id
        ? up(n)
        : {
            ...n,
            replies: n.replies ? updateNode(n.replies, id, up) : n.replies,
          }
    );
  const removeNode = (l, id) =>
    l
      .filter((n) => n.id !== id)
      .map((n) => ({
        ...n,
        replies: n.replies ? removeNode(n.replies, id) : n.replies,
      }));

  const toggleCommentLike = (cid) => {
    let had = false;
    setComments((prev) => {
      const ps = prev[p.id];
      const list = updateNode(ps.list, cid, (c) => {
        had = !!c.reaction;
        return had
          ? { ...c, reaction: null, likes: (c.likes || 1) - 1 }
          : {
              ...c,
              reaction: { type: "like", icon: "👍", label: "Thích" },
              likes: (c.likes || 0) + 1,
            };
      });
      return { ...prev, [p.id]: { ...ps, list } };
    });
    reactComment(cid, had ? null : "like").catch(() => {});
  };
  const setCommentReaction = (cid, type) => {
    const emoji = emojiList.find((e) => e.type === type);
    setComments((prev) => {
      const ps = prev[p.id];
      const list = updateNode(ps.list, cid, (c) => ({
        ...c,
        reaction: emoji,
        likes: Math.max(1, c.likes || 1),
      }));
      return { ...prev, [p.id]: { ...ps, list } };
    });
    reactComment(cid, type).catch(() => {});
  };
  const toggleReplyBox = (cid) =>
    mutateComments((l) =>
      updateNode(l, cid, (c) => ({ ...c, replyOpen: !c.replyOpen }))
    );
  const submitReply = (cid, mention) => {
    const t = (getReplyDraft(cid) || "").trim();
    if (!t) return;
    const ft = t.startsWith(`@${mention}`) ? t : `@${mention} ${t}`;
    setReplyDraft(cid, "");
    addComment({
      postId: p.id,
      text: ft,
      parentId: cid,
      mentionedUser: mention,
    })
      .then(() => {
        setComments((prev) => {
          const ps = prev[p.id];
          const list = updateNode(ps.list, cid, (n) => ({
            ...n,
            replyOpen: false,
          }));
          return { ...prev, [p.id]: { ...ps, list } };
        });
      })
      .catch(() => {});
  };
  const startEdit = (cid, t) => {
    setEditDraft(cid, t || "");
    mutateComments((l) => updateNode(l, cid, (c) => ({ ...c, editing: true })));
  };
  const saveEdit = (cid) => {
    const t = (getEditDraft(cid) || "").trim();
    setEditDraft(cid, "");
    apiEditComment(cid, t).catch(() => {});
    setComments((prev) => {
      const ps = prev[p.id];
      const list = updateNode(ps.list, cid, (c) => ({
        ...c,
        text: t,
        editing: false,
      }));
      return { ...prev, [p.id]: { ...ps, list } };
    });
  };
  const deleteComment = async (cid) => {
    const curId = getCurrentUserId();
    const find = (l, id) => {
      for (const n of l) {
        if (n.id === id) return n;
        if (n.replies) {
          const f = find(n.replies, id);
          if (f) return f;
        }
      }
      return null;
    };
    const ps = comments[p.id];
    if (!ps?.list) return;
    const c = find(ps.list, cid);
    if (!c) return;
    const ownerId = c.author_id || c.user_id || c.userId;
    if (String(ownerId) !== String(curId)) {
      toast.error("❌ Không có quyền xóa");
      return;
    }
    if (!window.confirm(t("dashboard.delete_comment_confirm"))) return;
    try {
      await apiDeleteComment(cid);
      setComments((prev) => ({
        ...prev,
        [p.id]: { ...ps, list: removeNode(ps.list, cid) },
      }));
      toast.success(t("dashboard.comment_deleted"));
    } catch {
      toast.error(t("dashboard.error_comment_delete"));
    }
  };

  const armPostPopup = (id) => {
    if (postPopupTimer.current) clearTimeout(postPopupTimer.current);
    postPopupTimer.current = setTimeout(() => {
      setActivePostPopup(id);
    }, 500);
  };
  const disarmPostPopup = () => {
    if (postPopupTimer.current) clearTimeout(postPopupTimer.current);
    postPopupTimer.current = setTimeout(() => setActivePostPopup(null), 300);
  };
  const setPostReaction = (type) => {
    websocketService.send("post_react", { post_id: p.id, reaction_type: type });
    setReactions((prev) => ({ ...prev, [p.id]: type }));
    reactPost(p.id, type).catch(() => {});
    setActivePostPopup(null);
  };
  const togglePostReaction = () => {
    const cur = reactions[p.id];
    const type = cur ? null : "like";
    websocketService.send("post_react", { post_id: p.id, reaction_type: type });
    if (type) setReactions((prev) => ({ ...prev, [p.id]: type }));
    else
      setReactions((prev) => {
        const c = { ...prev };
        delete c[p.id];
        return c;
      });
    reactPost(p.id, type).catch(() => {});
  };
  const countAllComments = (l) =>
    l.reduce((a, c) => a + 1 + countAllComments(c.replies), 0);
  const list = comments[p.id]?.list || [];

  return (
    <div
      className={`post-card ${p.isOptimistic ? "optimistic" : ""}`}
      id={`post-${p.id}`}
    >
      <div className="post-header">
        <img
          src={resolveImageUrl(p.author?.avatar)}
          alt="avatar"
          className="post-avatar"
        />
        <div className="post-info">
          <strong>{p.author?.name || "Người dùng"}</strong>
          <span>{getTimeAgo(p.time)}</span>
        </div>

        {isAuthor && (
          <div
            className="post-options"
            ref={menuRef}
            style={{ position: "relative" }}
          >
            <button
              className="options-btn"
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "0 10px",
                color: "#65676b",
              }}
            >
              <i className="fas fa-ellipsis-h"></i>
            </button>
            {showMenu && (
              <div
                className="options-dropdown"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  background: "white",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  zIndex: 10,
                  minWidth: "150px",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={handleEditClick}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <i className="fas fa-edit" style={{ marginRight: "8px" }}></i>{" "}
                  {t("common.edit")}
                </button>
                <button
                  onClick={handleDeleteClick}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "red",
                  }}
                >
                  <i
                    className="fas fa-trash-alt"
                    style={{ marginRight: "8px" }}
                  ></i>{" "}
                  {t("common.delete")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="post-edit-mode" style={{ padding: "10px" }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              resize: "vertical",
            }}
          />
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: "5px 15px",
                borderRadius: "5px",
                border: "none",
                background: "#ccc",
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: "5px 15px",
                borderRadius: "5px",
                border: "none",
                background: "#1877f2",
                color: "white",
                cursor: "pointer",
              }}
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      ) : (
        (() => {
          let content = p.content;
          try {
            if (typeof content === "string" && content.startsWith("{"))
              content = JSON.parse(content);
          } catch (err) {
            console.warn(err);
          }
          if (typeof content === "object") {
            return (
              <div className="post-content medical-post">
                {/* 1. Triệu chứng & Tình trạng */}
                <p>
                  <strong>{t("dashboard.medical_form.title_symptom")}:</strong>{" "}
                  {content.symptom || "—"}
                </p>
                <p>
                  <strong>{t("dashboard.medical_form.duration")}:</strong>{" "}
                  {content.duration || "—"}
                </p>
                <p>
                  <strong>{t("dashboard.medical_form.severity")}:</strong>{" "}
                  {content.severity || "—"}
                </p>

                {/* 2. Các yếu tố liên quan (nếu có) */}
                {content.factors && (
                  <p>
                    <strong> {t("dashboard.medical_form.factors")}:</strong>{" "}
                    {content.factors}
                  </p>
                )}

                {/* 3. Tiền sử bệnh */}
                {(content.historyPersonal || content.historyFamily) && (
                  <div className="medical-divider">
                    {content.historyPersonal && (
                      <p>
                        <strong>
                          {t("dashboard.medical_form.history_personal")}:
                        </strong>{" "}
                        {content.historyPersonal}
                      </p>
                    )}
                    {content.historyFamily && (
                      <p>
                        <strong>
                          {t("dashboard.medical_form.history_family")}:
                        </strong>{" "}
                        {content.historyFamily}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Thuốc & Lối sống (ngăn cách bằng nét đứt) */}
                {(content.medication || content.lifestyle) && (
                  <div className="medical-divider">
                    {content.medication && (
                      <p>
                        <strong>
                          {t("dashboard.medical_form.medication")}:
                        </strong>{" "}
                        {content.medication}
                      </p>
                    )}
                    {content.lifestyle && (
                      <p>
                        <strong>
                          {t("dashboard.medical_form.lifestyle")}:
                        </strong>{" "}
                        {content.lifestyle}
                      </p>
                    )}
                  </div>
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
                      {" "}
                      {t("dashboard.more_see")}
                    </span>
                  )}
                </p>
                {isLongText && isExpanded && (
                  <span
                    className="see-less-btn"
                    onClick={() => setIsExpanded(false)}
                  >
                    {" "}
                    {t("dashboard.less_see")}
                  </span>
                )}
              </div>
            );
          }
        })()
      )}

      {p.images && p.images.length > 0 && (
        <div className="post-image-container">
          <div
            className={`post-images ${p.images.length > 1 ? "multiple" : ""}`}
            data-count={p.images.length}
          >
            {p.images.slice(0, 4).map((m, idx) => {
              const isVideo =
                m.type?.startsWith("video") ||
                (m.url &&
                  (m.url.includes("/video/") || m.url.endsWith(".mp4")));
              return (
                <div
                  key={idx}
                  className="image-wrapper"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(p.images, idx);
                  }}
                >
                  {idx === 3 && p.images.length > 4 && (
                    <div className="overlay-more">+{p.images.length - 4}</div>
                  )}
                  {(!lightbox?.open || lightbox.index !== idx) && isVideo ? (
                    <video
                      src={resolveImageUrl(m.url)}
                      className="post-media"
                      controls
                      preload="metadata"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : !isVideo ? (
                    <img
                      src={resolveImageUrl(m.url)}
                      alt={`post-${p.id}-${idx}`}
                      className="post-media"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions & Modal (Giữ nguyên) */}
      <div className="post-actions">
        <div className="post-stats">
          {Object.keys(p.reaction_counts || {}).length > 0 && (
            <span
              className="reaction-count"
              onClick={() => setShowReactionList(true)}
              style={{ cursor: "pointer" }}
            >
              {Object.entries(p.reaction_counts).map(([t, c]) => (
                <span key={t}>
                  {emojiList.find((e) => e.type === t)?.icon || "👍"} {c}
                </span>
              ))}
            </span>
          )}
          {countAllComments(list) > 0 && (
            <span className="comment-share-count">
              {countAllComments(list)} {t("dashboard.comment_count")}
            </span>
          )}
        </div>
        <div className="post-buttons">
          <div
            className="post-action-group"
            onMouseEnter={() => armPostPopup(`p-${p.id}`)}
            onMouseLeave={disarmPostPopup}
            // hỗ trợ mobile
            onClick={(e) => {}}
            onTouchStart={() => {
              postPopupTimer.current = setTimeout(() => {
                setActivePostPopup(`p-${p.id}`);
              }, 500); // Giữ 0.5s để hiện popup
            }}
            onTouchEnd={() => {
              if (postPopupTimer.current) clearTimeout(postPopupTimer.current);
            }}
            // onTouchStart={() => armPostPopup(`p-${p.id}`)}
            // onTouchEnd={disarmPostPopup}
          >
            <button
              className={`post-like-btn ${myReactionType ? "active" : ""}`}
              onClick={togglePostReaction}
            >
              {myReactionEmoji?.icon || "👍"}{" "}
              {myReactionEmoji?.label || t("dashboard.like")}
            </button>
            {activePostPopup === `p-${p.id}` && (
              <div
                className="reaction-popup"
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
          <div className="post-action-group">
            <button onClick={() => setCommentModalOpen(true)}>
              <img
                src={commentIcon}
                alt="Comment"
                className="post-action-icon"
              />{" "}
              {t("dashboard.comment")}
            </button>
          </div>
          <div className="post-action-group">
            <button onClick={() => setShareOpen(true)}>
              <img src={shareIcon} alt="Share" className="post-action-icon" />{" "}
              {t("dashboard.share")}
            </button>
            {shareOpen && (
              <ShareModal
                onClose={() => setShareOpen(false)}
                user={currentUser}
                friends={[]}
                onShare={async (msg) => {
                  try {
                    await sharePost(p.id, msg || "");
                    toast.success("Đã chia sẻ");
                  } catch {
                    toast.error("Chia sẻ thất bại");
                  }
                  setShareOpen(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
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
            await addComment({ postId: p.id, text });
            setComments((prev) => ({
              ...prev,
              [p.id]: { ...prev[p.id], draft: "" },
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
          setShareOpen(true);
        }}
        onTogglePostReaction={togglePostReaction}
        onSetPostReaction={setPostReaction}
      />
      <ReactionListModal
        isOpen={showReactionList}
        onClose={() => setShowReactionList(false)}
        postId={p.id}
        emojiList={emojiList}
      />
    </div>
  );
};

export default PostCard;

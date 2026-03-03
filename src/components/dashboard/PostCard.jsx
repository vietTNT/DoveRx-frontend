import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShareModal from "./ShareModal";
import CommentModal from "./CommentModal";
import "../../styles/PostCard.css";
import { toast } from "react-toastify";
import { resolveImageUrl } from "../../utils/imageHelper";
import {
  reactPost,
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
  canComment = true,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const isOwner =
    currentUser?.id &&
    (String(currentUser.id) === String(c.userId) ||
      String(currentUser.id) === String(c.user_id) ||
      String(currentUser.id) === String(c.author_id));

  const handleUserClick = (e) => {
    e.stopPropagation();
    const targetId = c.author_id || c.user_id || c.userId;
    if (targetId) {
      navigate(`/profile/${targetId}`);
    }
  };

  return (
    <div className="comment-item" style={{ marginLeft: level > 0 ? 36 : 0 }}>
      <img
        src={
          c.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        }
        alt="avatar"
        className="comment-avatar"
        onClick={handleUserClick}
        style={{ cursor: "pointer" }}
      />
      <div className="comment-content">
        <div className="comment-bubble">
          <strong
            className="comment-author"
            onClick={handleUserClick}
            style={{ cursor: "pointer" }}
          >
            {c.user}
          </strong>

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
                      ev.stopPropagation();
                      setCommentReaction(c.id, e.type);
                      setActiveCommentPopup(null);
                    }}
                    onTouchStart={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
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

          {level < MAX_NEST_LEVEL && canComment && (
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
            placeholder={t("dashboard.reply_to", { name: c.user })}
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
                c.showAllReplies ? c.replies.length : MAX_REPLIES_VISIBLE,
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
                    })),
                  )
                }
              >
                {t("dashboard.view_more_replies", {
                  count: c.replies.length - MAX_REPLIES_VISIBLE,
                })}
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
  reactions = {},
  setReactions = () => {},
  comments = {},
  setComments = () => {},
  emojiList = [],
  activePopup,
  setActivePopup,
  openLightbox,
  createNewComment,
  getTimeAgo,
  onDeletePost,
  onUpdatePost,
  onNewPost,
  lightbox,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const menuRef = useRef(null); // menu chỉnh sửa bài viết
  const visMenuRef = useRef(null); // menu chỉnh sửa quyền riêng tư
  const [showReactionList, setShowReactionList] = useState(false);
  // state chỉnh sửa quyền riêng tư bài viết
  const [showVisDropdown, setShowVisDropdown] = useState(false);
  const [currentVisibility, setCurrentVisibility] = useState(
    p.visibility || "public",
  );

  useEffect(() => {
    if (p.visibility) setCurrentVisibility(p.visibility);
  }, [p.visibility]);

  const isAuthor =
    currentUser?.id &&
    (String(currentUser.id) === String(p.author?.id) ||
      p.isOptimistic === true);

  const isAdmin = currentUser?.role === "admin";
  const canModify = isAuthor || isAdmin;

  const myReactionType = reactions[p.id];
  const myReactionEmoji = myReactionType
    ? emojiList.find((e) => e.type === myReactionType)
    : null;
  const canEditVisibility = isAuthor && p.kind !== "medical";

  //Thêm dependencies cho useEffect cập nhật reaction
  useEffect(() => {
    // Kiểm tra p và p.id trước khi xử lý
    if (!p || !p.id) {
      console.warn("[PostCard] Invalid post data:", p);
      return;
    }

    const apiReaction = p.user_reaction || p.my_reaction || p.current_reaction;

    // ✅ Đảm bảo reactions đã được khởi tạo
    if (apiReaction && (!reactions || reactions[p.id] === undefined)) {
      setReactions((prev) => ({ ...prev, [p.id]: apiReaction }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, p?.user_reaction, p?.my_reaction, p?.current_reaction]);

  // FIX: Thêm dependencies cho useEffect load comment
  useEffect(() => {
    //  Kiểm tra p và p.id
    if (!p || !p.id) return;

    if (!comments[p.id]?.list) {
      listComments(p.id)
        .then((data) => {
          setComments((prev) => ({
            ...prev,
            [p.id]: { list: data, draft: "", open: true, limit: 3 },
          }));
        })
        .catch((err) => {
          console.error("[PostCard] Failed to load comments:", err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Đóng menu ba chấm nếu click ra ngoài nó
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
      // Đóng menu quyền riêng tư nếu click ra ngoài nó
      if (visMenuRef.current && !visMenuRef.current.contains(e.target)) {
        setShowVisDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers Post ... (Giữ nguyên phần logic handler)
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
    let currentData = p.content;

    // Nếu backend trả về JSON dạng chuỗi, ta parse nó ra
    if (typeof currentData === "string" && currentData.startsWith("{")) {
      try {
        currentData = JSON.parse(currentData);
      } catch (err) {
        console.warn("Lỗi parse JSON khi edit:", err);
      }
    }
    setEditContent(currentData);
    setIsEditing(true);
    setShowMenu(false);
  };
  const handleSaveEdit = async () => {
    if (typeof editContent === "string" && !editContent.trim()) return;
    try {
      let payload = {};

      if (typeof editContent === "object") {
        payload = {
          content_medical: editContent,
          content: JSON.stringify(editContent),
        };
      } else {
        payload = { content: editContent };
      }

      const updatedData = await updatePost(p.id, payload);
      setIsEditing(false);
      // if (onUpdatePost) {
      //   onUpdatePost(updatedData);
      // }
      if (onUpdatePost) {
        onUpdatePost({
          ...p, // 1. Giữ lại toàn bộ thông tin cũ (avatar, author, like...)
          ...updatedData, // 2. Ghi đè những gì backend trả về (nếu có)
          content: payload.content, // 3. Ép hiển thị nội dung vừa gõ xong
          id: p.id, // 4. Tuyệt đối không để mất ID bài viết
        });
      }
      toast.success(t("dashboard.update_success"));
    } catch (error) {
      toast.error(t("dashboard.update_error"));
    }
  };
  const handleChangeVisibility = async (newVis) => {
    // 1. Lưu lại quyền riêng tư cũ phòng trường hợp backend lỗi thì hoàn tác
    const oldVis = currentVisibility;

    // 2. THAY ĐỔI GIAO DIỆN NGAY LẬP TỨC (Đóng menu và cập nhật icon)
    setCurrentVisibility(newVis);
    setShowVisDropdown(false);

    try {
      // Gọi API cập nhật bài viết (Gửi object chứa visibility)
      await updatePost(p.id, { visibility: newVis });
      toast.success(
        t("dashboard.update_success") || "Đã cập nhật quyền riêng tư!",
      );
    } catch (error) {
      // 3. Nếu backend báo lỗi, hoàn tác lại giao diện cũ và báo lỗi
      setCurrentVisibility(oldVis);
      toast.error(t("dashboard.update_error") || "Lỗi khi cập nhật!");
    }
  };

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
          },
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
              reaction: {
                type: "like",
                icon: "👍",
                label: t("reactions.like"),
              },
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
      updateNode(l, cid, (c) => ({ ...c, replyOpen: !c.replyOpen })),
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
      .catch((err) => {
        const errorMessage =
          err.response?.data?.error || t("error.reply_failed");
        toast.error(errorMessage);
      });
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
      toast.error(t("error.no_delete_permission"));
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
  const handleProfileNavigation = (userId, e) => {
    if (e) e.stopPropagation();
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

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
          onClick={(e) => handleProfileNavigation(p.author?.id, e)}
          style={{ cursor: "pointer" }}
        />

        <div
          className="post-info"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <strong
            onClick={(e) => handleProfileNavigation(p.author?.id, e)}
            style={{
              cursor: "pointer",
              color: "#050505",
              fontSize: "15px",
              lineHeight: "1.2",
            }}
            className="hover:underline"
          >
            {p.author?.name || t("navbar.role_user")}
          </strong>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#65676b",
              fontSize: "13px",
              marginTop: "2px",
            }}
          >
            <span>{getTimeAgo(p.time || p.created_at)}</span>
            <span style={{ fontSize: "10px" }}>•</span>

            {/* KHU VỰC NÚT QUYỀN RIÊNG TƯ MỚI  */}
            <div style={{ position: "relative" }} ref={visMenuRef}>
              <span
                onClick={() =>
                  canEditVisibility && setShowVisDropdown(!showVisDropdown)
                }
                title={
                  !canEditVisibility
                    ? currentVisibility === "private"
                      ? t("post.visibility_private")
                      : currentVisibility === "friends"
                        ? t("post.visibility_friends")
                        : t("post.visibility_public")
                    : t("post.edit_visibility")
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: canEditVisibility ? "pointer" : "default",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  backgroundColor: showVisDropdown ? "#e4e6eb" : "transparent",
                  transition: "background 0.2s",
                }}
                className={canEditVisibility ? "hover:bg-gray-200" : ""}
              >
                {/* Dùng currentVisibility thay vì p.visibility */}
                {currentVisibility === "private" ? (
                  <i className="fas fa-lock" style={{ fontSize: "12px" }}></i>
                ) : currentVisibility === "friends" ? (
                  <i
                    className="fas fa-user-friends"
                    style={{ fontSize: "12px" }}
                  ></i>
                ) : (
                  <i
                    className="fas fa-globe-americas"
                    style={{ fontSize: "12px" }}
                  ></i>
                )}

                {/* Mũi tên nhỏ báo hiệu có thể click */}
                {canEditVisibility && (
                  <i
                    className="fas fa-caret-down"
                    style={{ fontSize: "12px", marginLeft: "4px" }}
                  ></i>
                )}
              </span>

              {/* Menu thả xuống */}
              {showVisDropdown && canEditVisibility && (
                <div
                  className="absolute bg-white border border-gray-100 shadow-lg rounded-lg z-50 overflow-hidden"
                  style={{
                    width: "140px",
                    top: "100%",
                    left: "0",
                    marginTop: "4px",
                  }}
                >
                  <ul className="flex flex-col py-1 m-0 list-none p-0">
                    <li
                      className={`px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                        currentVisibility === "public"
                          ? "text-sky-600 bg-sky-50 font-semibold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleChangeVisibility("public");
                      }}
                    >
                      {t("post.visibility_public")}
                    </li>
                    <li
                      className={`px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                        currentVisibility === "friends"
                          ? "text-sky-600 bg-sky-50 font-semibold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleChangeVisibility("friends");
                      }}
                    >
                      {t("post.visibility_friends")}
                    </li>
                    <li
                      className={`px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                        currentVisibility === "private"
                          ? "text-sky-600 bg-sky-50 font-semibold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleChangeVisibility("private");
                      }}
                    >
                      {t("post.visibility_private")}
                    </li>
                  </ul>
                </div>
              )}
            </div>
            {/*  KẾT THÚC KHU VỰC NÚT QUYỀN RIÊNG TƯ  */}
          </div>
        </div>
        {canModify && (
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
              <div className="options-dropdown">
                {isAuthor && (
                  <button onClick={handleEditClick}>
                    <i
                      className="fas fa-edit"
                      style={{ marginRight: "8px" }}
                    ></i>
                    {t("common.edit")}
                  </button>
                )}
                <button onClick={handleDeleteClick} style={{ color: "red" }}>
                  <i
                    className="fas fa-trash-alt"
                    style={{ marginRight: "8px" }}
                  ></i>
                  {t("common.delete")}
                  {isAdmin && !isAuthor && " (Admin)"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div
          className="post-edit-mode"
          style={{
            padding: "15px",
            backgroundColor: "#f7f8fa",
            borderRadius: "8px",
            marginTop: "10px",
            border: "1px solid #e4e6eb",
          }}
        >
          {/* NẾU LÀ BÀI HỎI BÁC SĨ (OBJECT) */}
          {typeof editContent === "object" ? (
            <div
              className="medical-edit-form"
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              {/* NHÓM 1: TRIỆU CHỨNG */}
              <div
                style={{
                  backgroundColor: "#fff",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#1877f2",
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {" "}
                  {t("dashboard.medical_form.title_symptom") ||
                    "Triệu chứng & Tình trạng"}
                </h4>

                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#050505",
                      marginBottom: "4px",
                    }}
                  >
                    {t("dashboard.medical_form.symptom") ||
                      "Về triệu chứng và tình trạng hiện tại:"}
                  </label>
                  <textarea
                    value={editContent.symptom || ""}
                    onChange={(e) =>
                      setEditContent({
                        ...editContent,
                        symptom: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      minHeight: "60px",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                <div
                  style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "bold",
                        color: "#050505",
                        marginBottom: "4px",
                      }}
                    >
                      {t("dashboard.medical_form.duration") ||
                        "Xuất hiện từ khi nào?"}
                    </label>
                    <input
                      type="text"
                      value={editContent.duration || ""}
                      onChange={(e) =>
                        setEditContent({
                          ...editContent,
                          duration: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "bold",
                        color: "#050505",
                        marginBottom: "4px",
                      }}
                    >
                      {t("dashboard.medical_form.severity") ||
                        "Mức độ nghiêm trọng:"}
                    </label>
                    <input
                      type="text"
                      value={editContent.severity || ""}
                      onChange={(e) =>
                        setEditContent({
                          ...editContent,
                          severity: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#050505",
                      marginBottom: "4px",
                    }}
                  >
                    {t("dashboard.medical_form.factors") ||
                      "Yếu tố làm nặng/đỡ hơn:"}
                  </label>
                  <input
                    type="text"
                    value={editContent.factors || ""}
                    onChange={(e) =>
                      setEditContent({
                        ...editContent,
                        factors: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* NHÓM 2: TIỀN SỬ & THUỐC */}
              <div
                style={{
                  backgroundColor: "#fff",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#1877f2",
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {" "}
                  {t("dashboard.medical_form.title_history") ||
                    "Tiền sử bệnh & Thuốc"}
                </h4>

                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#050505",
                      marginBottom: "4px",
                    }}
                  >
                    {t("dashboard.medical_form.history_personal") ||
                      "Tiền sử cá nhân (bệnh, phẫu thuật...):"}
                  </label>
                  <textarea
                    value={editContent.historyPersonal || ""}
                    onChange={(e) =>
                      setEditContent({
                        ...editContent,
                        historyPersonal: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      minHeight: "50px",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#050505",
                      marginBottom: "4px",
                    }}
                  >
                    {t("dashboard.medical_form.history_family") ||
                      "Tiền sử gia đình (di truyền, tim mạch...):"}
                  </label>
                  <textarea
                    value={editContent.historyFamily || ""}
                    onChange={(e) =>
                      setEditContent({
                        ...editContent,
                        historyFamily: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      minHeight: "50px",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#050505",
                      marginBottom: "4px",
                    }}
                  >
                    {t("dashboard.medical_form.medication") ||
                      "Thuốc bạn đang dùng hiện tại:"}
                  </label>
                  <textarea
                    value={editContent.medication || ""}
                    onChange={(e) =>
                      setEditContent({
                        ...editContent,
                        medication: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      minHeight: "50px",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* NHÓM 3: LỐI SỐNG */}
              <div
                style={{
                  backgroundColor: "#fff",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#1877f2",
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {" "}
                  {t("dashboard.medical_form.title_lifestyle") ||
                    "Lối sống sinh hoạt"}
                </h4>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#050505",
                      marginBottom: "4px",
                    }}
                  >
                    {t("dashboard.medical_form.lifestyle") ||
                      "Hút thuốc, rượu bia, thức khuya, căng thẳng?:"}
                  </label>
                  <textarea
                    value={editContent.lifestyle || ""}
                    onChange={(e) =>
                      setEditContent({
                        ...editContent,
                        lifestyle: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      minHeight: "50px",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* NẾU LÀ BÀI ĐĂNG BÌNH THƯỜNG (STRING) */
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                resize: "vertical",
                outline: "none",
                fontSize: "15px",
              }}
            />
          )}

          {/* CÁC NÚT LƯU / HỦY */}
          <div
            style={{
              marginTop: "15px",
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#e4e6eb",
                color: "#050505",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#d8dadf")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#e4e6eb")}
            >
              {t("common.cancel") || "Hủy"}
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: "8px 24px",
                borderRadius: "6px",
                border: "none",
                background: "#1877f2",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#166fe5")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#1877f2")}
            >
              {t("common.save") || "Lưu thay đổi"}
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
                {content.factors && (
                  <p>
                    <strong> {t("dashboard.medical_form.factors")}:</strong>{" "}
                    {content.factors}
                  </p>
                )}
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

                {/* HIỂN THỊ KHUNG BÀI VIẾT GỐC (NẾU LÀ SHARE)  */}
                {p.kind === "share" && p.shared_post && (
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
                      // Chỉ mở popup nếu bài viết còn tồn tại
                      if (p.shared_post.status !== "unavailable") {
                        window.dispatchEvent(
                          new CustomEvent("open_post_notification", {
                            detail: { postId: p.shared_post.id },
                          }),
                        );
                      }
                    }}
                  >
                    {/* TRƯỜNG HỢP 1: Bài gốc bị xóa / Unavailable */}
                    {p.shared_post.status === "unavailable" ? (
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
                          {p.shared_post.message ||
                            t("post.content_unavailable")}
                        </span>
                      </div>
                    ) : (
                      /* TRƯỜNG HỢP 2: Bài gốc bình thường */
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
                            src={resolveImageUrl(p.shared_post.author?.avatar)}
                            alt="shared-avatar"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                            onClick={(e) =>
                              handleProfileNavigation(
                                p.shared_post.author?.id,
                                e,
                              )
                            }
                          />
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            <strong
                              style={{
                                fontSize: "14px",
                                color: "#050505",
                                cursor: "pointer",
                              }}
                              onClick={(e) =>
                                handleProfileNavigation(
                                  p.shared_post.author?.id,
                                  e,
                                )
                              }
                            >
                              {p.shared_post.author?.name ||
                                t("navbar.role_user")}
                            </strong>
                            <span
                              style={{ fontSize: "12px", color: "#65676b" }}
                            >
                              {getTimeAgo(p.shared_post.time)}
                            </span>
                          </div>
                        </div>

                        {/* KHU VỰC HIỂN THỊ NỘI DUNG BÀI ĐƯỢC SHARE (Hiển thị đầy đủ tất cả các trường y khoa) */}
                        <div style={{ padding: "10px" }}>
                          {(() => {
                            let spContent = p.shared_post.content;
                            let isMedical = p.shared_post.kind === "medical";

                            // 1. Ép kiểu an toàn tuyệt đối: Dịch chuỗi JSON thành Object
                            if (
                              typeof spContent === "string" &&
                              spContent.trim().startsWith("{")
                            ) {
                              try {
                                spContent = JSON.parse(spContent);
                                isMedical = true; // Chắc chắn là y khoa nếu parse được
                              } catch (e) {}
                            }

                            // 2. RENDER BÀI Y KHOA: Hiển thị toàn bộ các trường có dữ liệu
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
                                  <p>
                                    <strong>
                                      {t(
                                        "dashboard.medical_form.title_symptom",
                                      )}
                                      :
                                    </strong>{" "}
                                    {spContent.symptom || "—"}
                                  </p>
                                  <p>
                                    <strong>
                                      {t("dashboard.medical_form.duration")}:
                                    </strong>{" "}
                                    {spContent.duration || "—"}
                                  </p>
                                  <p>
                                    <strong>
                                      {t("dashboard.medical_form.severity")}:
                                    </strong>{" "}
                                    {spContent.severity || "—"}
                                  </p>
                                  {spContent.factors && (
                                    <p>
                                      <strong>
                                        {" "}
                                        {t("dashboard.medical_form.factors")}:
                                      </strong>{" "}
                                      {spContent.factors}
                                    </p>
                                  )}
                                  {(spContent.historyPersonal ||
                                    spContent.historyFamily) && (
                                    <div className="medical-divider">
                                      {spContent.historyPersonal && (
                                        <p>
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
                                        <p>
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
                                    <div className="medical-divider">
                                      {spContent.medication && (
                                        <p>
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
                                        <p>
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
                                </div>
                              );
                            }

                            // 3. RENDER BÀI BÌNH THƯỜNG
                            const textOutput =
                              typeof spContent === "string" ? spContent : "";
                            return (
                              <p
                                style={{
                                  fontSize: "14px",
                                  color: "#050505",
                                  margin: 0,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {textOutput}
                              </p>
                            );
                          })()}
                        </div>
                        {p.shared_post.images &&
                          p.shared_post.images.length > 0 && (
                            <div
                              style={{
                                width: "100%",
                                borderTop: "1px solid #eee",
                                backgroundColor: "#000",
                                display: "flex",
                                justifyContent: "center",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openLightbox(p.shared_post.images, 0);
                              }}
                            >
                              {p.shared_post.images[0].type === "video" ? (
                                <video
                                  src={resolveImageUrl(
                                    p.shared_post.images[0].url,
                                  )}
                                  controls
                                  style={{
                                    width: "100%",
                                    maxHeight: "500px",
                                    objectFit: "contain",
                                  }}
                                />
                              ) : (
                                <img
                                  src={resolveImageUrl(
                                    p.shared_post.images[0].url,
                                  )}
                                  alt="shared-media"
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                    maxHeight: "600px",
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

                {p.kind === "share" && !p.shared_post && (
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
                    🚫{t("post.post_unavailable")}
                  </div>
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
          <div style={{ display: "flex", gap: "10px" }}>
            {countAllComments(list) > 0 && (
              <span className="comment-share-count">
                {countAllComments(list)} {t("dashboard.comment_count")}
              </span>
            )}
            {p.shares_count > 0 && (
              <span className="comment-share-count">
                {p.shares_count} {t("dashboard.share_count") || "Lượt chia sẻ"}
              </span>
            )}
          </div>
        </div>
        <div className="post-buttons">
          <div
            className="post-action-group"
            onMouseEnter={() => armPostPopup(`p-${p.id}`)}
            onMouseLeave={disarmPostPopup}
            onClick={(e) => {}}
            onTouchStart={() => {
              postPopupTimer.current = setTimeout(() => {
                setActivePostPopup(`p-${p.id}`);
              }, 500);
            }}
            onTouchEnd={() => {
              if (postPopupTimer.current) clearTimeout(postPopupTimer.current);
            }}
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
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setPostReaction(e.type);
                    }}
                    onTouchStart={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setPostReaction(e.type);
                    }}
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
                post={p}
                onShare={(apiResult) => {
                  if (apiResult.new_post && onNewPost) {
                    onNewPost(apiResult.new_post);
                  }

                  if (apiResult.shares !== undefined) {
                  }
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
          } catch (err) {
            const errorMessage =
              err.response?.data?.error || t("error.reply_failed");
            toast.error(errorMessage);
          }
        }}
        MAX_REPLIES_VISIBLE={MAX_REPLIES_VISIBLE}
        MAX_NEST_LEVEL={MAX_NEST_LEVEL}
        reactions={reactions}
        setReactions={setReactions}
        activePopup={activePostPopup}
        setActivePopup={setActivePostPopup}
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

import React, { useState, useRef, useEffect, useMemo } from "react";
import "../styles/DashBoard.css";
import { getPostById } from "../services/socialApi";
import {
  fetchPosts,
  createPost,
  reactPost,
  addComment,
  reactComment,
  deleteComment as apiDeleteComment,
  updatePost,
  deletePost,
} from "../services/socialApi";
import { savePostsToCache, loadPostsFromCache } from "../utils/postCache";
import { mapPostToUI } from "../utils/mapPost";

import Navbar from "../components/Navbar";
import SidebarLeft from "../components/dashboard/SidebarLeft";
import SidebarRight from "../components/dashboard/SidebarRight";
import CreatePostBox from "../components/dashboard/CreatePostBox";
import PostCard from "../components/dashboard/PostCard";
import CreatePostModal from "../components/dashboard/CreatePostModal";
import Lightbox from "../components/dashboard/Lightbox";
import CommentModal from "../components/dashboard/CommentModal";
import websocketService from "../services/websocket";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
// --- HELPER CONSTANTS & FUNCTIONS ---
// const emojiList = [
//   { type: "like", icon: "👍", label: "Thích", color: "#1b74e4" },
//   { type: "love", icon: "❤️", label: "Yêu thích", color: "#f33e58" },
//   { type: "care", icon: "🥰", label: "Thương thương", color: "#f7b125" },
//   { type: "haha", icon: "😂", label: "Haha", color: "#f7b125" },
//   { type: "wow", icon: "😮", label: "Wow", color: "#f7b125" },
//   { type: "sad", icon: "😢", label: "Buồn", color: "#f7b125" },
//   { type: "angry", icon: "😡", label: "Phẫn nộ", color: "#e9710f" },
// ];

const updateNode = (l, id, up) =>
  l.map((n) =>
    n.id === id
      ? up(n)
      : { ...n, replies: n.replies ? updateNode(n.replies, id, up) : n.replies }
  );

const removeNode = (l, id) =>
  l
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      replies: n.replies ? removeNode(n.replies, id) : n.replies,
    }));

const Dashboard = ({ user, onLogout }) => {
  const { t, i18n } = useTranslation();
  // --- STATE: FEED ---
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [reactions, setReactions] = useState({});
  const [activePopup, setActivePopup] = useState(null); // Popup reactions ở Feed

  // --- STATE: MODAL VIEW (Xem bài từ thông báo) ---
  const [viewPost, setViewPost] = useState(null);
  const [highlightCommentId, setHighlightCommentId] = useState(null);
  const [activeCommentPopup, setActiveCommentPopup] = useState(null); // Popup reactions trong Modal
  const [activePostPopup, setActivePostPopup] = useState(null); // Popup post reaction trong Modal
  const [modalCommentDraft, setModalCommentDraft] = useState("");
  const [modalReplyDrafts, setModalReplyDrafts] = useState({});

  // --- STATE: CREATE POST & OTHERS ---
  const [postType, setPostType] = useState("normal");
  const [newPost, setNewPost] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [lightbox, setLightbox] = useState({
    open: false,
    images: [],
    index: 0,
  });
  const [posting, setPosting] = useState(false);
  const [medicalForm, setMedicalForm] = useState({
    symptom: "",
    duration: "",
    severity: "",
    factors: "",
    historyPersonal: "",
    historyFamily: "",
    medication: "",
    lifestyle: "",
  });

  const fileInputRef = useRef();
  const emojiList = useMemo(
    () => [
      {
        type: "like",
        icon: "👍",
        label: t("reactions.like"),
        color: "#1b74e4",
      },
      {
        type: "love",
        icon: "❤️",
        label: t("reactions.love"),
        color: "#f33e58",
      },
      {
        type: "care",
        icon: "🥰",
        label: t("reactions.care"),
        color: "#f7b125",
      },
      {
        type: "haha",
        icon: "😂",
        label: t("reactions.haha"),
        color: "#f7b125",
      },
      { type: "wow", icon: "😮", label: t("reactions.wow"), color: "#f7b125" },
      { type: "sad", icon: "😢", label: t("reactions.sad"), color: "#f7b125" },
      {
        type: "angry",
        icon: "😡",
        label: t("reactions.angry"),
        color: "#e9710f",
      },
    ],
    [t]
  );
  // =======================================================
  // 1. LOGIC MỞ BÀI VIẾT TỪ THÔNG BÁO
  // =======================================================
  useEffect(() => {
    const handleOpenNotification = async (event) => {
      const { postId, commentId } = event.detail;
      if (!postId) return;

      setModalCommentDraft("");
      setActiveCommentPopup(null);
      setActivePostPopup(null);

      // 1. Tìm trong list hiện tại
      let target = posts.find((p) => String(p.id) === String(postId));

      // 2. Nếu không có (bài cũ), tải từ API
      if (!target) {
        try {
          const raw = await getPostById(postId);
          target = mapPostToUI(raw);
        } catch (e) {
          console.error("Lỗi tải bài viết:", e);
          toast.error("Bài viết không tồn tại hoặc đã bị xóa");
          return;
        }
      }

      if (target) {
        setViewPost(target);
        setHighlightCommentId(commentId);
      }
    };

    window.addEventListener("open_post_notification", handleOpenNotification);
    return () =>
      window.removeEventListener(
        "open_post_notification",
        handleOpenNotification
      );
  }, [posts]);

  // =======================================================
  // 2. CÁC HÀM XỬ LÝ TƯƠNG TÁC TRONG MODAL VIEW
  // =======================================================

  // 2.1 Thả tim bài viết (Trong Modal)
  const handleModalPostReact = (type) => {
    if (!viewPost) return;

    if (type) {
      setReactions((prev) => ({ ...prev, [viewPost.id]: type }));
      setViewPost((prev) => ({ ...prev, user_reaction: type }));
    } else {
      setReactions((prev) => {
        const copy = { ...prev };
        delete copy[viewPost.id];
        return copy;
      });
      setViewPost((prev) => ({ ...prev, user_reaction: null }));
    }

    reactPost(viewPost.id, type).catch(() => {});
    websocketService.send("post_react", {
      post_id: viewPost.id,
      reaction_type: type,
    });
    setActivePostPopup(null);
  };

  // 2.2 Gửi bình luận mới
  const handleModalSubmitComment = async () => {
    const text = modalCommentDraft.trim();
    if (!text || !viewPost) return;

    try {
      setModalCommentDraft("");
      await addComment({ postId: viewPost.id, text });
    } catch (e) {
      toast.error("Lỗi gửi bình luận");
    }
  };

  // 2.3 Thả tim bình luận
  const handleModalCommentReact = (cid, type) => {
    if (!viewPost) return;
    const emoji = emojiList.find((e) => e.type === type);

    setComments((prev) => {
      const ps = prev[viewPost.id] || { list: [] };
      const list = updateNode(ps.list, cid, (c) => {
        const isSame = c.reaction?.type === type;
        const newReaction = isSame ? null : emoji;
        let newLikes = c.likes || 0;
        if (c.reaction && !newReaction) newLikes -= 1;
        if (!c.reaction && newReaction) newLikes += 1;

        return { ...c, reaction: newReaction, likes: Math.max(0, newLikes) };
      });
      return { ...prev, [viewPost.id]: { ...ps, list } };
    });

    reactComment(cid, type).catch(() => {});
    setActiveCommentPopup(null);
  };

  // 2.4 Trả lời bình luận
  const handleModalSubmitReply = (cid, mentionUser) => {
    const draft = modalReplyDrafts[cid] || "";
    const text = draft.trim();
    if (!text) return;

    const finalText = text.startsWith(`@${mentionUser}`)
      ? text
      : `@${mentionUser} ${text}`;
    setModalReplyDrafts((prev) => ({ ...prev, [cid]: "" }));

    addComment({ postId: viewPost.id, text: finalText, parentId: cid })
      .then(() => {
        setComments((prev) => {
          const ps = prev[viewPost.id];
          const list = updateNode(ps.list, cid, (n) => ({
            ...n,
            replyOpen: false,
          }));
          return { ...prev, [viewPost.id]: { ...ps, list } };
        });
      })
      .catch(() => toast.error("Lỗi trả lời"));
  };

  // 2.5 Xóa bình luận
  const handleModalDeleteComment = async (cid) => {
    if (!window.confirm(t("common.confirm_delete_comment"))) return;
    try {
      await apiDeleteComment(cid);
      setComments((prev) => {
        const ps = prev[viewPost.id];
        return {
          ...prev,
          [viewPost.id]: { ...ps, list: removeNode(ps.list, cid) },
        };
      });
      toast.success(t("common.deleted_comment"));
    } catch {
      toast.error(t("common.error_delete_comment"));
    }
  };

  // 2.6 Toggle Reply Box
  const handleModalToggleReplyBox = (cid) => {
    setComments((prev) => {
      const ps = prev[viewPost.id];
      const list = updateNode(ps.list, cid, (c) => ({
        ...c,
        replyOpen: !c.replyOpen,
      }));
      return { ...prev, [viewPost.id]: { ...ps, list } };
    });
  };

  // =======================================================
  // 3. LOAD DATA & WEBSOCKET
  // =======================================================

  // Load Feed & Cache
  useEffect(() => {
    const loadData = async () => {
      const cachedPosts = loadPostsFromCache();
      if (cachedPosts && cachedPosts.length > 0) {
        setPosts(cachedPosts);
      }
      try {
        const data = await fetchPosts();
        const uiPosts = data.map(mapPostToUI);
        setPosts(uiPosts);
        savePostsToCache(uiPosts);
      } catch (err) {
        console.error(t("common.error_load_posts"), err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (posts.length > 0) savePostsToCache(posts);
  }, [posts]);

  // Sync Reactions from Posts to State
  useEffect(() => {
    if (posts.length > 0) {
      setReactions((prev) => {
        const newReactions = { ...prev };
        let hasChange = false;
        posts.forEach((p) => {
          const myReact =
            p.user_reaction || p.my_reaction || p.current_reaction;
          if (myReact && newReactions[p.id] !== myReact) {
            newReactions[p.id] = myReact;
            hasChange = true;
          }
        });
        return hasChange ? newReactions : prev;
      });
    }
  }, [posts]);

  // WebSocket Listener
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    websocketService.disconnect();
    websocketService.connect(token);

    const handleFeedUpdate = (data) => {
      const eventType = data.event || data.type || data.data?.event;
      const payload = data.data || data;

      switch (eventType) {
        case "post_react":
        case "post_change_react":
        case "post_unreact": {
          const { post_id, reaction_counts, user_id, reaction_type } = payload;
          if (post_id) {
            setPosts((prev) =>
              prev.map((p) => {
                if (String(p.id) === String(post_id)) {
                  const updatedPost = {
                    ...p,
                    reaction_counts:
                      reaction_counts !== undefined
                        ? reaction_counts
                        : p.reaction_counts,
                  };
                  if (String(user_id) === String(user?.id)) {
                    updatedPost.user_reaction = reaction_type;
                    updatedPost.my_reaction = reaction_type;
                    updatedPost.current_reaction = reaction_type;
                  }
                  return updatedPost;
                }
                return p;
              })
            );
            if (String(user_id) === String(user?.id)) {
              if (reaction_type) {
                setReactions((prev) => ({ ...prev, [post_id]: reaction_type }));
              } else {
                setReactions((prev) => {
                  const copy = { ...prev };
                  delete copy[post_id];
                  return copy;
                });
              }
            }
          }
          break;
        }
        case "update_post": {
          const updatedPost = payload.post;
          if (updatedPost) {
            setPosts((prev) =>
              prev.map((p) =>
                String(p.id) === String(updatedPost.id)
                  ? mapPostToUI(updatedPost)
                  : p
              )
            );
          }
          break;
        }
        case "new_comment": {
          const { post_id: pid, comment } = payload;
          if (pid && comment) {
            setComments((prev) => {
              const postComments = prev[pid] || { list: [] };
              if (postComments.list.some((c) => c.id === comment.id))
                return prev;
              return {
                ...prev,
                [pid]: {
                  ...postComments,
                  list: [...postComments.list, comment],
                },
              };
            });
          }
          break;
        }
        case "delete_comment": {
          const { post_id: postId, comment_id: commentId } = payload;
          if (postId && commentId) {
            setComments((prev) => {
              const postComments = prev[postId];
              if (!postComments?.list) return prev;
              return {
                ...prev,
                [postId]: {
                  ...postComments,
                  list: removeNode(postComments.list, commentId),
                },
              };
            });
          }
          break;
        }
        case "comment_react": {
          const {
            comment_id: cid,
            post_id: cpid,
            reaction_counts: crc,
            user_id: uid,
            reaction_type: rtype,
          } = payload;
          if (cpid && cid) {
            setComments((prev) => {
              const postComments = prev[cpid];
              if (!postComments?.list) return prev;
              const list = updateNode(postComments.list, cid, (n) => {
                const updatedNode = { ...n, reaction_counts: crc };
                if (String(uid) === String(user?.id)) {
                  if (rtype) {
                    const emoji = emojiList.find((e) => e.type === rtype) || {
                      type: "like",
                      icon: "👍",
                      label: "Thích",
                    };
                    updatedNode.reaction = emoji;
                    updatedNode.likes = updatedNode.likes || 0;
                  } else {
                    updatedNode.reaction = null;
                  }
                }
                return updatedNode;
              });
              return { ...prev, [cpid]: { ...postComments, list } };
            });
          }
          break;
        }
        case "new_post":
        case "post_created": {
          const incomingPost = payload.post;
          if (
            incomingPost &&
            String(incomingPost.author?.id) !== String(user?.id)
          ) {
            setPosts((prev) => {
              if (prev.some((p) => String(p.id) === String(incomingPost.id)))
                return prev;
              toast.success(
                `📢 ${incomingPost.author?.name || "Ai đó"} vừa đăng bài mới!`
              );
              return [mapPostToUI(incomingPost), ...prev];
            });
          }
          break;
        }
      }
    };

    const events = [
      "post_react",
      "post_change_react",
      "post_unreact",
      "new_comment",
      "delete_comment",
      "comment_react",
      "new_post",
      "post_created",
      "update_post",
    ];
    events.forEach((evt) => websocketService.on(evt, handleFeedUpdate));
    return () => {
      console.log("🧹 [Dashboard] Cleaning up listeners");
      events.forEach((evt) => websocketService.off(evt, handleFeedUpdate));
    };
  }, [user?.id]);

  // =======================================================
  // 4. CÁC HÀM UTILS & HANDLERS CŨ
  // =======================================================
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return t("time.just_now");
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return t("time.just_now");
    const diffMins = Math.floor((new Date() - date) / 60000);
    if (diffMins < 1) return t("time.just_now");
    if (diffMins < 60) return t("time.mins_ago", { count: diffMins });
    if (diffMins < 1440)
      return t("time.hours_ago", { count: Math.floor(diffMins / 60) });
    const localeMap = { vi: "vi-VN", en: "en-US", ja: "ja-JP" };
    return date.toLocaleString(localeMap[i18n.language] || "vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const createNewComment = (text) => ({
    id: Date.now() + Math.random(),
    user: user?.name || "Bạn",
    text,
    avatar:
      user?.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    time: getTimeAgo(Date.now()),
    reaction: null,
    likes: 0,
    replies: [],
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const fileObjs = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type,
    }));
    setSelectedImages((prev) => [...prev, ...fileObjs]);
  };
  const removeImage = (media) =>
    setSelectedImages((prev) => prev.filter((m) => m.url !== media.url));
  const openLightbox = (images, index) =>
    setLightbox({ open: true, images, index });
  const changeImage = (dir) =>
    setLightbox((prev) => ({
      ...prev,
      index:
        dir === "next"
          ? (prev.index + 1) % prev.images.length
          : (prev.index - 1 + prev.images.length) % prev.images.length,
    }));
  const closeLightbox = () =>
    setLightbox({ open: false, images: [], index: 0 });
  const handlePostDeleted = (pid) => {
    setPosts((prev) => prev.filter((p) => p.id !== pid));
    toast.success("Đã xóa bài viết");
  };
  const handlePostUpdated = (up) => {
    setPosts((prev) => prev.map((p) => (p.id === up.id ? mapPostToUI(up) : p)));
    toast.success("Đã cập nhật bài viết");
  };

  const handlePost = async () => {
    if (posting) return;
    const files = (selectedImages || []).map((x) => x.file).filter(Boolean);
    const kind = postType === "medical" ? "medical" : "normal";
    const hasContent =
      (kind === "medical"
        ? Object.values(medicalForm).some((v) => v.trim())
        : newPost.trim().length > 0) || files.length > 0;
    if (!hasContent) {
      alert("Bạn chưa nhập nội dung hoặc chọn ảnh/video.");
      return;
    }
    const tempId = Date.now();
    const optimisicPost = {
      id: tempId,
      author: { id: user?.id, name: user?.name || "Bạn", avatar: user?.avatar },
      time: new Date().toISOString(),
      content: kind === "medical" ? medicalForm : newPost,
      images: selectedImages.map((img) => ({
        url: img.url,
        type: img.type.startsWith("video") ? "video" : "image",
      })),
      reaction_counts: {},
      comment_count: 0,
      isOptimistic: true,
    };
    setPosts((prev) => [optimisicPost, ...prev]);
    setNewPost("");
    setSelectedImages([]);
    setMedicalForm({
      symptom: "",
      duration: "",
      severity: "",
      factors: "",
      historyPersonal: "",
      historyFamily: "",
      medication: "",
      lifestyle: "",
    });
    setIsModalOpen(false);
    setPosting(true);
    try {
      const payload =
        kind === "medical"
          ? { kind, content_medical: optimisicPost.content, files }
          : { kind, content: optimisicPost.content, files };
      const created = await createPost(payload);
      setPosts((prev) =>
        prev.map((p) => (p.id === tempId ? mapPostToUI(created) : p))
      );
    } catch (e) {
      toast.error(`❌ ${e?.response?.data?.detail || "Lỗi đăng bài"}`);
      setPosts((prev) => prev.filter((p) => p.id !== tempId));
      if (kind === "normal") {
        setNewPost(
          typeof optimisicPost.content === "string" ? optimisicPost.content : ""
        );
        setIsModalOpen(true);
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <Navbar user={user} onLogout={onLogout} />
      <div className="dashboard-layout">
        <SidebarLeft />
        <main className="feed scrollable">
          <CreatePostBox
            user={user}
            setIsModalOpen={setIsModalOpen}
            setPostType={setPostType}
          />
          {posts.map((p) => (
            <PostCard
              key={p.id}
              p={p}
              currentUser={user}
              reactions={reactions}
              setReactions={setReactions}
              comments={comments}
              setComments={setComments}
              emojiList={emojiList}
              activePopup={activePopup}
              setActivePopup={setActivePopup}
              openLightbox={openLightbox}
              createNewComment={createNewComment}
              getTimeAgo={getTimeAgo}
              lightbox={lightbox}
              onDeletePost={handlePostDeleted}
              onUpdatePost={handlePostUpdated}
            />
          ))}
        </main>
        <SidebarRight />
      </div>

      {viewPost && (
        <CommentModal
          isOpen={true}
          onClose={() => {
            setViewPost(null);
            setHighlightCommentId(null);
          }}
          post={viewPost}
          comments={comments}
          currentUser={user}
          emojiList={emojiList}
          getTimeAgo={getTimeAgo}
          highlightCommentId={highlightCommentId}
          // --- Reaction ---
          activePopup={activePostPopup}
          setActivePopup={setActivePostPopup}
          onTogglePostReaction={() =>
            handleModalPostReact(
              reactions[viewPost.id] || viewPost.user_reaction ? null : "like"
            )
          }
          onSetPostReaction={(type) => handleModalPostReact(type)}
          reactions={reactions}
          setReactions={setReactions}
          onShareClick={() => {}} // TODO: Add share logic if needed
          // --- Comment ---
          commentDraft={modalCommentDraft}
          setCommentDraft={setModalCommentDraft}
          onSubmitComment={handleModalSubmitComment}
          // --- Interact ---
          activeCommentPopup={activeCommentPopup}
          setActiveCommentPopup={setActiveCommentPopup}
          toggleCommentLike={(cid) => handleModalCommentReact(cid, "like")}
          setCommentReaction={(cid, type) => handleModalCommentReact(cid, type)}
          deleteComment={handleModalDeleteComment}
          // --- Reply ---
          getReplyDraft={(cid) => modalReplyDrafts[cid] || ""}
          setReplyDraft={(cid, val) =>
            setModalReplyDrafts((p) => ({ ...p, [cid]: val }))
          }
          toggleReplyBox={handleModalToggleReplyBox}
          submitReply={handleModalSubmitReply}
          // --- Others ---
          getEditDraft={() => ""}
          setEditDraft={() => {}}
          startEdit={() => {}}
          saveEdit={() => {}}
          mutateComments={() => {}}
          updateNode={updateNode}
          MAX_REPLIES_VISIBLE={3}
          MAX_NEST_LEVEL={3}
        />
      )}

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        postType={postType}
        newPost={newPost}
        setNewPost={setNewPost}
        medicalForm={medicalForm}
        setMedicalForm={setMedicalForm}
        selectedImages={selectedImages}
        removeImage={removeImage}
        fileInputRef={fileInputRef}
        handleImageChange={handleImageChange}
        handlePost={handlePost}
      />

      <Lightbox
        lightbox={lightbox}
        onClose={closeLightbox}
        changeImage={changeImage}
      />
    </div>
  );
};

export default Dashboard;

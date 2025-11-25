// export default Dashboard;
import React, { useState, useRef, useEffect } from "react";
import "../styles/DashBoard.css";

import { fetchPosts, createPost } from "../services/socialApi";
import { savePostsToCache, loadPostsFromCache } from "../utils/postCache";
import { mapPostToUI } from "../utils/mapPost";

import Navbar from "../components/Navbar";
import SidebarLeft from "../components/dashboard/SidebarLeft";
import SidebarRight from "../components/dashboard/SidebarRight";
import CreatePostBox from "../components/dashboard/CreatePostBox";
import PostCard from "../components/dashboard/PostCard";
import CreatePostModal from "../components/dashboard/CreatePostModal";
import Lightbox from "../components/dashboard/Lightbox";
import websocketService from "../services/websocket";
import { toast } from "react-toastify";

const emojiList = [
  { type: "like", icon: "👍", label: "Thích", color: "#1b74e4" },
  { type: "love", icon: "❤️", label: "Yêu thích", color: "#f33e58" },
  { type: "care", icon: "🥰", label: "Thương thương", color: "#f7b125" },
  { type: "haha", icon: "😂", label: "Haha", color: "#f7b125" },
  { type: "wow", icon: "😮", label: "Wow", color: "#f7b125" },
  { type: "sad", icon: "😢", label: "Buồn", color: "#f7b125" },
  { type: "angry", icon: "😡", label: "Phẫn nộ", color: "#e9710f" },
];
const Dashboard = ({ user, onLogout }) => {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    const handleNewPost = (data) => {
      console.log("📢 WebSocket nhận post mới:", data);
      //  Phải map sang format UI giống fetchPosts
      const uiPost = mapPostToUI(data.post || data);
      setPosts((prev) => [uiPost, ...prev]);
    };

    websocketService.on("post_created", handleNewPost);

    return () => {
      websocketService.off("post_created", handleNewPost);
    };
  }, []);
  useEffect(() => {
    const loadData = async () => {
      //  1: Hiển thị ngay từ Cache (nếu có) để tạo cảm giác "mượt"
      const cachedPosts = loadPostsFromCache();
      if (cachedPosts && cachedPosts.length > 0) {
        console.log(
          `🚀 [Dashboard] Loaded ${cachedPosts.length} posts from Cache`
        );
        setPosts(cachedPosts);
      }

      // 2: Gọi API lấy dữ liệu mới nhất (Ngầm)
      try {
        const data = await fetchPosts();
        const uiPosts = data.map(mapPostToUI);

        // Cập nhật State hiển thị
        setPosts(uiPosts);

        // Lưu ngay dữ liệu mới nhất vào cache
        savePostsToCache(uiPosts);
      } catch (err) {
        console.error("Tải bài viết thất bại:", err);
      }
    };

    loadData();
  }, []);

  // Tự động lưu Cache mỗi khi danh sách posts thay đổi
  useEffect(() => {
    if (posts.length > 0) {
      savePostsToCache(posts);
    }
  }, [posts]);
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Vừa xong";

    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      return "Vừa xong";
    }

    const now = new Date();
    const diffMs = now - date;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleString("vi-VN", {
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

  const [postType, setPostType] = useState("normal");
  const [newPost, setNewPost] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [lightbox, setLightbox] = useState({
    open: false,
    images: [],
    index: 0,
  });
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
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});
  const [activePopup, setActivePopup] = useState(null);

  const fileInputRef = useRef();
  // TẢI FEED từ BE khi mở trang
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPosts();
        setPosts(data.map(mapPostToUI));
      } catch (e) {
        console.error("Fetch posts error:", e);
      }
    })();
  }, []);

  // 🟡 Chọn ảnh/video — giữ cả file để upload (và giữ type MIME cho FE preview)
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const fileObjs = files.map((file) => ({
      file, // 👈 cần cho upload
      url: URL.createObjectURL(file),
      type: file.type, // "image/..." | "video/..." (FE đang dùng startsWith("video"))
    }));
    setSelectedImages((prev) => [...prev, ...fileObjs]);
  };

  const removeImage = (media) =>
    setSelectedImages((prev) => prev.filter((m) => m.url !== media.url));

  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (posting) return;

    // 1. Chuẩn bị dữ liệu
    const files = (selectedImages || []).map((x) => x.file).filter(Boolean);
    const kind = postType === "medical" ? "medical" : "normal";

    const hasContent =
      (kind === "medical"
        ? Object.values(medicalForm).some((v) => (v || "").trim() !== "")
        : (newPost || "").trim().length > 0) || files.length > 0;

    if (!hasContent) {
      alert("Bạn chưa nhập nội dung hoặc chọn ảnh/video.");
      return;
    }

    // 2. Tạo ID tạm thời
    const tempId = Date.now();

    // 3. Tạo bài viết GIẢ LẬP (Fake Post)
    // Lưu ý: Cấu trúc phải giống hệt bài viết thật (theo mapPostToUI)
    const optimisicPost = {
      id: tempId,
      author: {
        id: user?.id,
        name: user?.name || "Bạn",
        avatar: user?.avatar,
      },
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

    // 4. CẬP NHẬT UI NGAY LẬP TỨC
    setPosts((prev) => [optimisicPost, ...prev]);

    // 5. Reset Form
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

    // 6. Gửi API ngầm
    setPosting(true);
    try {
      // Lưu ý: Payload gửi lên server vẫn giữ nguyên cấu trúc cũ (server tự xử lý user từ token)
      const payload =
        kind === "medical"
          ? { kind, content_medical: optimisicPost.content, files }
          : { kind, content: optimisicPost.content, files };

      console.log("[CreatePost] Sending payload...", payload);

      const created = await createPost(payload);
      console.log("[CreatePost] Success:", created);

      // 7. Update lại bằng dữ liệu thật từ Server
      setPosts((prev) =>
        prev.map((p) => (p.id === tempId ? mapPostToUI(created) : p))
      );
    } catch (e) {
      console.error("Create post error:", e);
      const msg =
        e?.response?.data?.detail || "Không thể đăng bài, vui lòng thử lại!";
      toast.error(`❌ ${msg}`);

      // 8. Rollback nếu lỗi
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
  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Đã xóa bài viết");
  };

  const handlePostUpdated = (updatedPost) => {
    // mapPostToUI là hàm helper bạn đang dùng để format dữ liệu
    const uiPost = mapPostToUI(updatedPost);
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? uiPost : p)));
    toast.success("Đã cập nhật bài viết");
  };
  //  Lightbox
  const openLightbox = (images, index) =>
    setLightbox({ open: true, images, index });
  const changeImage = (direction) =>
    setLightbox((prev) => ({
      ...prev,
      index:
        direction === "next"
          ? (prev.index + 1) % prev.images.length
          : (prev.index - 1 + prev.images.length) % prev.images.length,
    }));

  const closeLightbox = () =>
    setLightbox({ open: false, images: [], index: 0 });
  //  WEBSOCKET - LẮNG NGHE FEED UPDATE
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    websocketService.disconnect(); // luôn reset WS cũ
    websocketService.connect(token); // luôn tạo WS mới cho mỗi tab

    const handleFeedUpdate = (data) => {
      console.log("📢 [Dashboard] WebSocket feed_update:", data);
      const eventType = data.event || data.type || data.data?.event;

      // Log để kiểm tra xem đã bắt đúng tên sự kiện chưa
      console.log("👉 Event Type Detected:", eventType);

      switch (eventType) {
        case "post_react":
        case "post_change_react":
        case "post_unreact": {
          const payload = data.data || data;
          const { post_id, reaction_counts, user_id, reaction_type } = payload;

          // Ép kiểu ID về String để so sánh an toàn
          if (post_id) {
            setPosts((prev) =>
              prev.map((p) => {
                if (String(p.id) === String(post_id)) {
                  const updatedPost = {
                    ...p,
                    // Nếu server trả về reaction_counts thì dùng, không thì giữ cũ
                    reaction_counts:
                      reaction_counts !== undefined
                        ? reaction_counts
                        : p.reaction_counts,
                  };

                  // Nếu là chính mình, cập nhật nút bấm
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

            // Cập nhật Map reactions (cho nút Like đổi màu)
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
        // UPDATE POST
        case "update_post": {
          const payload = data.data || data;
          const updatedPost = payload.post;

          if (updatedPost) {
            console.log("📝 [Dashboard] Post updated:", updatedPost.id);

            setPosts((prev) =>
              prev.map((p) => {
                // Tìm bài viết cũ và thay thế bằng bài mới (đã map sang UI)
                if (String(p.id) === String(updatedPost.id)) {
                  return mapPostToUI(updatedPost);
                }
                return p;
              })
            );
          }
          break;
        }
        case "new_comment": {
          const payload = data.data || data;
          const { post_id: pid, comment } = payload;

          if (pid && comment) {
            const formattedComment = comment;

            setComments((prev) => {
              const postComments = prev[pid] || { list: [] };
              if (postComments.list.some((c) => c.id === comment.id))
                return prev;

              return {
                ...prev,
                [pid]: {
                  ...postComments,
                  list: [...postComments.list, formattedComment],
                },
              };
            });
          }
          break;
        }

        case "delete_comment": {
          const payload = data.data || data;
          const { post_id: postId, comment_id: commentId } = payload;

          if (postId && commentId) {
            setComments((prev) => {
              const postComments = prev[postId];
              if (!postComments?.list) return prev;

              const removeNode = (list, id) =>
                list
                  .filter((n) => n.id !== id)
                  .map((n) => ({
                    ...n,
                    replies: n.replies ? removeNode(n.replies, id) : n.replies,
                  }));

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
          const payload = data.data || data;
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

              const updateNode = (list) =>
                list.map((n) => {
                  if (n.id === cid) {
                    const updatedNode = { ...n, reaction_counts: crc };
                    if (String(uid) === String(user?.id)) {
                      if (rtype) {
                        const emoji = emojiList.find(
                          (e) => e.type === rtype
                        ) || { type: "like", icon: "👍", label: "Thích" };
                        updatedNode.reaction = emoji;
                        updatedNode.likes = updatedNode.likes || 0;
                      } else {
                        updatedNode.reaction = null;
                      }
                    }
                    return updatedNode;
                  }
                  if (n.replies)
                    return { ...n, replies: updateNode(n.replies) };
                  return n;
                });

              return {
                ...prev,
                [cpid]: {
                  ...postComments,
                  list: updateNode(postComments.list),
                },
              };
            });
          }
          break;
        }

        case "new_post":
        case "post_created": {
          const payload = data.data || data;
          const incomingPost = payload.post;

          if (incomingPost) {
            // Bỏ qua nếu là bài của chính mình (đã xử lý ở handlePost)
            if (String(incomingPost.author?.id) === String(user?.id)) break;

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

        default:
          console.log("⚠️ [Dashboard] Unknown event:", eventType, data);
      }
    };

    console.log("👂 [Dashboard] Registering WebSocket listener");

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

    // Lắng nghe tất cả các sự kiện cụ thể
    events.forEach((evt) => websocketService.on(evt, handleFeedUpdate));

    console.log("👂 [Dashboard] Listening for events:", events);

    return () => {
      console.log("🧹 [Dashboard] Cleaning up listeners");
      events.forEach((evt) => websocketService.off(evt, handleFeedUpdate));
    };
  }, [user?.id]);

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

// export default Dashboard;
import React, { useState, useRef, useEffect } from "react";
import "../styles/DashBoard.css";

// 🔧 đường dẫn đúng từ /src/pages → /src/services
import { fetchPosts, createPost } from "../services/socialApi";
// 🔧 đường dẫn đúng từ /src/pages → /src/utils
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
const Dashboard = ({ user, onLogout }) => {
  const [posts, setPosts] = useState([]);

  // useEffect(() => {
  //   // Lắng nghe post mới real-time
  //   const handleNewPost = (data) => {
  //     setPosts((prev) => [data.post, ...prev]);
  //   };

  //   websocketService.on("post_created", handleNewPost);

  //   return () => {
  //     websocketService.off("post_created", handleNewPost);
  //   };
  // }, []);
  useEffect(() => {
    const handleNewPost = (data) => {
      console.log("📢 WebSocket nhận post mới:", data);
      // ✅ Phải map sang format UI giống fetchPosts
      const uiPost = mapPostToUI(data.post || data);
      setPosts((prev) => [uiPost, ...prev]);
    };

    websocketService.on("post_created", handleNewPost);

    return () => {
      websocketService.off("post_created", handleNewPost);
    };
  }, []);
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await fetchPosts();
        setPosts(data.map(mapPostToUI));
      } catch (err) {
        console.error("Tải bài viết thất bại:", err);
      }
    };

    loadPosts(); // ✅ Chỉ load 1 lần khi mount
  }, []);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp); // ✅ Giả sử backend trả về UTC hoặc ISO string
    const now = new Date();
    const diffMs = now - date; // ✅ So sánh trực tiếp (browser tự convert múi giờ)

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    // ✅ Nếu quá 7 ngày thì hiển thị ngày/giờ cụ thể
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

  const [postType, setPostType] = useState("normal"); // "normal" | "medical"
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
  const emojiList = [
    { type: "like", icon: "👍", label: "Thích", color: "#1b74e4" },
    { type: "love", icon: "❤️", label: "Yêu thích", color: "#f33e58" },
    { type: "care", icon: "🥰", label: "Thương thương", color: "#f7b125" },
    { type: "haha", icon: "😂", label: "Haha", color: "#f7b125" },
    { type: "wow", icon: "😮", label: "Wow", color: "#f7b125" },
    { type: "sad", icon: "😢", label: "Buồn", color: "#f7b125" },
    { type: "angry", icon: "😡", label: "Phẫn nộ", color: "#e9710f" },
  ];
  const fileInputRef = useRef();
  // ✅ THÊM 2 helper functions này
  const getReactionIcon = (type) => {
    const emoji = emojiList.find((e) => e.type === type);
    return emoji?.icon || "👍";
  };

  const getReactionLabel = (type) => {
    const emoji = emojiList.find((e) => e.type === type);
    return emoji?.label || "Thích";
  };
  // 🟢 TẢI FEED từ BE khi mở trang
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

  // 🔴 Xóa media khỏi preview
  const removeImage = (media) =>
    setSelectedImages((prev) => prev.filter((m) => m.url !== media.url));

  // 🟢 Đăng bài — gọi BE & prepend post trả về
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (posting) return; // tránh double-click
    try {
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

      const payload =
        kind === "medical"
          ? { kind, content_medical: medicalForm, files }
          : { kind, content: newPost, files };

      console.log("[CreatePost] payload:", payload);
      setPosting(true);

      const created = await createPost(payload);
      console.log("[CreatePost] created:", created);

      setPosts((prev) => [mapPostToUI(created), ...prev]);

      // reset UI
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
    } catch (e) {
      // const status = e?.response?.status;
      // const data = e?.response?.data;
      // console.error("Create post error:", status, data, e);
      // alert(
      //   `Không đăng được bài. HTTP ${status || ""} ${
      //     data?.detail || data?.error || ""
      //   }`
      // );
      console.error("Create post error:", e);
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "Không thể đăng bài, vui lòng thử lại!";
      toast.error(`❌ ${msg}`);
    } finally {
      setPosting(false);
    }
  };

  // 🖼️ Lightbox
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
  // 🟢 WEBSOCKET - LẮNG NGHE FEED UPDATE
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    // if (websocketService.ws?.readyState !== WebSocket.OPEN) {
    //   console.log("🔌 [Dashboard] Connecting WebSocket...");
    //   websocketService.connect(token);
    // }
    websocketService.disconnect(); // luôn reset WS cũ
    websocketService.connect(token); // luôn tạo WS mới cho mỗi tab

    const handleFeedUpdate = (data) => {
      console.log("📢 [Dashboard] WebSocket feed_update:", data);

      const eventType = data.data?.event || data.type;

      switch (eventType) {
        case "new_comment":
          const { post_id: pid, comment } = data.data || {};
          if (pid && comment) {
            const formattedComment = {
              ...comment,
              time: getTimeAgo(comment.time),
            };
            setComments((prev) => {
              const postComments = prev[pid] || { list: [] };

              const exists = postComments.list.some((c) => c.id === comment.id);
              if (exists) {
                console.log("⚠️ [Dashboard] Comment already exists, skipping");
                return prev;
              }

              console.log("✅ [Dashboard] Adding new comment:", comment.id);

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

        // ✅ Xóa bình luận
        case "delete_comment":
          const { post_id: postId, comment_id: commentId } = data.data || {};
          if (postId && commentId) {
            console.log(
              `🗑️ [Dashboard] Deleting comment ${commentId} from post ${postId}`
            );

            setComments((prev) => {
              const postComments = prev[postId];
              if (!postComments?.list) return prev;

              // Xóa comment (đệ quy để xóa cả replies)
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

        // ✅ Post reaction
        case "post_react":
          const { post_id, reaction_counts, user_id, reaction_type } =
            data.data || {};
          if (post_id) {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === post_id ? { ...p, reaction_counts } : p
              )
            );

            // ✅ Cập nhật reactions nếu là current user
            if (user_id === user?.id) {
              if (reaction_type) {
                setReactions((prev) => ({
                  ...prev,
                  [post_id]: {
                    type: reaction_type,
                    icon: getReactionIcon(reaction_type),
                    label: getReactionLabel(reaction_type),
                  },
                }));
              } else {
                // Xóa reaction nếu reaction_type = null
                setReactions((prev) => {
                  const copy = { ...prev };
                  delete copy[post_id];
                  return copy;
                });
              }
            }
          }
          break;

        // ✅ Comment reaction
        case "comment_react":
          const {
            comment_id: cid,
            post_id: cpid,
            reaction_counts: crc,
          } = data.data || {};
          if (cpid && cid) {
            setComments((prev) => {
              const postComments = prev[cpid];
              if (!postComments?.list) return prev;

              const updateNode = (list) =>
                list.map((n) => {
                  if (n.id === cid) {
                    return { ...n, reaction_counts: crc };
                  }
                  if (n.replies) {
                    return { ...n, replies: updateNode(n.replies) };
                  }
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

        case "new_post":
        case "post_created":
          if (data.data?.post) {
            setPosts((prev) => {
              const exists = prev.some((p) => p.id === data.data.post.id);
              if (exists) return prev;
              return [mapPostToUI(data.data.post), ...prev];
            });
            toast.success("📢 Bài viết mới!");
          }
          break;

        default:
          console.log("⚠️ [Dashboard] Unknown event:", eventType, data);
      }
    };

    console.log("👂 [Dashboard] Registering WebSocket listener");
    websocketService.on("feed_update", handleFeedUpdate);

    return () => {
      console.log("🧹 [Dashboard] Cleaning up WebSocket listener");
      websocketService.off("feed_update", handleFeedUpdate);
    };
  }, [user?.id]);

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
              getTimeAgo={getTimeAgo} // 👈 thêm dòng này
              lightbox={lightbox}
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

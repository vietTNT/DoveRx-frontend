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
const Dashboard = ({ user, onLogout }) => {
  const [posts, setPosts] = useState([]);
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
    const loadData = async () => {
      // 1️⃣ BƯỚC 1: Hiển thị ngay từ Cache (nếu có) để tạo cảm giác "mượt"
      const cachedPosts = loadPostsFromCache();
      if (cachedPosts && cachedPosts.length > 0) {
        console.log(
          `🚀 [Dashboard] Loaded ${cachedPosts.length} posts from Cache`
        );
        setPosts(cachedPosts);
      }

      // 2️⃣ BƯỚC 2: Gọi API lấy dữ liệu mới nhất (Ngầm)
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
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;

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

  // 🟢 Đăng bài — Optimistic UI (Hiển thị trước, gửi sau)
  const handlePost = async () => {
    if (posting) return; // tránh double-click

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

    // 3. Tạo bài viết GIẢ LẬP (Fake Post) để hiển thị ngay
    // Lưu ý: Cấu trúc này phải khớp với những gì PostCard cần để render
    const optimisicPost = {
      id: tempId,
      author: user?.name || "Bạn",
      avatar: user?.avatar, // URL avatar hiện tại
      time: new Date().toISOString(), // Thời gian hiện tại
      content: kind === "medical" ? medicalForm : newPost,
      // Lấy URL preview từ selectedImages để hiển thị ngay
      images: selectedImages.map((img) => ({
        url: img.url,
        type: img.type.startsWith("video") ? "video" : "image",
      })),
      reaction_counts: {},
      comment_count: 0,
      isOptimistic: true, // 🚩 Cờ để đánh dấu đang gửi (dùng để chỉnh CSS mờ đi)
    };

    // 4. CẬP NHẬT UI NGAY LẬP TỨC
    setPosts((prev) => [optimisicPost, ...prev]);

    // 5. Đóng Modal & Reset Form NGAY LẬP TỨC (Người dùng cảm thấy đã xong)
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

    // 6. Gửi API ngầm (Background)
    setPosting(true);
    try {
      const payload =
        kind === "medical"
          ? { kind, content_medical: optimisicPost.content, files }
          : { kind, content: optimisicPost.content, files };

      console.log("[CreatePost] Sending payload...", payload);

      // Gọi API thật
      const created = await createPost(payload);
      console.log("[CreatePost] Success:", created);

      // 7. THAY THẾ bài giả lập bằng bài thật (Update ID thật từ server)
      setPosts((prev) =>
        prev.map((p) => (p.id === tempId ? mapPostToUI(created) : p))
      );
    } catch (e) {
      console.error("Create post error:", e);
      const msg =
        e?.response?.data?.detail || "Không thể đăng bài, vui lòng thử lại!";
      toast.error(`❌ ${msg}`);

      // 8. ROLLBACK: Nếu lỗi thì xóa bài giả lập đi và hoàn tác
      setPosts((prev) => prev.filter((p) => p.id !== tempId));

      // (Optional) Khôi phục lại nội dung vào form để user không phải gõ lại
      if (kind === "normal") {
        setNewPost(
          typeof optimisicPost.content === "string" ? optimisicPost.content : ""
        );
        setIsModalOpen(true); // Mở lại modal
      }
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

    websocketService.disconnect(); // luôn reset WS cũ
    websocketService.connect(token); // luôn tạo WS mới cho mỗi tab

    const handleFeedUpdate = (data) => {
      console.log("📢 [Dashboard] WebSocket feed_update:", data);

      const eventType = data.data?.event || data.type;
      // ====== HANDLE POST REACTIONS ======
      if (
        eventType === "post_react" ||
        eventType === "post_change_react" ||
        eventType === "post_unreact"
      ) {
        const payload = data.data || data;
        const pid = payload.post_id;
        const reactionCounts =
          payload.reaction_counts || payload.reaction_counts;

        if (pid) {
          // Update posts list (counts)
          setPosts((prev) =>
            prev.map((post) =>
              post.id === pid
                ? {
                    ...post,
                    reaction_counts: reactionCounts || post.reaction_counts,
                  }
                : post
            )
          );

          // If event includes user_id and it's current user, update local reactions map
          const uid = payload.user_id;

          // backend may include reaction_type or action
          if (uid && uid === user?.id) {
            // backend may include reaction_type or action
            const rtype = payload.reaction_type || null;
            setReactions((prev) => ({ ...prev, [pid]: rtype }));
          }
        }
        return;
      }

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
        // case "post_react":
        //   const { post_id, reaction_counts, user_id, reaction_type } =
        //     data.data || {};
        //   if (post_id) {
        //     setPosts((prev) =>
        //       prev.map((p) =>
        //         p.id === post_id ? { ...p, reaction_counts } : p
        //       )
        //     );

        //     // ✅ Cập nhật reactions (lưu CHUỖI type) nếu là current user
        //     if (user_id === user?.id) {
        //       if (reaction_type) {
        //         setReactions((prev) => ({ ...prev, [post_id]: reaction_type }));
        //       } else {
        //         setReactions((prev) => {
        //           const copy = { ...prev };
        //           delete copy[post_id];
        //           return copy;
        //         });
        //       }
        //     }
        //   }
        //   break;
        // ✅ Post reaction
        case "post_react":
          const { post_id, reaction_counts, user_id, reaction_type } =
            data.data || {};
          if (post_id) {
            // 1️⃣ Cập nhật posts state (QUAN TRỌNG ĐỂ LƯU CACHE)
            setPosts((prev) =>
              prev.map((p) => {
                if (p.id === post_id) {
                  // Nếu là chính mình react, cập nhật luôn field user_reaction trong post
                  const updatedPost = {
                    ...p,
                    reaction_counts,
                  };

                  if (user_id === user?.id) {
                    // Lưu ý: Key này phải khớp với key mà mapPostToUI hoặc PostCard dùng
                    // Thường là 'user_reaction', 'my_reaction' hoặc 'current_reaction'
                    updatedPost.user_reaction = reaction_type;
                    updatedPost.my_reaction = reaction_type;
                  }
                  return updatedPost;
                }
                return p;
              })
            );

            // 2️⃣ Cập nhật reactions map (Logic cũ giữ nguyên)
            if (user_id === user?.id) {
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
            const incomingPost = data.data.post;

            // ✅ [FIX] Kiểm tra: Nếu bài viết là của chính mình thì BỎ QUA
            // Vì hàm handlePost đã thêm bài này vào state rồi.
            // Lưu ý: user.id có thể là number, incomingPost.author.id có thể là number
            if (incomingPost.author?.id === user?.id) {
              console.log(
                "🚫 [Dashboard] Bỏ qua bài viết từ chính mình (đã xử lý local)"
              );
              break; // Thoát khỏi switch, không chạy setPosts bên dưới
            }

            setPosts((prev) => {
              // ✅ [FIX THÊM] So sánh ID an toàn hơn (ép về String để tránh lỗi 26 !== "26")
              const exists = prev.some(
                (p) => String(p.id) === String(incomingPost.id)
              );

              if (exists) {
                console.log(
                  "⚠️ [Dashboard] Bài viết đã tồn tại:",
                  incomingPost.id
                );
                return prev;
              }

              // Nếu là bài của người khác, thêm vào đầu danh sách
              toast.success(
                `📢 ${incomingPost.author?.name || "Ai đó"} vừa đăng bài mới!`
              );
              return [mapPostToUI(incomingPost), ...prev];
            });
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
  // ✅ FIX: Đồng bộ từ Posts sang Reactions state khi mới load (từ Cache/API)
  useEffect(() => {
    if (posts.length > 0) {
      setReactions((prev) => {
        const newReactions = { ...prev };
        let hasChange = false;

        posts.forEach((p) => {
          // Kiểm tra xem bài viết có lưu reaction của mình không
          // Cần check đúng key mà API trả về (thường là user_reaction, my_reaction, hoặc current_reaction)
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

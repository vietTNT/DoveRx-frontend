import React, { useEffect, useState } from "react";
import PostCard from "../dashboard/PostCard";
import { getPostsByUser } from "../../services/socialApi";
import { mapPostToUI } from "../../utils/mapPost";
import { useTranslation } from "react-i18next";

const UserPostsTab = ({ userId, currentUser }) => {
  const { t } = useTranslation();

  const emojiList = [
    { type: "like", icon: "👍", label: t("reactions.like") },
    { type: "love", icon: "❤️", label: t("reactions.love") },
    { type: "haha", icon: "😂", label: t("reactions.haha") },
    { type: "wow", icon: "😮", label: t("reactions.wow") },
    { type: "sad", icon: "😢", label: t("reactions.sad") },
    { type: "angry", icon: "😡", label: t("reactions.angry") },
  ];

  //1. Hàm tính thời gian
  const getTimeAgo = (dateInput) => {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return t("time.just_now");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("time.mins_ago", { count: minutes });
    const hours = Math.floor(seconds / 3600);
    if (hours < 24) return t("time.hours_ago", { count: hours });
    const days = Math.floor(hours / 24);
    return t("time.days_ago", { count: days });
  };

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});

  //  2. Thêm state quản lý Popup reaction (Tránh lỗi khi hover nút like)
  const [activePopup, setActivePopup] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const data = await getPostsByUser(userId);

        // 1. Trích xuất mảng từ Object phân trang (tránh lỗi .map is not a function)
        const rawPosts = Array.isArray(data) ? data : data.results || [];

        // 2. SỬ DỤNG HÀM mapPostToUI ĐỂ CHUẨN HÓA DỮ LIỆU CHO POSTCARD
        const uiPosts = rawPosts.map(mapPostToUI);

        setPosts(uiPosts); // Set dữ liệu đã chuẩn hóa vào State
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [userId]);

  // 3. Hàm xử lý khi click vào ảnh (Lightbox)
  // Nếu bạn chưa có component Lightbox ở đây, ta có thể để hàm trống hoặc alert tạm
  const openLightbox = (images, index) => {
    console.log("Open lightbox:", images, index);
    // Nếu muốn hiển thị ảnh full màn hình, bạn cần move logic Lightbox từ Dashboard vào đây
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl text-center border border-gray-200 shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          <i className="fas fa-newspaper text-2xl"></i>
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          {t("profile.no_posts_title")}
        </h3>
        <p className="text-gray-500">{t("profile.no_posts_desc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          p={post}
          currentUser={currentUser}
          reactions={reactions}
          setReactions={setReactions}
          comments={comments}
          setComments={setComments}
          emojiList={emojiList}
          // ✅ 4. Truyền các props còn thiếu vào PostCard
          getTimeAgo={getTimeAgo} // Sửa lỗi "getTimeAgo is not a function"
          activePopup={activePopup} // Sửa lỗi khi hover nút Like
          setActivePopup={setActivePopup}
          openLightbox={openLightbox} // Sửa lỗi khi click vào ảnh
        />
      ))}
    </div>
  );
};

export default UserPostsTab;

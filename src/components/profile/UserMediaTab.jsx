import React, { useEffect, useState } from "react";
import { getPostsByUser } from "../../services/socialApi";
import { resolveImageUrl } from "../../utils/imageHelper";

const UserMediaTab = ({ userId }) => {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await getPostsByUser(userId);

        // Trích xuất mảng
        const posts = Array.isArray(response)
          ? response
          : response.results || [];

        const allMedia = [];
        posts.forEach((post) => {
          if (post.images && post.images.length > 0) {
            allMedia.push(...post.images);
          }
        });
        setMediaList(allMedia);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchMedia();
  }, [userId]);

  if (loading)
    return <div className="text-center py-8">Đang tải hình ảnh...</div>;

  if (mediaList.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl text-center border border-gray-200 shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          <i className="fas fa-images text-2xl"></i>
        </div>
        <p className="text-gray-500 font-medium">Chưa có hình ảnh nào.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {mediaList.map((media, idx) => (
        <div
          key={idx}
          className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
        >
          {media.type === "video" ? (
            <video src={media.url} className="w-full h-full object-cover" />
          ) : (
            <img
              src={resolveImageUrl(media.url)}
              alt="media"
              className="w-full h-full object-cover hover:scale-110 transition duration-500"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default UserMediaTab;

import React, { useEffect, useState } from "react";
import { getUserFriends, getFriends } from "../../services/friendApi";
import { Link } from "react-router-dom";
import { resolveImageUrl } from "../../utils/imageHelper";
import { useTranslation } from "react-i18next";
// Component Skeleton tinh gọn
const FriendSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl animate-pulse">
    <div className="w-14 h-14 bg-gray-100 rounded-xl"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-100 rounded w-2/3"></div>
      <div className="h-3 bg-gray-50 rounded w-1/3"></div>
    </div>
  </div>
);

const UserFriendsTab = ({ userId, currentUser }) => {
  const { t } = useTranslation();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true);
        let data;
        if (currentUser && String(userId) === String(currentUser.id)) {
          data = await getFriends();
        } else {
          data = await getUserFriends(userId);
        }

        if (Array.isArray(data)) {
          setFriends(data);
        } else if (data && typeof data === "object") {
          setFriends(data.results || data.friends || data.data || []);
        }
      } catch (error) {
        console.error("❌ Lỗi tải bạn bè:", error);
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchFriends();
  }, [userId, currentUser?.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <FriendSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 shadow-sm">
        <p className="text-gray-400 font-medium">{t("profile.no_friends")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {friends.map((item) => {
        const friend = item.user || item;
        const fId = friend.id || item.id;
        const fName = friend.name || friend.username || t("navbar.role_user");
        const fAvatar = friend.avatar;

        if (!fId) return null;

        return (
          <div
            key={`friend-card-${fId}`}
            className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300"
          >
            {/* Avatar đơn giản, không có chấm xanh */}
            <Link to={`/profile/${fId}`} className="shrink-0">
              <img
                src={resolveImageUrl(fAvatar)}
                alt={fName}
                className="w-14 h-14 rounded-xl object-cover border border-gray-50 shadow-sm group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.src =
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                }}
              />
            </Link>

            {/* Thông tin */}
            <div className="min-w-0 flex-1">
              <Link
                to={`/profile/${fId}`}
                className="font-bold text-gray-800 hover:text-indigo-600 truncate block text-base transition-colors"
              >
                {fName}
              </Link>

              {/* Chỉ hiện bạn chung nếu có, không hiện text thừa */}
              {item.mutual_friends > 0 && (
                <p className="text-xs text-indigo-500 font-medium mt-0.5">
                  {item.mutual_friends} {t("profile.mutual_friends")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserFriendsTab;

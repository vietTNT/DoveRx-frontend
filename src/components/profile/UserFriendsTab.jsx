import React, { useEffect, useState } from "react";
import { getUserFriends } from "../../services/friendApi";
import { Link } from "react-router-dom";
import { resolveImageUrl } from "../../utils/imageHelper";

const UserFriendsTab = ({ userId }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await getUserFriends(userId);
        setFriends(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchFriends();
  }, [userId]);

  if (loading)
    return <div className="text-center py-8">Đang tải danh sách bạn bè...</div>;

  if (friends.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl text-center border border-gray-200 shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          <i className="fas fa-user-friends text-2xl"></i>
        </div>
        <p className="text-gray-500 font-medium">Chưa có bạn bè nào.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm"
        >
          <Link to={`/profile/${friend.id}`} className="shrink-0">
            <img
              src={resolveImageUrl(friend.avatar)}
              alt={friend.name}
              className="w-14 h-14 rounded-full object-cover border border-gray-100"
            />
          </Link>
          <div>
            <Link
              to={`/profile/${friend.id}`}
              className="font-bold text-gray-900 hover:text-blue-600"
            >
              {friend.name || friend.username}
            </Link>
            <p className="text-xs text-gray-500 mt-1">
              {friend.mutual_friends
                ? `${friend.mutual_friends} bạn chung`
                : "Bạn bè"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserFriendsTab;

import React, { useState, useEffect, useRef } from "react";
import "../styles/Navbar.css";
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
import notificationIcon from "../assets/icons/notification.png";
import chat from "../assets/icons/chat.png";
import dove from "../assets/icons/dove.png";
import home from "../assets/icons/home.png";
import friend from "../assets/icons/friend.png";
// ✅ Import friend API functions
import {
  searchUsers,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
} from "../services/friendApi";
const Navbar = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // ✅ THÊM 2 STATE NÀY
  const [friendRequestsOpen, setFriendRequestsOpen] = useState(false); // Trạng thái mở/đóng dropdown
  const [friendRequests, setFriendRequests] = useState([]); // Danh sách lời mời kết bạn
  const [friends, setFriends] = useState([]); // Danh sách bạn bè
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  // 📌 Thêm đoạn này ở đầu component Navbar (sau khi khai báo props hoặc useState)
  const displayName = (() => {
    // Nếu có họ hoặc tên thì ghép lại
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    // Nếu backend có field 'name' thì dùng
    if (user?.name) return user.name;
    // Nếu không thì fallback sang username hoặc email
    if (user?.username) return user.username;
    if (user?.email) return user.email.split("@")[0];
    return "Người dùng"; // fallback cuối cùng
  })();

  // 📌 Đặt ảnh mặc định nếu avatar null hoặc trống
  const avatarUrl =
    user?.avatar && user.avatar !== ""
      ? user.avatar
      : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  // 🧩 Dữ liệu mẫu
  const notifications = [
    {
      id: 1,
      name: "Bác sĩ Lan",
      avatar: "https://cdn-icons-png.flaticon.com/512/194/194938.png",
      text: "Đã đăng bài mới về sức khỏe tim mạch 🩺",
      time: "2 giờ trước",
    },
    {
      id: 2,
      name: "Minh Anh",
      avatar: "https://cdn-icons-png.flaticon.com/512/194/194935.png",
      text: "Đã thích bài viết của bạn ❤️",
      time: "5 giờ trước",
    },
  ];

  const messages = [
    {
      id: 1,
      name: "Bác sĩ Long",
      avatar: "https://cdn-icons-png.flaticon.com/512/194/194939.png",
      text: "Bạn có rảnh để trao đổi không?",
      time: "17 giờ trước",
    },
    {
      id: 2,
      name: "Mỹ Linh",
      avatar: "https://cdn-icons-png.flaticon.com/512/194/194940.png",
      text: "Cảm ơn bạn về chia sẻ hôm qua 🌸",
      time: "1 ngày trước",
    },
  ];
  // Load friend requests
  useEffect(() => {
    const loadFriendRequests = async () => {
      try {
        console.log("📋 Loading friend requests...");
        const requests = await getFriendRequests();
        console.log("✅ Friend requests loaded:", requests);
        setFriendRequests(requests);
      } catch (error) {
        console.error("❌ Error loading friend requests:", error);
      }
    };

    if (user) {
      loadFriendRequests();

      // ✅ Auto refresh mỗi 30 giây
      const interval = setInterval(loadFriendRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Chấp nhận lời mời kết bạn
  // ✅ THAY THẾ FUNCTION handleAccept
  const handleAccept = async (fromUserId, e) => {
    // Ngăn event bubble lên parent
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    console.log("👥 [Navbar] Accepting friend request from user:", fromUserId);

    try {
      // 1️⃣ Gọi API chấp nhận
      console.log("📤 [Navbar] Calling acceptFriendRequest API...");
      const result = await acceptFriendRequest(fromUserId);
      console.log("✅ [Navbar] API response:", result);

      // 2️⃣ Xóa lời mời khỏi danh sách
      console.log("🗑️ [Navbar] Removing request from list...");
      setFriendRequests((prev) =>
        prev.filter((req) => req.from_user.id !== fromUserId)
      );

      // 3️⃣ Reload toàn bộ danh sách bạn bè từ backend
      console.log("🔄 [Navbar] Reloading friends list...");
      const updatedFriends = await getFriends();
      console.log("✅ [Navbar] Updated friends:", updatedFriends);

      // 4️⃣ Dispatch event để SidebarRight cập nhật
      console.log("📢 [Navbar] Dispatching friendsUpdated event...");
      window.dispatchEvent(
        new CustomEvent("friendsUpdated", {
          detail: { friends: updatedFriends },
        })
      );
      console.log("✅ [Navbar] Event dispatched successfully");

      // 5️⃣ Thông báo thành công
      alert(
        `✅ Đã chấp nhận lời mời kết bạn từ ${
          result.friend?.name || "người dùng"
        }!\n\nBạn có thể chat với họ trong danh sách "Bạn bè" bên phải.`
      );
    } catch (error) {
      console.error("❌ [Navbar] Error accepting friend request:", error);
      console.error("❌ [Navbar] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response?.status === 404) {
        alert("❌ Lời mời kết bạn không tồn tại hoặc đã bị xóa");
        // Xóa khỏi danh sách nếu không tồn tại
        setFriendRequests((prev) =>
          prev.filter((req) => req.from_user.id !== fromUserId)
        );
      } else if (error.response?.status === 401) {
        alert("❌ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        // Redirect to login
        window.location.href = "/login";
      } else {
        alert(
          `❌ Không thể chấp nhận lời mời.\n\nLỗi: ${
            error.response?.data?.error || error.message
          }`
        );
      }
    }
  };

  // ✅ THAY THẾ FUNCTION handleReject
  const handleReject = async (fromUserId, e) => {
    // Ngăn event bubble lên parent
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    console.log("❌ [Navbar] Rejecting friend request from user:", fromUserId);

    try {
      // Xác nhận trước khi từ chối
      const friendRequest = friendRequests.find(
        (req) => req.from_user.id === fromUserId
      );

      const confirmReject = window.confirm(
        `Bạn có chắc muốn từ chối lời mời kết bạn từ ${
          friendRequest?.from_user.name || "người dùng này"
        }?`
      );

      if (!confirmReject) {
        console.log("⏸️ [Navbar] User cancelled rejection");
        return;
      }

      // Gọi API từ chối
      console.log("📤 [Navbar] Calling rejectFriendRequest API...");
      await rejectFriendRequest(fromUserId);
      console.log("✅ [Navbar] Friend request rejected");

      // Xóa khỏi danh sách lời mời
      setFriendRequests((prev) =>
        prev.filter((req) => req.from_user.id !== fromUserId)
      );

      alert("✅ Đã từ chối lời mời kết bạn");
    } catch (error) {
      console.error("❌ [Navbar] Error rejecting friend request:", error);
      console.error("❌ [Navbar] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response?.status === 404) {
        alert("❌ Lời mời kết bạn không tồn tại hoặc đã bị xóa");
        setFriendRequests((prev) =>
          prev.filter((req) => req.from_user.id !== fromUserId)
        );
      } else {
        alert("❌ Không thể từ chối lời mời. Vui lòng thử lại.");
      }
    }
  };
  // ✅ Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    // Clear timeout cũ
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set timeout mới (debounce 500ms)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // ✅ Click vào user trong search results
  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
    setShowSearchDropdown(false);
    setSearchQuery("");
  };
  // Đóng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
        setNotifOpen(false);
        setChatOpen(false);
        setFriendRequestsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) alert(`🔍 Kết quả tìm kiếm: "${searchQuery}"`);
  };

  const handleProfileClick = () => navigate("/profile");

  return (
    <nav className="navbar">
      {/* ✅ Logo + Thanh tìm kiếm bên trái */}
      <div className="navbar-left">
        <div className="logo-section" onClick={() => navigate("/dashboard")}>
          <img src={logo} alt="logo" className="navbar-logo" />
          <h1 className="navbar-title">DoveRx</h1>
        </div>

        {/* <form className="navbar-search" onSubmit={handleSearchSubmit}>
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form> */}
        {/* ✅ Search với dropdown results */}
        <div className="search-wrapper">
          <form className="navbar-search" onSubmit={handleSearchSubmit}>
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Tìm kiếm bạn bè..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() =>
                searchResults.length > 0 && setShowSearchDropdown(true)
              }
            />
          </form>

          {/* ✅ Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="search-dropdown">
              {searchLoading ? (
                <div className="search-loading">Đang tìm kiếm...</div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="search-header">Kết quả tìm kiếm</div>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="search-result-item"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <img
                        src={
                          user.avatar ||
                          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                        }
                        alt={user.name}
                      />
                      <div className="search-result-info">
                        <strong>{user.name}</strong>
                        <span>
                          {user.role === "doctor"
                            ? "👨‍⚕️ Bác sĩ"
                            : "👤 Người dùng"}
                        </span>
                      </div>
                      {user.friendship_status === "accepted" && (
                        <span className="badge-friend">✓ Bạn bè</span>
                      )}
                      {user.friendship_status === "pending" && (
                        <span className="badge-pending">⏳ Đã gửi</span>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="search-empty">Không tìm thấy kết quả</div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* ✅ Navbar Center: 2 Icon ở giữa */}
      <div className="navbar-center">
        <button
          className={`nav-icon-btn ${activeTab === "home" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("home");
            navigate("/dashboard");
          }}
        >
          {/* ✅ Thay <i> bằng <img> icon home của bạn */}
          <img src={home} alt="Home" className="home-icon" />
        </button>

        <button
          className={`nav-icon-btn ${activeTab === "dove" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("dove");
            navigate("/dove-community");
          }}
        >
          <img src={dove} alt="dove" className="dove-icon" />
        </button>
        <div className="icon-wrapper friend-requests-wrapper" ref={dropdownRef}>
          <button
            className={`nav-icon-btn ${activeTab === "friend" ? "active" : ""}`}
            onClick={() => {
              console.log("👥 Friend button clicked");
              setFriendRequestsOpen(!friendRequestsOpen);
              setNotifOpen(false);
              setChatOpen(false);
              setMenuOpen(false);
            }}
          >
            <img src={friend} alt="Friend Requests" className="friend-icon" />

            {/* ✅ Badge hiển thị số lượng lời mời */}
            {friendRequests.length > 0 && (
              <span className="friend-badge">{friendRequests.length}</span>
            )}
          </button>

          {/* ✅ DROPDOWN MENU */}
          {friendRequestsOpen && (
            <div className="popup-menu friend-requests-menu">
              <h4>Lời mời kết bạn ({friendRequests.length})</h4>

              {friendRequests.length > 0 ? (
                friendRequests.map((req) => {
                  console.log(
                    "🟢 Rendering friend request item:",
                    req.id,
                    req.from_user.name
                  ); // ✅ THÊM LOG NÀY

                  return (
                    <div key={req.id} className="friend-request-item">
                      {/* Avatar */}
                      <img
                        src={
                          req.from_user.avatar ||
                          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                        }
                        alt={req.from_user.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${req.from_user.id}`);
                          setFriendRequestsOpen(false);
                        }}
                        style={{ cursor: "pointer" }}
                      />

                      {/* Thông tin */}
                      <div className="friend-request-info">
                        <strong
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${req.from_user.id}`);
                            setFriendRequestsOpen(false);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {req.from_user.name}
                        </strong>
                        <span>
                          {new Date(req.created_at).toLocaleDateString("vi-VN")}
                        </span>

                        {/* ✅ BUTTONS - KIỂM TRA KỸ ĐOẠN NÀY */}
                        <div className="friend-request-actions">
                          <button
                            type="button"
                            className="btn-accept"
                            onMouseDown={(e) => {
                              // ✅ Dùng onMouseDown thay vì onClick
                              e.preventDefault();
                              e.stopPropagation();

                              handleAccept(req.from_user.id, e);
                            }}
                          >
                            ✓ Chấp nhận
                          </button>

                          <button
                            type="button"
                            className="btn-reject"
                            onMouseDown={(e) => {
                              // ✅ Dùng onMouseDown thay vì onClick
                              e.preventDefault();
                              e.stopPropagation();

                              handleReject(req.from_user.id, e);
                            }}
                          >
                            ✗ Từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty">Không có lời mời kết bạn</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="navbar-right" ref={dropdownRef}>
        {/* 🔔 Thông báo */}
        <div className="icon-wrapper notification-wrapper">
          {/* Thay <i> bằng <img> hoặc <svg> */}
          <img
            src={notificationIcon}
            alt="Thông báo"
            className="custom-icon notification-icon"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setChatOpen(false);
              setMenuOpen(false);
            }}
          />
          {/* Tooltip hiển thị "Thông báo" */}
          <span className="icon-tooltip">Thông báo</span>

          {notifOpen && (
            <div className="popup-menu">
              <h4>Thông báo</h4>
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="popup-item">
                    <img src={n.avatar} alt={n.name} />
                    <div className="popup-text">
                      <strong>{n.name}</strong>
                      <p>{n.text}</p>
                      <span>{n.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty">Không có thông báo</p>
              )}
            </div>
          )}
        </div>

        {/* 💬 Tin nhắn */}
        <div className="icon-wrapper  chat-wrapper">
          <img
            src={chat}
            alt="Tin nhắn"
            className="fas fa-comment-dots chat-icon"
            onClick={() => {
              setChatOpen(!chatOpen);
              setNotifOpen(false);
              setMenuOpen(false);
            }}
          ></img>
          {/* Tooltip hiển thị "Tin nhắn" */}
          <span className="icon-tooltip">Tin nhắn</span>
          {chatOpen && (
            <div className="popup-menu">
              <h4>Tin nhắn</h4>
              {messages.length > 0 ? (
                messages.map((m) => (
                  <div key={m.id} className="popup-item">
                    <img src={m.avatar} alt={m.name} />
                    <div className="popup-text">
                      <strong>{m.name}</strong>
                      <p>{m.text}</p>
                      <span>{m.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty">Không có tin nhắn</p>
              )}
            </div>
          )}
        </div>

        {/* Avatar người dùng */}
        {user && (
          <div className="user-section">
            <img
              src={avatarUrl}
              alt="avatar"
              className="user-avatar"
              onClick={() => {
                setMenuOpen(!menuOpen);
                setNotifOpen(false);
                setChatOpen(false);
              }}
            />

            {menuOpen && (
              <div className="dropdown-menu">
                <p>
                  👋 <strong>{displayName}</strong>
                </p>

                <p className="user-role">
                  {user.role === "doctor"
                    ? "👨‍⚕️ Bác sĩ"
                    : user.role === "admin"
                    ? "🛠️ Quản trị viên"
                    : "👤 Người dùng"}
                </p>
                <hr />
                <button onClick={handleProfileClick} className="profile-btn">
                  Hồ sơ cá nhân
                </button>
                <button onClick={onLogout} className="logout-btn">
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

import React, { useState, useEffect, useRef } from "react";
import "../styles/Navbar.css";
import logo from "../assets/logo_3.png";
import { useNavigate, useLocation } from "react-router-dom";
import notificationIcon from "../assets/icons/notification.png";
import chatIconImg from "../assets/icons/chat.png";
import dove from "../assets/icons/dove.png";
import home from "../assets/icons/home.png";
import friend from "../assets/icons/friend.png";
import websocketService from "../services/websocket";

import { fetchConversations, markAsRead } from "../services/chatApi";
import {
  searchUsers,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
} from "../services/friendApi";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/socialApi";
import thongbaosound from "../assets/MP3/thongbao.mp3";

const NOTIF_SOUND_URL = thongbaosound;

const Navbar = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // State Tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const [activeTab, setActiveTab] = useState("home");
  const [friendRequestsOpen, setFriendRequestsOpen] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);

  // State Thông báo
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // State Chat
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatNotifications, setChatNotifications] = useState([]);

  // State Bạn bè & Ref
  const [friends, setFriends] = useState([]);
  const friendsRef = useRef([]);

  // Audio Ref
  const audioRef = useRef(new Audio(NOTIF_SOUND_URL));

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const resolveAvatar = (url) => {
    if (!url) return "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    if (url.startsWith("http")) return url;
    const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : `/${url}`}`;
  };

  const displayName = user?.name || user?.username || "Người dùng";
  const avatarUrl = resolveAvatar(user?.avatar);

  // HÀM PHÁT ÂM THANH
  const playSound = () => {
    try {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.8;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {}); // Bỏ qua lỗi autoplay nếu chưa tương tác
      }
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // ===========================
  // 1. LOAD DỮ LIỆU TỪ DATABASE
  // ===========================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const friendsList = await getFriends();
        setFriends(friendsList);

        const data = await getNotifications();
        const formatted = data.map((n) => ({
          id: n.id,
          type: n.notification_type,
          text: n.text,
          avatar: resolveAvatar(n.sender.avatar),
          time: new Date(n.created_at).toLocaleString("vi-VN"),
          isRead: n.is_read,
          postId: n.post,
          commentId: n.comment,
          senderId: n.sender.id,
        }));
        setNotifications(formatted);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      }
    };

    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications]);
  // ===========================
  //  LOAD LỊCH SỬ TIN NHẮN
  // ===========================
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        if (!user) return;

        const conversations = await fetchConversations();

        // Map để lưu danh sách duy nhất theo senderId
        const uniqueChatsMap = new Map();
        let totalUnread = 0;

        conversations.forEach((conv) => {
          if (conv.last_message) {
            const msg = conv.last_message;
            const partner =
              conv.participants.find((p) => String(p.id) !== String(user.id)) ||
              {};
            const partnerId = String(partner.id);

            // Xử lý nội dung hiển thị
            let previewText = msg.text;
            if (!previewText && msg.attachment) {
              if (msg.attachment.type === "image")
                previewText = "Đã gửi một ảnh";
              else if (msg.attachment.type === "video")
                previewText = "Đã gửi một video";
              else previewText = "Đã gửi một tệp đính kèm";
            }

            let unread = conv.unread_count || 0;
            if (String(msg.sender.id) === String(user.id)) {
              unread = 0;
            }
            // Nếu người này ĐÃ CÓ trong danh sách -> Cập nhật nếu tin này mới hơn
            if (uniqueChatsMap.has(partnerId)) {
              const existing = uniqueChatsMap.get(partnerId);
              // Cộng dồn số lượng chưa đọc (nếu backend tách conversation, ta gộp lại)
              existing.unreadCount += unread;

              // Nếu tin này mới hơn tin đang lưu -> Ghi đè nội dung
              if (new Date(msg.created_at) > new Date(existing.originalTime)) {
                existing.text = previewText;
                existing.time = new Date(msg.created_at).toLocaleString(
                  "vi-VN"
                );
                existing.originalTime = msg.created_at;
                existing.isRead = existing.unreadCount === 0;
              }
            } else {
              // Nếu chưa có -> Thêm mới
              uniqueChatsMap.set(partnerId, {
                id: `msg_${msg.id}`,
                conversationId: conv.id,
                senderId: partnerId,
                sender_name: partner.name || "Người dùng",
                avatar: resolveAvatar(partner.avatar),
                text: previewText || "Tin nhắn mới",
                time: new Date(msg.created_at).toLocaleString("vi-VN"),
                originalTime: msg.created_at, // Dùng để so sánh
                unreadCount: unread,
                isRead: unread === 0,
              });

              // Cộng vào tổng số badge đỏ trên thanh Navbar (chỉ đếm số người chưa đọc)
              if (unread > 0) totalUnread++;
            }
          }
        });

        // Chuyển Map thành Mảng và set state
        setChatNotifications(Array.from(uniqueChatsMap.values()));
        setUnreadChatCount(totalUnread);
      } catch (error) {
        console.error("❌ [Navbar] Lỗi tải tin nhắn:", error);
      }
    };

    loadChatHistory();
  }, [user]);
  // ===========================
  // 2. XỬ LÝ CLICK THÔNG BÁO
  // ===========================
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      markNotificationRead(notif.id).catch((err) => console.error(err));
    }

    setNotifOpen(false);

    if (notif.postId) {
      if (location.pathname === "/dashboard") {
        window.dispatchEvent(
          new CustomEvent("open_post_notification", {
            detail: { postId: notif.postId, commentId: notif.commentId },
          })
        );
      } else {
        navigate("/dashboard");
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("open_post_notification", {
              detail: { postId: notif.postId, commentId: notif.commentId },
            })
          );
        }, 500);
      }
    }
  };

  // ===========================
  // 3. WEBSOCKET
  // ===========================
  useEffect(() => {
    if (!user) return;

    const handleSocketEvent = (data) => {
      const msgType = data.type;
      const payload = data.data;
      const eventType = payload?.event || data.event || data.type;
      console.log("🔥 Navbar nhận socket:", eventType, payload); // Debug xem có nhận ko
      //  LỜI MỜI KẾT BẠN MỚI
      if (eventType === "friend_request_received") {
        console.log("🔔 Có lời mời kết bạn mới:", payload);

        const newRequest =
          payload.request_data || payload.data?.request_data || payload;
        if (!newRequest || !newRequest.id) {
          console.warn(
            "❌ [DEBUG] Dữ liệu request không hợp lệ (Thiếu ID):",
            newRequest
          );
          return;
        }
        setFriendRequests((prev) => {
          // Log để kiểm tra danh sách hiện tại
          console.log("📋 [DEBUG] Danh sách cũ:", prev);

          // 3. Chống trùng lặp (Ép kiểu String để so sánh chính xác)
          const isExist = prev.some(
            (req) => String(req.id) === String(newRequest.id)
          );

          if (isExist) {
            console.log("⚠️ [DEBUG] Request này đã tồn tại, bỏ qua.");
            return prev;
          }

          // 4. Phát âm thanh & Cập nhật State
          console.log("✅ [DEBUG] Đang thêm vào danh sách hiển thị!");
          playSound();

          // Đưa lên đầu danh sách
          return [newRequest, ...prev];
        });

        return;
      }
      //  NHẬN THÔNG BÁO CHÍNH THỨC TỪ DB (Notification)
      if (msgType === "notification") {
        if (eventType === "friend_request_received" || !payload.sender) {
          return;
        }
        const newNotif = {
          id: payload.id,
          type: payload.type,
          text: payload.text,
          avatar: resolveAvatar(payload.sender.avatar),
          time: "Vừa xong",
          isRead: false,
          postId: payload.post_id,
          commentId: payload.comment_id,
          senderId: payload.sender.id,
        };

        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          playSound();
          return [newNotif, ...prev];
        });
        return;
      }

      //  BÀI VIẾT MỚI (Vì Backend chưa lưu cái này vào Notification DB)
      if (eventType === "new_post" || eventType === "post_created") {
        const incomingPost = payload.post;
        const isFriend = (id) =>
          friendsRef.current.some(
            (f) =>
              String(f.id) === String(id) || String(f.user?.id) === String(id)
          );

        if (
          incomingPost &&
          String(incomingPost.author?.id) !== String(user.id) &&
          isFriend(incomingPost.author?.id)
        ) {
          const newNotif = {
            id: `new_post_${incomingPost.id}`,
            type: "new_post",
            text: `${incomingPost.author?.name} vừa đăng một bài viết mới.`,
            avatar: resolveAvatar(incomingPost.author?.avatar),
            time: "Vừa xong",
            link: `/dashboard`,
            isRead: false,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            playSound();
            return [newNotif, ...prev];
          });
        }
      }
    };
    websocketService.on("friend_request_received", handleSocketEvent);
    websocketService.on("notification", handleSocketEvent);
    // websocketService.on("feed_update", handleSocketEvent);

    return () => {
      websocketService.off("friend_request_received", handleSocketEvent);
      websocketService.off("notification", handleSocketEvent);
      // websocketService.off("feed_update", handleSocketEvent);
    };
  }, [user]);

  // 4. LOGIC TIN NHẮN (CHAT) - Realtime cập nhật số lượng
  useEffect(() => {
    const handleChatMessage = (event) => {
      const data = event.detail;
      const msg = data.message || {};
      const senderObj = msg.sender || {};
      const senderId = String(senderObj.id || data.sender_id);
      const currentUserId = String(user.id);
      if (senderId === currentUserId) {
        return;
      }

      if (!chatOpen) {
        playSound();

        setChatNotifications((prev) => {
          // 1. Tìm tin nhắn cũ của người này
          const existingIndex = prev.findIndex(
            (n) => String(n.senderId) === senderId
          );
          const existingChat = prev[existingIndex];

          // 2. Tính số lượng mới (Cộng dồn)
          const newCount = (existingChat?.unreadCount || 0) + 1;
          if (!existingChat || existingChat.unreadCount === 0) {
            setUnreadChatCount((c) => c + 1);
          }
          let previewText = msg.text;
          if (!previewText && msg.attachment) {
            if (msg.attachment.type === "image") previewText = "Đã gửi một ảnh";
            else if (msg.attachment.type === "video")
              previewText = "Đã gửi một video";
            else previewText = "Đã gửi một tệp";
          }
          // 4. Tạo object mới (đưa lên đầu)
          const newChatNotif = {
            id: `msg_${msg.id || Date.now()}`,
            senderId: senderId,
            sender_name: senderObj.name || "Người dùng",
            avatar: resolveAvatar(senderObj.avatar),
            text: msg.text || "Đã gửi một tin nhắn",
            time: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isRead: false,
            unreadCount: newCount,
          };

          // 5. Lọc bỏ cái cũ, thêm cái mới vào đầu
          const otherChats = prev.filter(
            (n) => String(n.senderId) !== senderId
          );
          return [newChatNotif, ...otherChats];
        });
      }
    };

    window.addEventListener("chat:new_message", handleChatMessage);
    return () =>
      window.removeEventListener("chat:new_message", handleChatMessage);
  }, [user, chatOpen]);
  // TỰ ĐỘNG CẬP NHẬT SỐ LƯỢNG TIN NHẮN CHƯA ĐỌC
  useEffect(() => {
    setUnreadChatCount(
      chatNotifications.filter((n) => n.unreadCount > 0).length
    );
  }, [chatNotifications]);
  // ===========================
  // HANDLERS UI
  // ===========================
  const handleToggleNotif = async () => {
    setNotifOpen(!notifOpen);
    setChatOpen(false);
    setMenuOpen(false);
    setFriendRequestsOpen(false);

    if (!notifOpen && unreadCount > 0) {
      // Gọi API đánh dấu tất cả là đã đọc trên Server
      try {
        await markAllNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleToggleChat = () => {
    setChatOpen(!chatOpen);
    setNotifOpen(false);
    setMenuOpen(false);
  };

  // ... Logic Search & Friend Request ...
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setSearchLoading(true);
    setShowSearchDropdown(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results || []);
      } catch (error) {
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery]);

  useEffect(() => {
    if (user)
      getFriendRequests()
        .then((r) => setFriendRequests(r))
        .catch((e) => {});
  }, [user]);

  const handleAccept = async (id, e) => {
    if (e) e.stopPropagation();
    await acceptFriendRequest(id);
    setFriendRequests((p) => p.filter((r) => r.from_user.id !== id));
    const f = await getFriends();
    setFriends(f);
    window.dispatchEvent(
      new CustomEvent("friendsUpdated", { detail: { friends: f } })
    );
    alert("Đã chấp nhận");
  };
  const handleReject = async (id, e) => {
    if (e) e.stopPropagation();
    await rejectFriendRequest(id);
    setFriendRequests((p) => p.filter((r) => r.from_user.id !== id));
  };
  const handleUserClick = (id) => {
    navigate(`/profile/${id}`);
    setShowSearchDropdown(false);
    setSearchQuery("");
  };
  const handleProfileClick = () => navigate("/profile");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
        setNotifOpen(false);
        setChatOpen(false);
        setFriendRequestsOpen(false);
        if (!e.target.closest(".search-wrapper")) setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleChatClick = async (chatItem) => {
    setChatOpen(false);
    if (chatItem.unreadCount > 0) {
      // Trừ badge tổng đi 1 (vì tính theo số người nhắn)
      setUnreadChatCount((prev) => Math.max(0, prev - 1));

      // Reset số lượng của người này về 0 trong danh sách hiển thị
      setChatNotifications((prev) =>
        prev.map((item) =>
          String(item.senderId) === String(chatItem.senderId)
            ? { ...item, isRead: true, unreadCount: 0 }
            : item
        )
      );
    }

    // --- XỬ LÝ LOGIC MỞ CHAT ---
    const friendInfo = friendsRef.current.find(
      (f) =>
        String(f.id) === String(chatItem.senderId) ||
        String(f.user?.id) === String(chatItem.senderId)
    );

    const contactToOpen = friendInfo || {
      id: chatItem.senderId,
      name: chatItem.sender_name,
      avatar: chatItem.avatar,
    };

    window.dispatchEvent(
      new CustomEvent("open_chat_with_contact", {
        detail: contactToOpen,
      })
    );

    // Gọi API báo cho Backend biết là "Tôi đã đọc tin nhắn của người này rồi"
    if (chatItem.unreadCount > 0 && chatItem.conversationId) {
      try {
        await markAsRead(chatItem.conversationId);
        console.log(
          "✅ Đã đánh dấu đã đọc conversation:",
          chatItem.conversationId
        );
      } catch (error) {
        console.error("❌ Lỗi khi đánh dấu đã đọc:", error);
      }
    }
  };
  return (
    <nav className="navbar">
      {/* LEFT */}
      <div className="navbar-left">
        <div
          className="logo-section"
          onClick={() => {
            window.scrollTo(0, 0);
            window.location.href = "/dashboard";
          }}
        >
          <img src={logo} alt="logo" className="navbar-logo" />
          <h1 className="navbar-title  hide-on-mobile">DoveRx</h1>
        </div>
        <div className="search-wrapper">
          <form className="navbar-search">
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
          {showSearchDropdown && (
            <div className="search-dropdown">
              {searchLoading ? (
                <div className="search-loading">Đang tìm kiếm...</div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="search-header">Kết quả tìm kiếm</div>
                  {searchResults.map((u) => {
                    const isFriend = friendsRef.current.some(
                      (f) =>
                        String(f.id) === String(u.id) ||
                        String(f.user?.id) === String(u.id)
                    );
                    return (
                      <div
                        key={u.id}
                        className="search-result-item"
                        onClick={() => handleUserClick(u.id)}
                      >
                        <img src={resolveAvatar(u.avatar)} alt={u.name} />
                        <div className="search-result-info">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <strong>{u.name}</strong>
                            {isFriend && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#42b72a",
                                  fontWeight: "600",
                                }}
                              >
                                ✓ Bạn bè
                              </span>
                            )}
                          </div>
                          <span>
                            {u.role === "doctor"
                              ? "👨‍⚕️ Bác sĩ"
                              : "👤 Người dùng"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="search-empty">Không tìm thấy kết quả</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER */}
      <div className="navbar-center">
        <button
          className={`nav-icon-btn hide-on-mobile ${
            activeTab === "home" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("home");
            navigate("/dashboard");
          }}
        >
          <img src={home} className="home-icon" alt="home" />
        </button>
        <button
          className={`nav-icon-btn hide-on-mobile ${
            activeTab === "dove" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("dove");
            // navigate("/dove-community");
          }}
        >
          <img src={dove} className="dove-icon" alt="dove" />
        </button>
      </div>

      {/* RIGHT */}
      <div className="navbar-right" ref={dropdownRef}>
        <div className="icon-wrapper friend-requests-wrapper">
          <button
            className={`nav-icon-btn ${activeTab === "friend" ? "active" : ""}`}
            onClick={() => {
              setFriendRequestsOpen(!friendRequestsOpen);
              setNotifOpen(false);
              setChatOpen(false);
              setMenuOpen(false);
            }}
          >
            <img src={friend} className="friend-icon" alt="friend" />
            {friendRequests.length > 0 && (
              <span className="friend-badge">{friendRequests.length}</span>
            )}
          </button>
          {friendRequestsOpen && (
            <div className="popup-menu friend-requests-menu">
              <h4>Lời mời kết bạn ({friendRequests.length})</h4>
              {friendRequests.length > 0 ? (
                friendRequests.map((req) => (
                  <div key={req.id} className="friend-request-item">
                    <img
                      src={resolveAvatar(req.from_user.avatar)}
                      alt={req.from_user.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${req.from_user.id}`);
                        setFriendRequestsOpen(false);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    <div className="friend-request-info">
                      <strong
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${req.from_user.id}`);
                          setFriendRequestsOpen(false);
                        }}
                      >
                        {req.from_user.name}
                      </strong>
                      <span>
                        {new Date(req.created_at).toLocaleDateString("vi-VN")}
                      </span>
                      <div className="friend-request-actions">
                        <button
                          className="btn-accept"
                          onMouseDown={(e) => handleAccept(req.from_user.id, e)}
                        >
                          ✓ Chấp nhận
                        </button>
                        <button
                          className="btn-reject"
                          onMouseDown={(e) => handleReject(req.from_user.id, e)}
                        >
                          ✗ Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty">Không có lời mời kết bạn</p>
              )}
            </div>
          )}
        </div>
        <div className="icon-wrapper notification-wrapper">
          <img
            src={notificationIcon}
            className="custom-icon notification-icon"
            onClick={handleToggleNotif}
            alt=""
          />
          {unreadCount > 0 && <span className="icon-badge">{unreadCount}</span>}
          <span className="icon-tooltip">Thông báo</span>
          {notifOpen && (
            <div className="popup-menu">
              <h4>Thông báo</h4>
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`popup-item ${!n.isRead ? "unread" : ""}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <img src={n.avatar} alt="avatar" />
                    <div className="popup-text">
                      <p style={{ fontSize: "14px", margin: 0 }}>{n.text}</p>
                      <span style={{ fontSize: "12px", color: "#1877f2" }}>
                        {n.time}
                      </span>
                    </div>
                    {!n.isRead && (
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#1877f2",
                        }}
                      ></div>
                    )}
                  </div>
                ))
              ) : (
                <p className="empty">Không có thông báo mới</p>
              )}
            </div>
          )}
        </div>

        <div className="icon-wrapper chat-wrapper">
          <img
            src={chatIconImg}
            className="fas fa-comment-dots chat-icon"
            onClick={handleToggleChat}
            alt=""
          />
          {unreadChatCount > 0 && (
            <span className="icon-badge">{unreadChatCount}</span>
          )}
          <span className="icon-tooltip">Tin nhắn</span>
          {chatOpen && (
            <div className="popup-menu">
              <h4>Tin nhắn</h4>
              {chatNotifications.length > 0 ? (
                chatNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="popup-item"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleChatClick(n)}
                  >
                    <img src={n.avatar} alt="avatar" />
                    <div className="popup-text">
                      <strong>{n.sender_name}</strong>
                      <p
                        className="truncate-text"
                        style={{ maxWidth: "180px" }}
                      >
                        {n.text}
                      </p>
                      <span>{n.time}</span>
                    </div>

                    {/*HIỂN THỊ SỐ LƯỢNG TIN NHẮN CHƯA ĐỌC */}
                    {n.unreadCount > 0 && (
                      <div className="message-badge">
                        {n.unreadCount > 99 ? "99+" : n.unreadCount}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="empty">Không có tin nhắn mới</p>
              )}
            </div>
          )}
        </div>

        {user && (
          <div className="user-section">
            <img
              src={avatarUrl}
              className="user-avatar"
              onClick={() => {
                setMenuOpen(!menuOpen);
                setNotifOpen(false);
                setChatOpen(false);
              }}
              alt="User Avatar"
            />
            {menuOpen && (
              <div className="dropdown-menu">
                <p>
                  👋 <strong>{displayName}</strong>
                </p>
                <p className="user-role">
                  {user.role === "doctor" ? "👨‍⚕️ Bác sĩ" : "👤 Người dùng"}
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

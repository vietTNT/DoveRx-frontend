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
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./language/LanguageSwitcher";
import Chatbot from "../components/Chat/Chatbot";
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
import searchIconImg from "../assets/icons/search.png";
import mapIcon from "../assets/icons/map.png";
import aiIcon from "../assets/icons/dove-ai.png";
const NOTIF_SOUND_URL = thongbaosound;

const Navbar = ({ user, onLogout }) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // --- 🔥 SỬA LỖI AVATAR: Thêm state riêng để quản lý ảnh đại diện ---
  const [currentAvatar, setCurrentAvatar] = useState(user?.avatar);

  // State Tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  // const [activeTab, setActiveTab] = useState("home");
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

  const avatarUrl = resolveAvatar(currentAvatar);

  // ===========================
  // AI CHATBOT
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  useEffect(() => {
    if (location.pathname === "/dashboard") setActiveTab("home");
    else if (location.pathname === "/health-map") setActiveTab("map");
    else if (location.pathname === "/friends") setActiveTab("friend"); // Ví dụ thêm
  }, [location.pathname]);
  // 1. Cập nhật khi props user thay đổi (lúc mới login hoặc F5)
  useEffect(() => {
    setCurrentAvatar(user?.avatar);
  }, [user]);

  // 2. Lắng nghe sự kiện "user:updated" từ trang Profile bắn sang (lúc vừa đổi ảnh xong)
  useEffect(() => {
    const handleUserUpdate = (e) => {
      if (e.detail && e.detail.user) {
        // Cập nhật ngay lập tức với URL mới (bao gồm cả blob URL tạm thời)
        setCurrentAvatar(e.detail.user.avatar);
      }
    };
    window.addEventListener("user:updated", handleUserUpdate);
    return () => window.removeEventListener("user:updated", handleUserUpdate);
  }, []);

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
          senderName: n.sender.name,
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
            if (!previewText && (msg.post || msg.post_data)) {
              previewText = "Đã chia sẻ một bài viết"; // Hoặc t("chat.shared_post")
            }
            if (!previewText && msg.attachment) {
              if (msg.attachment.type === "image")
                previewText = t("chat.sent_image");
              else if (msg.attachment.type === "video")
                previewText = t("chat.sent_video");
              else previewText = t("chat.sent_file");
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
                  "vi-VN",
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
                sender_name: partner.name || t("user_profile.not_updated"),
                avatar: resolveAvatar(partner.avatar),
                text: previewText || t("chat.sent_message"),
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
  }, [user, t]);
  // ===========================
  // 2. XỬ LÝ CLICK THÔNG BÁO
  // ===========================
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      markNotificationRead(notif.id).catch((err) => console.error(err));
    }

    setNotifOpen(false);

    if (notif.postId) {
      if (location.pathname === "/dashboard") {
        window.dispatchEvent(
          new CustomEvent("open_post_notification", {
            detail: { postId: notif.postId, commentId: notif.commentId },
          }),
        );
      } else {
        navigate("/dashboard");
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("open_post_notification", {
              detail: { postId: notif.postId, commentId: notif.commentId },
            }),
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

      //  LỜI MỜI KẾT BẠN MỚI
      if (eventType === "friend_request_received") {
        const newRequest =
          payload.request_data || payload.data?.request_data || payload;
        if (!newRequest || !newRequest.id) {
          console.warn(
            "❌ [DEBUG] Dữ liệu request không hợp lệ (Thiếu ID):",
            newRequest,
          );
          return;
        }
        setFriendRequests((prev) => {
          // Log để kiểm tra danh sách hiện tại

          // 3. Chống trùng lặp (Ép kiểu String để so sánh chính xác)
          const isExist = prev.some(
            (req) => String(req.id) === String(newRequest.id),
          );

          if (isExist) {
            return prev;
          }

          // 4. Phát âm thanh & Cập nhật State

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
          time: t("time.just_now"),
          isRead: false,
          postId: payload.post_id,
          commentId: payload.comment_id,
          senderId: payload.sender.id,
          senderName: payload.sender.name || payload.sender.username,
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
              String(f.id) === String(id) || String(f.user?.id) === String(id),
          );

        if (
          incomingPost &&
          String(incomingPost.author?.id) !== String(user.id) &&
          isFriend(incomingPost.author?.id)
        ) {
          const newNotif = {
            id: `new_post_${incomingPost.id}`,
            type: "new_post",
            text: "...",
            avatar: resolveAvatar(incomingPost.author?.avatar),
            time: t("time.just_now"),
            link: `/dashboard`,
            isRead: false,
            senderName: incomingPost.author?.name,
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
  }, [user, t]);

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
            (n) => String(n.senderId) === senderId,
          );
          const existingChat = prev[existingIndex];

          // 2. Tính số lượng mới (Cộng dồn)
          const newCount = (existingChat?.unreadCount || 0) + 1;
          if (!existingChat || existingChat.unreadCount === 0) {
            setUnreadChatCount((c) => c + 1);
          }
          let previewText = msg.text;
          if (!previewText && (msg.post || msg.post_data)) {
            previewText = "Đã chia sẻ một bài viết";
          }
          if (!previewText && msg.attachment) {
            if (msg.attachment.type === "image")
              previewText = t("chat.sent_image");
            else if (msg.attachment.type === "video")
              previewText = t("chat.sent_video");
            else previewText = t("chat.sent_file");
          }
          // 4. Tạo object mới (đưa lên đầu)
          const newChatNotif = {
            id: `msg_${msg.id || Date.now()}`,
            senderId: senderId,
            sender_name: senderObj.name || t("user_profile.not_updated"),
            avatar: resolveAvatar(senderObj.avatar),
            text: msg.text || t("chat.sent_message"),
            time: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isRead: false,
            unreadCount: newCount,
          };

          // 5. Lọc bỏ cái cũ, thêm cái mới vào đầu
          const otherChats = prev.filter(
            (n) => String(n.senderId) !== senderId,
          );
          return [newChatNotif, ...otherChats];
        });
      }
    };

    window.addEventListener("chat:new_message", handleChatMessage);
    return () =>
      window.removeEventListener("chat:new_message", handleChatMessage);
  }, [user, chatOpen, t]);
  // TỰ ĐỘNG CẬP NHẬT SỐ LƯỢNG TIN NHẮN CHƯA ĐỌC
  useEffect(() => {
    setUnreadChatCount(
      chatNotifications.filter((n) => n.unreadCount > 0).length,
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
      new CustomEvent("friendsUpdated", { detail: { friends: f } }),
    );
    alert("✅ " + t("user_profile.accepted_success"));
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
  const handleProfileClick = () => {
    if (user && user.id) {
      navigate(`/profile/${user.id}`); // Điều hướng kèm ID
    } else {
      navigate("/profile"); // Fallback
    }
    setMenuOpen(false);
  };

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
            : item,
        ),
      );
    }

    // --- XỬ LÝ LOGIC MỞ CHAT ---
    const friendInfo = friendsRef.current.find(
      (f) =>
        String(f.id) === String(chatItem.senderId) ||
        String(f.user?.id) === String(chatItem.senderId),
    );

    const contactToOpen = friendInfo || {
      id: chatItem.senderId,
      name: chatItem.sender_name,
      avatar: chatItem.avatar,
    };

    window.dispatchEvent(
      new CustomEvent("open_chat_with_contact", {
        detail: contactToOpen,
      }),
    );

    // Gọi API báo cho Backend biết là "Tôi đã đọc tin nhắn của người này rồi"
    if (chatItem.unreadCount > 0 && chatItem.conversationId) {
      try {
        await markAsRead(chatItem.conversationId);
        console.log(
          "✅ Đã đánh dấu đã đọc conversation:",
          chatItem.conversationId,
        );
      } catch (error) {
        console.error("❌ Lỗi khi đánh dấu đã đọc:", error);
      }
    }
  };
  const getNotificationText = (n) => {
    // Kiểm tra an toàn: nếu không có sender thì trả về text gốc
    const senderName = n.senderName || n.sender?.name || "Ai đó";

    if (n.type === "new_post")
      return t("notification_msg.new_post", { name: senderName });
    if (n.type === "new_comment")
      return t("notification_msg.comment", { name: senderName });
    if (n.type === "post_react")
      return t("notification_msg.like", { name: senderName });
    if (n.type === "comment_react")
      return t("notification_msg.like", { name: senderName });
    if (n.type === "friend_request") return t("navbar.friend_request");
    if (n.type === "share_post")
      return `${senderName} đã chia sẻ bài viết của bạn.`;
    return n.text;
  };

  return (
    <nav className={`navbar ${isSearchActive ? "search-mode" : ""}`}>
      {/* LEFT */}
      <div className="navbar-left">
        {!isSearchActive && (
          <div
            className="logo-section"
            onClick={() => {
              window.scrollTo(0, 0);
              window.location.href = "/dashboard";
            }}
          >
            <img src={logo} alt="logo" className="navbar-logo" />
            <h1 className="navbar-title hide-on-mobile">DoveRx</h1>
          </div>
        )}
        <div className="search-wrapper">
          {isSearchActive && (
            <button
              className="mobile-search-back"
              onClick={() => {
                setIsSearchActive(false);
                setSearchQuery("");
              }}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <form className="navbar-search">
            <img
              src={searchIconImg}
              className="search-custom-icon"
              alt="Search"
              onClick={() => setIsSearchActive(true)}
            />
            <input
              type="text"
              placeholder={t("navbar.search")}
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
                <div className="search-loading">
                  {t("navbar.search_loading")}
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="search-header">
                    {t("navbar.search_result")}
                  </div>
                  {searchResults.map((u) => {
                    const isFriend = friendsRef.current.some(
                      (f) =>
                        String(f.id) === String(u.id) ||
                        String(f.user?.id) === String(u.id),
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
                                ✓ {t("user_profile.friend_status")}
                              </span>
                            )}
                          </div>
                          <span>
                            {u.role === "doctor"
                              ? `👨‍⚕️ ${t("navbar.role_doctor")}`
                              : `👤 ${t("navbar.role_user")}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="search-empty">
                  {t("navbar.search_not_found")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER */}
      {!isSearchActive && (
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
          <button
            className={`nav-icon-btn hide-on-mobile ${
              activeTab === "map" ? "active" : ""
            }`}
            onClick={() => {
              setActiveTab("map");
              navigate("/health-map"); // Chuyển hướng
            }}
            title="Bản đồ Y tế"
          >
            <img
              src={mapIcon}
              className="dove-icon"
              alt="map"
              style={{ width: "24px", height: "24px", objectFit: "contain" }}
            />
          </button>
        </div>
      )}
      {/* RIGHT */}
      {!isSearchActive && (
        <div className="navbar-right" ref={dropdownRef}>
          {/* ✅ THÊM NÚT ADMIN */}
          {user?.role === "admin" && (
            <button
              className="nav-icon"
              onClick={() => navigate("/admin")}
              style={{
                background: "#dc2626",
                color: "white",
                padding: "8px 12px",
                borderRadius: "8px",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer",
              }}
              title="Admin Dashboard"
            >
              <i className="fas fa-user-shield"></i> Admin
            </button>
          )}
          {user && (
            <>
              <div
                className="icon-wrapper"
                style={{ marginRight: "15px" }}
                title="Trợ lý ảo DoveRx"
              >
                <img
                  src={aiIcon}
                  alt="AI Support"
                  className="nav-icon-btn transition-all duration-200 hover:brightness-125"
                  onClick={() => setIsAiChatOpen(!isAiChatOpen)}
                  style={{
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    objectFit: "contain",

                    transform: "none",
                  }}
                />
              </div>

              <Chatbot
                isOpen={isAiChatOpen}
                onClose={() => setIsAiChatOpen(false)}
                botIcon={aiIcon} // <--- TRUYỀN ICON XUỐNG ĐÂY
              />
            </>
          )}
          <div style={{ marginRight: "10px" }}>
            <LanguageSwitcher />
          </div>
          <div className="icon-wrapper friend-requests-wrapper">
            <button
              className={`nav-icon-btn ${
                activeTab === "friend" ? "active" : ""
              }`}
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
                <h4>
                  {t("navbar.friend_request")} ({friendRequests.length})
                </h4>
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
                            onMouseDown={(e) =>
                              handleAccept(req.from_user.id, e)
                            }
                          >
                            ✓ {t("user_profile.accept")}
                          </button>
                          <button
                            className="btn-reject"
                            onMouseDown={(e) =>
                              handleReject(req.from_user.id, e)
                            }
                          >
                            ✗ {t("user_profile.reject")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty">{t("navbar.no_friend_req")}</p>
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
            {unreadCount > 0 && (
              <span className="icon-badge">{unreadCount}</span>
            )}
            <span className="icon-tooltip">{t("navbar.notification")}</span>
            {notifOpen && (
              <div className="popup-menu">
                <h4>{t("navbar.notification")}</h4>
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`popup-item ${!n.isRead ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <img src={n.avatar} alt="avatar" />
                      <div className="popup-text">
                        <p style={{ fontSize: "14px", margin: 0 }}>
                          {getNotificationText(n)}
                        </p>
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
                  <p className="empty">{t("navbar.no_notif")}</p>
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
            <span className="icon-tooltip">{t("navbar.message")}</span>
            {chatOpen && (
              <div className="popup-menu">
                <h4>{t("navbar.message")}</h4>
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
                  <p className="empty">{t("navbar.no_msg")}</p>
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
                style={{ cursor: "pointer" }}
              />
              {menuOpen && (
                <div className="dropdown-menu">
                  {/* Update nút này */}
                  <button onClick={handleProfileClick} className="profile-btn">
                    {t("navbar.profile")}
                  </button>
                  <button onClick={onLogout} className="logout-btn">
                    {t("navbar.logout")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;

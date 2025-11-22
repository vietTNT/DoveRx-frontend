import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import ChatPopup from "../Chat/Chatpopup";
import "../../styles/SidebarRight.css";
import { getOrCreateConversation } from "../../services/chatApi";
import { getFriends } from "../../services/friendApi"; // ✅ Import

// ✅ Helper: build full avatar URL (same logic as CreatePostBox)
const getAvatarUrl = (a) => {
  const defaultAvatar =
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
  const avatar = a || "";
  if (!avatar) return defaultAvatar;
  if (avatar.startsWith("http")) return avatar;
  const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
  const path = avatar.startsWith("/") ? avatar : `/${avatar}`;
  return base ? `${base}${path}` : path;
};

const SidebarRight = ({ contacts, onContactClick }) => {
  const [openChats, setOpenChats] = useState([]);
  const [conversations, setConversations] = useState({});
  const [cachedMessages, setCachedMessages] = useState({});
  const [friends, setFriends] = useState([]); // ✅ State cho friends
  const [loading, setLoading] = useState(true);
  const MAX_EXPANDED_CHATS = 4;
  // ✅ THÊM: Ref để tránh re-render
  const cachedMessagesRef = useRef({});
  // ✅ Load danh sách bạn bè từ backend
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoading(true);
        const friendsList = await getFriends();
        console.log("✅ SidebarRight: Loaded friends:", friendsList);
        setFriends(friendsList);
      } catch (error) {
        console.error("❌ SidebarRight: Error loading friends:", error);
      } finally {
        setLoading(false);
      }
    };

    // ✅ Load lần đầu
    loadFriends();

    // ✅ Lắng nghe sự kiện cập nhật từ Navbar
    const handleFriendsUpdated = (event) => {
      console.log(
        "🔄 SidebarRight: Received friendsUpdated event",
        event.detail
      );

      if (event.detail?.friends) {
        // Có data sẵn → Dùng luôn
        setFriends(event.detail.friends);
      } else {
        // Không có data → Reload
        loadFriends();
      }
    };

    window.addEventListener("friendsUpdated", handleFriendsUpdated);

    // ✅ Polling mỗi 60s để đồng bộ (optional, để backup)
    const interval = setInterval(() => {
      console.log("🔄 SidebarRight: Auto-refresh friends (polling)");
      loadFriends();
    }, 60000); // 60 seconds

    // ✅ Cleanup
    return () => {
      window.removeEventListener("friendsUpdated", handleFriendsUpdated);
      clearInterval(interval);
    };
  }, []);

  // ✅ Dùng friends từ backend hoặc fallback sang contacts prop
  const displayContacts = friends.length > 0 ? friends : contacts || [];

  // ✅ Tự động minimize chat cũ nhất khi quá 4 popup lớn
  useEffect(() => {
    const expandedChats = openChats.filter((chat) => !chat.isMinimized);

    if (expandedChats.length > MAX_EXPANDED_CHATS) {
      // Tìm chat expanded cũ nhất (chat đầu tiên trong danh sách expanded)
      const oldestExpandedChat = expandedChats[0];

      setOpenChats(
        openChats.map((chat) =>
          chat.contact.id === oldestExpandedChat.contact.id
            ? { ...chat, isMinimized: true }
            : chat
        )
      );
    }
  }, [openChats]);
  // ✅ SỬA: Dùng useCallback để stable function
  const handleMessagesUpdate = useCallback((contactId, messages) => {
    console.log(
      `💾 [SidebarRight] Caching messages for contact ${contactId}:`,
      messages.length
    );

    // ✅ Lưu vào ref trước
    cachedMessagesRef.current = {
      ...cachedMessagesRef.current,
      [contactId]: messages,
    };

    // ✅ CHỈ update state nếu thực sự thay đổi
    setCachedMessages((prev) => {
      const prevMessages = prev[contactId] || [];

      // So sánh độ dài
      if (prevMessages.length === messages.length) {
        // So sánh ID của tin nhắn cuối
        const prevLastId = prevMessages[prevMessages.length - 1]?.id;
        const newLastId = messages[messages.length - 1]?.id;

        if (prevLastId === newLastId) {
          console.log(`⏭️ [SidebarRight] Messages unchanged, skipping update`);
          return prev; // ✅ Không update nếu giống nhau
        }
      }

      console.log(`✅ [SidebarRight] Updating cached messages`);
      return {
        ...prev,
        [contactId]: messages,
      };
    });
  }, []);

  // ✅ Xử lý khi click vào contact
  // const handleClick = async (contact) => {
  //   try {
  //     console.log(`🖱️ [SidebarRight] Clicked contact:`, contact);

  //     const token = localStorage.getItem("access");
  //     if (!token) {
  //       alert("⚠️ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
  //       window.location.href = "/login";
  //       return;
  //     }

  //     console.log(
  //       `🔄 [SidebarRight] Getting conversation with user ${contact.id}...`
  //     );
  //     const conversation = await getOrCreateConversation(contact.id);
  //     console.log(`✅ [SidebarRight] Got conversation:`, conversation);

  //     setConversations((prev) => ({
  //       ...prev,
  //       [contact.id]: conversation,
  //     }));

  //     const existingChatIndex = openChats.findIndex(
  //       (chat) => chat.contact.id === contact.id
  //     );

  //     if (existingChatIndex === -1) {
  //       console.log(`➕ [SidebarRight] Adding new chat for ${contact.name}`);
  //       setOpenChats([...openChats, { contact, isMinimized: false }]);
  //     } else {
  //       const existingChat = openChats[existingChatIndex];

  //       if (existingChat.isMinimized) {
  //         console.log(`⬆️ [SidebarRight] Maximizing chat for ${contact.name}`);
  //         const updatedChats = [...openChats];
  //         updatedChats.splice(existingChatIndex, 1);
  //         updatedChats.push({ ...existingChat, isMinimized: false });
  //         setOpenChats(updatedChats);
  //       } else {
  //         console.log(`🔄 [SidebarRight] Focusing chat for ${contact.name}`);
  //         const updatedChats = [...openChats];
  //         updatedChats.splice(existingChatIndex, 1);
  //         updatedChats.push(existingChat);
  //         setOpenChats(updatedChats);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("❌ [SidebarRight] Error in handleClick:", error);

  //     if (
  //       error.message?.includes("Session expired") ||
  //       error.message?.includes("No access token")
  //     ) {
  //       alert("⚠️ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
  //       window.location.href = "/login";
  //     } else {
  //       alert(`❌ Không thể mở chat.\n\nLỗi: ${error.message}`);
  //     }
  //   }
  // };
  // ✅ Xử lý khi click vào contact (SỬA ĐỔI: Instant UI)
  const handleClick = (contact) => {
    // 1. Kiểm tra Auth trước (Giữ nguyên)
    const token = localStorage.getItem("access");
    if (!token) {
      alert("⚠️ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      window.location.href = "/login";
      return;
    }

    console.log(`🖱️ [SidebarRight] Clicked contact (Instant Open):`, contact);

    // 2. MỞ UI NGAY LẬP TỨC (Không chờ API)
    // Logic: Nếu chưa mở -> Thêm vào list. Nếu đang đóng -> Mở lại.
    setOpenChats((prevChats) => {
      const existingChatIndex = prevChats.findIndex(
        (chat) => chat.contact.id === contact.id
      );

      // TH1: Chat chưa tồn tại trong list -> Thêm mới
      if (existingChatIndex === -1) {
        return [...prevChats, { contact, isMinimized: false }];
      }

      // TH2: Chat đã tồn tại
      const updatedChats = [...prevChats];
      const existingChat = updatedChats[existingChatIndex];

      // Nếu đang minimize hoặc không focus -> Đưa lên đầu/mở rộng
      updatedChats.splice(existingChatIndex, 1);
      updatedChats.push({ ...existingChat, isMinimized: false });

      return updatedChats;
    });

    // 3. GỌI API NGẦM (Background Fetch)
    // Nếu chưa có thông tin conversation trong state thì mới gọi
    if (!conversations[contact.id]) {
      console.log(
        `🔄 [SidebarRight] Fetching conversation info in background...`
      );

      getOrCreateConversation(contact.id)
        .then((conversation) => {
          console.log(
            `✅ [SidebarRight] Got conversation data for ${contact.name}`
          );
          setConversations((prev) => ({
            ...prev,
            [contact.id]: conversation,
          }));
        })
        .catch((error) => {
          console.error(
            "❌ [SidebarRight] Error fetching conversation:",
            error
          );
          // Tùy chọn: Có thể đóng chat nếu lỗi, hoặc hiện thông báo
        });
    }
  };
  // ✅ Đóng chat
  const handleCloseChat = (contactId) => {
    setOpenChats(openChats.filter((chat) => chat.contact.id !== contactId));
  };

  // ✅ Minimize/Maximize chat
  const handleMinimizeChat = (contactId) => {
    const chatIndex = openChats.findIndex(
      (chat) => chat.contact.id === contactId
    );

    if (chatIndex === -1) return;

    const chat = openChats[chatIndex];

    if (chat.isMinimized) {
      // ✅ Đang minimize -> Maximize và di chuyển lên cuối (vị trí mới nhất)
      const updatedChats = [...openChats];
      updatedChats.splice(chatIndex, 1);
      updatedChats.push({ ...chat, isMinimized: false });
      setOpenChats(updatedChats);
    } else {
      // ✅ Đang maximize -> Minimize
      setOpenChats(
        openChats.map((c) =>
          c.contact.id === contactId ? { ...c, isMinimized: true } : c
        )
      );
    }
  };
  // ✅ THÊM: Hàm update tin nhắn từ ChatPopup
  // const handleMessagesUpdate = (contactId, messages) => {
  //   console.log(
  //     `💾 [SidebarRight] Caching messages for contact ${contactId}:`,
  //     messages.length
  //   );
  //   setCachedMessages((prev) => ({
  //     ...prev,
  //     [contactId]: messages,
  //   }));
  // };

  // ✅ Tính toán vị trí cho các chat popup
  const getPositionStyle = (chat, index) => {
    const expandedChats = openChats.filter((c) => !c.isMinimized);
    const minimizedChats = openChats.filter((c) => c.isMinimized);

    // ✅ Lấy kích thước màn hình để điều chỉnh
    const screenWidth = window.innerWidth;

    // ✅ Tính toán khoảng cách dựa trên màn hình
    let miniGap = 70; // Khoảng cách minisize (60px + 10px)
    let expandedWidth = 328; // Chiều rộng popup
    let expandedGap = 348; // Khoảng cách giữa các popup (328px + 20px)
    let miniWidth = 80; // Chiều rộng vùng minisize
    let rightMargin = 10; // Margin từ mép phải

    // ⬅️ ĐIỀU CHỈNH theo màn hình
    if (screenWidth <= 480) {
      miniGap = 58; // 48px + 10px
      expandedWidth = screenWidth - 16;
      expandedGap = expandedWidth + 10;
      miniWidth = 58;
      rightMargin = 8;
    } else if (screenWidth <= 768) {
      miniGap = 62; // 52px + 10px
      expandedWidth = Math.min(300, screenWidth - 80);
      expandedGap = expandedWidth + 10;
      miniWidth = 62;
    } else if (screenWidth <= 1024) {
      miniGap = 66; // 56px + 10px
      expandedWidth = 300;
      expandedGap = 300;
      miniWidth = 70;
    } else if (screenWidth <= 1400) {
      miniGap = 70; // 60px + 10px
      expandedWidth = 328;
      expandedGap = 340;
      miniWidth = 80;
    } else {
      miniGap = 74; // 64px + 10px
      expandedWidth = 360;
      expandedGap = 380;
      miniWidth = 84;
    }

    if (chat.isMinimized) {
      // ✅ Vị trí cho minimized - XẾP DỌC bên phải
      const minimizedIndex = minimizedChats.findIndex(
        (c) => c.contact.id === chat.contact.id
      );
      return {
        right: `${rightMargin}px`,
        bottom: `${rightMargin + minimizedIndex * miniGap}px`,
      };
    } else {
      // ✅ Vị trí cho expanded - XẾP NGANG, TRÁNH minisize
      const expandedIndex = expandedChats.findIndex(
        (c) => c.contact.id === chat.contact.id
      );

      // Nếu có minisize thì dịch sang trái
      const offsetForMini = minimizedChats.length > 0 ? miniWidth : 0;

      return {
        right: `${offsetForMini + rightMargin + expandedIndex * expandedGap}px`,
        bottom: `0px`,
      };
    }
  };

  return (
    <>
      <aside className="sidebar-right">
        <div className="contacts-header">
          <h4>Bạn bè</h4>
          <div className="contacts-actions">
            <i className="fas fa-search" title="Tìm kiếm"></i>
            <i className="fas fa-ellipsis-h" title="Tùy chọn"></i>
          </div>
        </div>

        <ul>
          {loading ? (
            <li className="loading-contacts">⏳ Đang tải...</li>
          ) : displayContacts.length > 0 ? (
            displayContacts.map((contact) => (
              <li key={contact.id} onClick={() => handleClick(contact)}>
                <div className="avatar-wrapper">
                  <img src={getAvatarUrl(contact.avatar)} alt={contact.name} />
                  {contact.online && <span className="online-indicator"></span>}
                </div>
                <div className="contact-info">
                  <span className="contact-name">{contact.name}</span>
                  {contact.role === "doctor" && (
                    <span className="contact-badge">👨‍⚕️</span>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="no-contacts">Chưa có bạn bè nào</li>
          )}
        </ul>
      </aside>

      {/* Chat popups */}
      {openChats.map((chat, index) => (
        <ChatPopup
          key={chat.contact.id}
          contact={chat.contact}
          conversation={conversations[chat.contact.id]}
          cachedMessages={cachedMessages[chat.contact.id] || []} // ✅ THÊM PROP
          onMessagesUpdate={(messages) =>
            handleMessagesUpdate(chat.contact.id, messages)
          }
          onClose={() => handleCloseChat(chat.contact.id)}
          onMinimize={() => handleMinimizeChat(chat.contact.id)}
          isMinimized={chat.isMinimized}
          style={getPositionStyle(chat, index)}
        />
      ))}
    </>
  );
};

export default SidebarRight;

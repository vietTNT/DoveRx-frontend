import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import "../../styles/chat/Chatpopup.css";
import chatWebSocketService from "../../services/chatWebSocket";
import { fetchMessages, markAsRead } from "../../services/chatApi";
import { v4 as uuidv4 } from "uuid";
import like from "../../assets/icons/like.png";
import { saveToCache, loadFromCache } from "../../utils/chatCache";

// ✅ Helper function: Lấy avatar URL hoặc fallback
const getAvatarUrl = (contact) => {
  if (contact?.avatar) {
    if (contact.avatar.startsWith("http")) {
      return contact.avatar;
    }
    const baseUrl = process.env.REACT_APP_API_BASE;
    return `${baseUrl}${contact.avatar}`;
  }
  return "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
};

// ✅ Helper function: Lấy initials từ name
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
};

// ✅ Lấy current user từ localStorage
const getCurrentUserId = () => {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const userData = JSON.parse(stored);
      return userData.id;
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }
  return null;
};

// ✅ Tạo ID nội bộ để React dùng làm key (ổn định, duy nhất)
const normalizeMessage = (msg) => {
  return {
    ...msg,
    _local_id: msg.id || uuidv4(),
  };
};

const ChatPopup = ({
  contact,
  conversation,
  cachedMessages = [],
  onMessagesUpdate,
  onClose,
  onMinimize,
  isMinimized,
  style,
}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(cachedMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasLoadedRef = useRef(false);

  // Ref để theo dõi lần cuối notify
  const lastNotifiedRef = useRef(null);
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  // ✅ Notify parent khi messages thay đổi
  useEffect(() => {
    if (!onMessagesUpdate) return;
    const currentHash = JSON.stringify(messages.map((m) => m.id));

    if (lastNotifiedRef.current !== currentHash) {
      onMessagesUpdate(messages);
      lastNotifiedRef.current = currentHash;
    }
  }, [messages, onMessagesUpdate]);

  // ✅ Load tin nhắn (Chiến lược: Cache-First)
  useEffect(() => {
    if (!conversation?.id) return;

    // 1️⃣ BƯỚC 1: Load từ Cache hiển thị NGAY LẬP TỨC
    const cachedMsgs = loadFromCache(conversation.id);
    if (cachedMsgs.length > 0) {
      setMessages(cachedMsgs);
      setLoading(false); // Tắt loading để hiển thị luôn
      hasLoadedRef.current = true;
    } else {
      setLoading(true);
    }

    // 2️⃣ BƯỚC 2: Gọi API ngầm để lấy dữ liệu mới nhất
    const syncMessages = async () => {
      try {
        const serverMessages = await fetchMessages(conversation.id);
        const normalized = serverMessages.map(normalizeMessage);

        // Cập nhật State
        setMessages(normalized);

        // 🔥 LƯU NGƯỢC LẠI VÀO CACHE
        saveToCache(conversation.id, normalized);

        // Đánh dấu đã đọc (Sửa lỗi props.isMinimized -> isMinimized)
        if (!isMinimized) {
          await markAsRead(conversation.id);
        }
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setLoading(false);
      }
    };

    syncMessages();
  }, [conversation?.id, isMinimized]); // Thêm isMinimized vào dependency nếu cần

  // ✅ Reset refs khi đổi conversation
  useEffect(() => {
    hasLoadedRef.current = false;
    lastNotifiedRef.current = null;
  }, [conversation?.id]);

  // ✅ Lắng nghe WebSocket
  useEffect(() => {
    if (!conversation?.id) return;

    const handleNewMessage = (data) => {
      if (Number(data.message?.conversation) === Number(conversation?.id)) {
        setMessages((prev) => {
          const newMsg = normalizeMessage(data.message);

          // Tránh trùng lặp
          const exists = prev.some((msg) => msg._local_id === newMsg._local_id);
          if (exists) return prev;

          const sorted = [...prev, newMsg].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );

          // 🔥 QUAN TRỌNG: Cập nhật Cache ngay khi có tin nhắn mới Realtime
          saveToCache(conversation.id, sorted);

          return sorted;
        });

        if (!isMinimized) {
          chatWebSocketService.markAsRead(conversation.id);
        }
      }
    };

    const handleMessageSent = (data) => {
      if (Number(data.message?.conversation) === Number(conversation?.id)) {
        setMessages((prev) => {
          const newMsg = normalizeMessage(data.message);
          const exists = prev.some((msg) => msg._local_id === newMsg._local_id);
          if (exists) return prev;

          const sorted = [...prev, newMsg].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );

          // 🔥 QUAN TRỌNG: Cập nhật Cache ngay khi gửi tin nhắn thành công
          saveToCache(conversation.id, sorted);

          return sorted;
        });
      }
    };

    const handleTyping = (data) => {
      if (
        data.conversation_id === conversation?.id &&
        data.user_id !== currentUserId
      ) {
        setIsTyping(data.is_typing);
        if (data.is_typing) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    };

    const handleMessagesRead = (data) => {
      if (data.conversation_id === conversation?.id) {
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.is_read ? msg : { ...msg, is_read: true }
          );
          // Không cần saveToCache ở đây vì is_read không ảnh hưởng nhiều đến hiển thị content
          return updated;
        });
      }
    };

    chatWebSocketService.on("new_message", handleNewMessage);
    chatWebSocketService.on("message_sent", handleMessageSent);
    chatWebSocketService.on("user_typing", handleTyping);
    chatWebSocketService.on("messages_read", handleMessagesRead);

    return () => {
      chatWebSocketService.off("new_message", handleNewMessage);
      chatWebSocketService.off("message_sent", handleMessageSent);
      chatWebSocketService.off("user_typing", handleTyping);
      chatWebSocketService.off("messages_read", handleMessagesRead);
    };
  }, [conversation?.id, currentUserId, isMinimized]);

  // ✅ Auto scroll (Fix lỗi hiển thị tin cũ)
  useLayoutEffect(() => {
    if (loading) return;

    // Nếu vừa load xong data (có messages) và không phải do người khác đang gõ
    // Dùng 'auto' để nhảy ngay xuống cuối
    if (messages.length > 0 && !isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading, conversation?.id]);

  // Smooth scroll khi có tin nhắn mới thêm vào
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // ✅ Gửi tin nhắn
  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !conversation?.id) return;

    chatWebSocketService.sendMessage(conversation.id, message.trim());
    setMessage("");

    chatWebSocketService.sendTyping(conversation.id, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // ✅ Typing indicator logic
  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!conversation?.id) return;

    chatWebSocketService.sendTyping(conversation.id, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      chatWebSocketService.sendTyping(conversation.id, false);
    }, 2000);
  };

  if (isMinimized) {
    return (
      <div className="chat-popup-minimized" style={style} onClick={onMinimize}>
        <img src={getAvatarUrl(contact)} alt={contact.name} />
        {contact.online && <span className="mini-online-indicator"></span>}
        <button
          className="mini-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    );
  }

  return (
    <div className="chat-popup" style={style}>
      <div className="chat-popup-header">
        <div className="chat-header-left">
          <img src={getAvatarUrl(contact)} alt={contact.name} />
          <div className="chat-header-info">
            <span className="contact-name">{contact.name}</span>
            <span className="contact-status">
              {contact.online ? "Đang hoạt động" : "Không hoạt động"}
            </span>
          </div>
        </div>
        <div className="chat-header-actions">
          <i className="fas fa-phone" title="Gọi điện"></i>
          <i className="fas fa-video" title="Gọi video"></i>
          <i className="fas fa-minus" onClick={onMinimize} title="Thu nhỏ"></i>
          <i className="fas fa-times" onClick={onClose} title="Đóng"></i>
        </div>
      </div>

      <div className="chat-popup-body">
        {loading ? (
          <div className="chat-loading">
            <i className="fas fa-spinner fa-spin"></i> Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <i className="far fa-comments"></i>
            <p>Chưa có tin nhắn nào</p>
            <p style={{ fontSize: "12px", opacity: 0.7 }}>
              Hãy bắt đầu cuộc trò chuyện!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMine = msg.sender?.id === currentUserId;

              return (
                <div
                  key={msg._local_id}
                  className={`message ${isMine ? "me" : "them"}`}
                >
                  {!isMine && (
                    <img
                      src={getAvatarUrl(msg.sender)}
                      alt={msg.sender?.name}
                      className="message-avatar"
                      data-name={getInitials(msg.sender?.name)}
                    />
                  )}
                  <div
                    className="message-content"
                    data-read={msg.is_read ? "true" : "false"}
                  >
                    <div className="message-text">{msg.text}</div>
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="typing-indicator">
                <img
                  src={getAvatarUrl(contact)}
                  alt=""
                  className="message-avatar"
                />
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className="chat-popup-footer" onSubmit={handleSend}>
        <button type="button" className="attach-btn">
          <i className="fas fa-plus-circle"></i>
        </button>
        <input
          type="text"
          placeholder="Aa"
          value={message}
          onChange={handleTyping}
        />
        <button type="button" className="emoji-btn">
          <i className="far fa-smile"></i>
        </button>
        {message.trim() ? (
          <button type="submit" className="send-btn">
            <i className="fas fa-paper-plane"></i>
          </button>
        ) : (
          <button type="button" className="like-btn">
            <img src={like} alt="Like" />
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatPopup;

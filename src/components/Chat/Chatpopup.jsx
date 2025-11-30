import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import "../../styles/chat/Chatpopup.css";
import chatWebSocketService from "../../services/chatWebSocket";
import {
  fetchMessages,
  markAsRead,
  uploadAttachment,
} from "../../services/chatApi";
import { v4 as uuidv4 } from "uuid";
import likeIcon from "../../assets/icons/like.png";
import { saveToCache, loadFromCache } from "../../utils/chatCache";
import { useTranslation } from "react-i18next";
//  HÀM NÀY ĐỂ XỬ LÝ ẢNH
const getAttachmentUrl = (url) => {
  if (!url) return "";

  if (url.startsWith("blob:")) return url;

  if (url.startsWith("http")) return url;

  return `${process.env.REACT_APP_API_BASE}${url}`;
};
// Lấy avatar URL hoặc fallback
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

// Lấy initials từ name
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
};

// Lấy current user từ localStorage
const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }
  return { id: null };
};

// Tạo ID nội bộ để React dùng làm key (ổn định, duy nhất)
const normalizeMessage = (msg) => {
  return {
    ...msg,
    _local_id: msg.id || msg._local_id || uuidv4(),
    isSending: msg.isSending || false, // Default false
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
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(cachedMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quản lý ảnh đang được phóng to
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatBodyRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const fileInputRef = useRef(null);
  const lastNotifiedRef = useRef(null);
  const currentUser = useMemo(() => getCurrentUser(), []);

  // Kiểm tra user có đang ở đáy không trước khi có tin nhắn mới đến
  const checkScrollPosition = () => {
    if (!chatBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAtBottomRef.current = isAtBottom;
  };

  // Hàm cuộn xuống đáy an toàn
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Tự động cuộn khi messages thay đổi
  useLayoutEffect(() => {
    if (loading) return;
    const lastMessage = messages[messages.length - 1];
    const isMyMessage = lastMessage?.sender?.id === currentUser.id;
    if (isMyMessage || isAtBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages, loading, currentUser.id]);
  // Xử lý khi ảnh load xong
  const handleImageLoad = () => {
    if (isAtBottomRef.current) {
      scrollToBottom("smooth");
    }
  };
  //  Notify parent khi messages thay đổi
  useEffect(() => {
    if (!onMessagesUpdate) return;
    const currentHash = JSON.stringify(messages.map((m) => m.id));
    if (lastNotifiedRef.current !== currentHash) {
      onMessagesUpdate(messages);
      lastNotifiedRef.current = currentHash;
    }
  }, [messages, onMessagesUpdate]);

  //  Load tin nhắn (Chiến lược: Cache-First)
  useEffect(() => {
    if (!conversation?.id) return;
    //  Load từ Cache hiển thị NGAY LẬP TỨC
    const cachedMsgs = loadFromCache(conversation.id);
    if (cachedMsgs.length > 0) {
      setMessages(cachedMsgs);
      setLoading(false); // Tắt loading để hiển thị luôn
      hasLoadedRef.current = true;
    } else {
      setLoading(true);
    }

    // Gọi API ngầm để lấy dữ liệu mới nhất
    const syncMessages = async () => {
      try {
        const serverMessages = await fetchMessages(conversation.id);
        const normalized = serverMessages.map(normalizeMessage);

        // Cập nhật State
        setMessages(normalized);

        //  LƯU NGƯỢC LẠI VÀO CACHE
        saveToCache(conversation.id, normalized);

        // Đánh dấu đã đọc
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
  }, [conversation?.id, isMinimized]);

  // Reset refs khi đổi conversation
  useEffect(() => {
    hasLoadedRef.current = false;
    lastNotifiedRef.current = null;
  }, [conversation?.id]);

  // Lắng nghe WebSocket
  useEffect(() => {
    if (!conversation?.id) return;

    const handleNewMessage = (data) => {
      // Kiểm tra đúng cuộc trò chuyện
      if (Number(data.message?.conversation) === Number(conversation?.id)) {
        if (data.message.sender.id !== currentUser.id) {
          setIsTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }

        setMessages((prev) => {
          const newMsg = normalizeMessage(data.message);
          // 1. Tin nhắn của chính mình (Cần tìm và thay thế bản giả lập)
          if (newMsg.sender.id === currentUser.id) {
            // Tìm tin nhắn đang gửi (isSending) có nội dung trùng khớp
            const pendingIndex = prev.findIndex(
              (m) => m.isSending && m.text === newMsg.text
            );

            if (pendingIndex !== -1) {
              //  Giữ nguyên vị trí, chỉ update data
              const updated = [...prev];
              updated[pendingIndex] = {
                ...newMsg,
                _local_id: prev[pendingIndex]._local_id, // Giữ _local_id để React không vẽ lại (quan trọng)
              };

              // Lưu cache để lần sau mở lại có data chuẩn
              saveToCache(conversation.id, updated);
              return updated;
            }
          }

          // 2. TRƯỜNG HỢP: Tin nhắn BÌNH THƯỜNG (Của người khác hoặc tin mình nhưng không tìm thấy bản giả lập)

          // Kiểm tra trùng lặp ID (Deduplication)
          const exists = prev.some((msg) => msg.id === newMsg.id);
          if (exists) return prev;

          // Thêm mới và sắp xếp lại theo thời gian
          const sorted = [...prev, newMsg].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );

          // Cập nhật cache
          saveToCache(conversation.id, sorted);
          return sorted;
        });

        // Đánh dấu đã đọc nếu chat đang mở
        if (!isMinimized) {
          chatWebSocketService.markAsRead(conversation.id);
        }
      }
    };

    const handleTyping = (data) => {
      if (
        data.conversation_id === conversation?.id &&
        data.user_id !== currentUser.id // Dùng currentUser.id
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
          return updated;
        });
      }
    };

    chatWebSocketService.on("new_message", handleNewMessage);
    chatWebSocketService.on("user_typing", handleTyping);
    chatWebSocketService.on("messages_read", handleMessagesRead);

    return () => {
      chatWebSocketService.off("new_message", handleNewMessage);
      chatWebSocketService.off("user_typing", handleTyping);
      chatWebSocketService.off("messages_read", handleMessagesRead);
    };
  }, [conversation?.id, currentUser.id, isMinimized]);

  useLayoutEffect(() => {
    if (loading) return;

    // Nếu vừa load xong data (có messages) và không phải do người khác đang gõ
    // Dùng 'auto' để nhảy ngay xuống cuối
    if (messages.length > 0 && !isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversation?.id]);

  // Smooth scroll khi có tin nhắn mới thêm vào
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);
  // ---------------------------------------------------------------
  // XỬ LÝ GỬI FILE ẢNH/VIDEO/TÀI LIỆU
  // ---------------------------------------------------------------
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input
    e.target.value = null;

    //  Preview (Optimistic UI)
    const previewUrl = URL.createObjectURL(file);
    let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";

    const optimisticMsg = {
      id: null,
      _local_id: uuidv4(),
      conversation: conversation.id,
      text: "",
      attachment: { url: previewUrl, type: type },
      sender: {
        id: currentUser.id,
        name: currentUser.name || currentUser.username || "Tôi",
        avatar: currentUser.avatar,
      },
      created_at: new Date().toISOString(),
      is_read: false,
      isSending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      //  Upload lên Server
      const uploadResult = await uploadAttachment(file);

      //  Gửi Socket (ĐÃ SỬA LẠI ĐÚNG CÚ PHÁP)
      chatWebSocketService.send({
        type: "send_message", // Type nằm trong object
        conversation_id: conversation.id,
        text: "",
        attachment: {
          url: uploadResult.url,
          type: uploadResult.type,
        },
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Gửi file thất bại");
    }
  };

  // ---------------------------------------------------------------
  //  XỬ LÝ NÚT LIKE (ICON)
  // ---------------------------------------------------------------
  const handleSendLike = () => {
    if (!conversation?.id) return;

    const likeEmoji = "👍";

    // Optimistic UI cho Like
    const optimisticMsg = {
      id: null,
      _local_id: uuidv4(),
      conversation: conversation.id,
      text: likeEmoji,
      isLike: true, // Flag để style to hơn nếu muốn
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      created_at: new Date().toISOString(),
      isSending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    // Gửi qua socket
    chatWebSocketService.sendMessage(conversation.id, likeEmoji);
  };
  //  Gửi tin nhắn
  const handleSend = (e) => {
    e.preventDefault();
    const textToSend = message.trim();
    if (!textToSend || !conversation?.id) return;

    //  TẠO TIN NHẮN GIẢ LẬP (Optimistic Message)
    const optimisticMsg = {
      id: null, // Chưa có ID server
      _local_id: uuidv4(),
      conversation: conversation.id,
      text: textToSend,
      sender: {
        id: currentUser.id,
        name: currentUser.name || currentUser.username || "Tôi",
        avatar: currentUser.avatar, // Dùng avatar từ localStorage
      },
      created_at: new Date().toISOString(),
      is_read: false,
      isSending: true, // 🚩 Đánh dấu đang gửi
    };

    //  CẬP NHẬT GIAO DIỆN NGAY LẬP TỨC
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessage(""); // Xóa input ngay

    // GỬI SOCKET NGẦM
    chatWebSocketService.sendMessage(conversation.id, textToSend);
    markAsRead(conversation.id).catch((e) => {
      console.error("❌ Failed to mark as read after sending:", e);
    });
    // TẮT TYPING (Gửi signal ngừng gõ)
    chatWebSocketService.sendTyping(conversation.id, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleTypingInput = (e) => {
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
              {contact.online ? t("chat.active") : t("chat.offline")}
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

      <div
        className="chat-popup-body"
        ref={chatBodyRef}
        onScroll={checkScrollPosition}
      >
        {loading ? (
          <div className="chat-loading">
            <i className="fas fa-spinner fa-spin"></i> {t("chat.loading")}
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <i className="far fa-comments"></i>
            <p>{t("chat.empty")}</p>
            <p style={{ fontSize: "12px", opacity: 0.7 }}>
              {t("chat.start_conversation")}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMine = msg.sender?.id === currentUser.id;
              const isLikeEmoji = msg.text === "👍";
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
                    className={`message-content ${
                      isLikeEmoji ? "message-like-large" : ""
                    }`}
                    style={
                      isLikeEmoji
                        ? { background: "transparent", padding: 0 }
                        : {}
                    }
                  >
                    {/*  RENDER ẢNH/VIDEO VỚI SỰ KIỆN ONLOAD */}
                    {msg.attachment?.type === "image" && (
                      <div
                        className="media-container"
                        // Bắt sự kiện click để mở Lightbox
                        onClick={() =>
                          setPreviewImage(getAttachmentUrl(msg.attachment.url))
                        }
                      >
                        <img
                          src={getAttachmentUrl(msg.attachment.url)}
                          alt="attachment"
                          className="message-image"
                          onLoad={handleImageLoad}
                          style={{
                            display: "block",
                            maxWidth: "100%",
                            borderRadius: "10px",
                            minHeight: "100px",
                            background: "#f0f0f0",
                          }}
                        />
                        {msg.isSending && (
                          <div className="media-overlay-sending">
                            <div className="sending-spinner"></div>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.attachment?.type === "video" && (
                      <div className="media-container">
                        <video
                          src={getAttachmentUrl(msg.attachment.url)}
                          controls={!msg.isSending}
                          style={{
                            maxWidth: "100%",
                            borderRadius: "10px",
                            minHeight: "100px",
                            background: "#000",
                          }}
                        />
                        {msg.isSending && (
                          <div className="media-overlay-sending">
                            <div className="sending-spinner"></div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* TEXT MESSAGE */}
                    {msg.text && (
                      <div
                        className="message-text"
                        style={
                          isLikeEmoji
                            ? { fontSize: "40px", lineHeight: "1" }
                            : {}
                        }
                      >
                        {msg.text}
                      </div>
                    )}
                    {/* TIME */}
                    {!isLikeEmoji && (
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
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
      {previewImage && (
        <div className="lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <span
            className="lightbox-close"
            onClick={() => setPreviewImage(null)}
          >
            &times;
          </span>
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Full Preview"
              className="lightbox-image"
            />
          </div>
        </div>
      )}
      <form className="chat-popup-footer" onSubmit={handleSend}>
        <input
          type="file"
          multiple={false}
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx"
        />
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="fas fa-plus-circle"></i>
        </button>
        <input
          type="text"
          placeholder="Aa"
          value={message}
          onChange={handleTypingInput}
        />
        <button type="button" className="emoji-btn">
          <i className="far fa-smile"></i>
        </button>
        {message.trim() ? (
          <button type="submit" className="send-btn">
            <i className="fas fa-paper-plane"></i>
          </button>
        ) : (
          <button type="button" className="like-btn" onClick={handleSendLike}>
            <img
              src={likeIcon}
              alt="Like"
              style={{ width: "24px", height: "24px" }}
            />
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatPopup;

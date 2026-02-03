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
  recallMessage,
} from "../../services/chatApi";
import { v4 as uuidv4 } from "uuid";
import likeIcon from "../../assets/icons/like.png";
import { saveToCache, loadFromCache } from "../../utils/chatCache";
import { useTranslation } from "react-i18next";
import SharedPostCard from "./SharedPostCard";

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
  const chatName = conversation?.is_group ? conversation.title : contact?.name;

  const chatAvatar = conversation?.is_group
    ? "https://cdn-icons-png.flaticon.com/512/166/166258.png" // Icon nhóm mặc định
    : getAvatarUrl(contact);

  const chatStatus = conversation?.is_group
    ? `${conversation.participants?.length || 0} thành viên`
    : contact?.online
      ? t("chat.active")
      : t("chat.offline");

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
      const incomingMsg = data.message;

      // Xử lý post_data bị stringify (giữ nguyên logic cũ của bạn)
      if (incomingMsg.post_data) {
        if (typeof incomingMsg.post_data === "string") {
          try {
            incomingMsg.post_data = JSON.parse(incomingMsg.post_data);
          } catch (e) {
            incomingMsg.post_data = null;
          }
        }
        if (
          incomingMsg.post_data &&
          typeof incomingMsg.post_data === "object" &&
          incomingMsg.post_data.post_data
        ) {
          incomingMsg.post_data = incomingMsg.post_data.post_data;
        }
      }

      // Kiểm tra đúng Conversation
      if (Number(incomingMsg?.conversation) === Number(conversation?.id)) {
        // Tắt typing
        if (incomingMsg.sender.id !== currentUser.id) {
          setIsTyping(false);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }

        setMessages((prev) => {
          const newMsg = normalizeMessage(incomingMsg);

          // 🔥 SỬA LOGIC TẠI ĐÂY: Xử lý tin nhắn của chính mình
          if (newMsg.sender.id === currentUser.id) {
            // Tìm tin nhắn tạm đang ở trạng thái sending
            const existingIndex = prev.findIndex(
              (m) =>
                m.isSending && // Chỉ tìm những tin đang gửi
                // Khớp nội dung text
                ((m.text && m.text === newMsg.text) ||
                  // Hoặc khớp nếu là ảnh/file (dựa vào type)
                  (m.attachment &&
                    newMsg.attachment &&
                    m.attachment.type === newMsg.attachment.type) ||
                  // Hoặc khớp nếu là like icon
                  (m.text === "👍" && newMsg.text === "👍")),
            );

            if (existingIndex !== -1) {
              // ✅ Cập nhật tin nhắn tạm thành tin nhắn thật
              const updated = [...prev];
              updated[existingIndex] = {
                ...newMsg,
                _local_id: prev[existingIndex]._local_id, // Giữ lại ID local để React không vẽ lại sai
                isSending: false, // Quan trọng: Đánh dấu đã gửi xong để hiện nút thu hồi
              };
              return updated;
            }

            // Kiểm tra trùng lặp theo ID thật (đề phòng)
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }
          }

          // Xử lý tin nhắn từ người khác
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }

          return [...prev, newMsg];
        });

        scrollToBottom();
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
            msg.is_read ? msg : { ...msg, is_read: true },
          );
          return updated;
        });
      }
    };
    const handleMessageRecalled = (data) => {
      if (Number(data.conversation_id) === Number(conversation.id)) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === data.message_id) {
              return {
                ...msg,
                is_recalled: true,
                text: "Tin nhắn đã được thu hồi",
                attachment: null,
                post_data: null,
              };
            }
            return msg;
          }),
        );
      }
    };

    chatWebSocketService.on("new_message", handleNewMessage);
    chatWebSocketService.on("user_typing", handleTyping);
    chatWebSocketService.on("messages_read", handleMessagesRead);
    chatWebSocketService.on("message_recalled", handleMessageRecalled);

    return () => {
      chatWebSocketService.off("new_message", handleNewMessage);
      chatWebSocketService.off("user_typing", handleTyping);
      chatWebSocketService.off("messages_read", handleMessagesRead);
      chatWebSocketService.off("message_recalled", handleMessageRecalled);
    };
  }, [conversation?.id, currentUser.id, isMinimized]);

  // ---------------------------------------------------------------
  const handleRecall = async (msgId) => {
    if (!window.confirm("Bạn có chắc muốn thu hồi tin nhắn này?")) return;
    try {
      await recallMessage(msgId);
    } catch (error) {
      console.error("Lỗi thu hồi:", error);
      alert("Không thể thu hồi tin nhắn.");
    }
  };

  useLayoutEffect(() => {
    if (loading) return;

    if (messages.length > 0 && !isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversation?.id]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // ---------------------------------------------------------------
  //  XỬ LÝ GỬI FILE ẢNH/VIDEO/TÀI LIỆU
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
      const uploadResult = await uploadAttachment(file);
      chatWebSocketService.send({
        type: "send_message",
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
    const optimisticMsg = {
      id: null,
      _local_id: uuidv4(),
      conversation: conversation.id,
      text: likeEmoji,
      isLike: true,
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
    chatWebSocketService.sendMessage(conversation.id, likeEmoji);
  };

  //  Gửi tin nhắn
  const handleSend = (e) => {
    e.preventDefault();
    const textToSend = message.trim();
    if (!textToSend || !conversation?.id) return;

    const optimisticMsg = {
      id: null,
      _local_id: uuidv4(),
      conversation: conversation.id,
      text: textToSend,
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
    setMessage("");

    chatWebSocketService.sendMessage(conversation.id, textToSend);
    markAsRead(conversation.id).catch((e) => {
      console.error("❌ Failed to mark as read after sending:", e);
    });

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

  // === RENDER GIAO DIỆN MỚI ===

  if (isMinimized) {
    return (
      <div className="chat-popup minimized" style={style} onClick={onMinimize}>
        <div className="minimized-header">
          <img src={chatAvatar} alt={chatName} className="minimized-avatar" />
          <span className="minimized-name">{chatName}</span>
          <button
            className="close-btn-mini"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-popup" style={style}>
      {/* HEADER */}
      <div className="chat-popup-header">
        <div className="chat-header-left">
          <img src={chatAvatar} alt={chatName} className="chat-avatar" />
          <div className="chat-header-info">
            <span className="contact-name">{chatName}</span>
            <span className="contact-status">{chatStatus}</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="header-btn" title="Thu nhỏ" onClick={onMinimize}>
            —
          </button>
          <button
            className="header-btn close-btn"
            title="Đóng"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      {/* BODY */}
      <div
        className="chat-popup-body"
        ref={chatBodyRef}
        onScroll={checkScrollPosition}
      >
        {loading ? (
          <div className="chat-loading">
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <i className="far fa-comments"></i>
            <p>{t("chat.empty")}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMine = msg.sender?.id === currentUser.id;
              const isLikeEmoji = msg.text === "👍";
              const showSenderName = conversation?.is_group && !isMine;

              return (
                <div
                  key={msg._local_id}
                  className={`message-container ${isMine ? "me" : "them"}`}
                >
                  {!isMine && (
                    <img
                      src={getAvatarUrl(msg.sender)}
                      alt={msg.sender?.name}
                      className="message-sender-avatar"
                      title={msg.sender?.name}
                    />
                  )}

                  <div className="message-content-wrapper">
                    {showSenderName && (
                      <span className="message-sender-name">
                        {msg.sender?.name}
                      </span>
                    )}

                    <div
                      className={`message-bubble ${
                        isLikeEmoji ? "emoji-only" : ""
                      } ${msg.is_recalled ? "recalled" : ""}`}
                    >
                      {msg.is_recalled ? (
                        <div className="message-recalled-content">
                          <i className="fas fa-ban"></i>{" "}
                          {t("chat.message_recalled") ||
                            "Tin nhắn đã được thu hồi"}
                        </div>
                      ) : (
                        <>
                          {msg.attachment?.type === "image" && (
                            <div
                              className="media-container image"
                              onClick={() =>
                                setPreviewImage(
                                  getAttachmentUrl(msg.attachment.url),
                                )
                              }
                            >
                              <img
                                src={getAttachmentUrl(msg.attachment.url)}
                                alt="attachment"
                                onLoad={handleImageLoad}
                              />
                              {msg.isSending && (
                                <div className="sending-overlay">
                                  <div className="spinner"></div>
                                </div>
                              )}
                            </div>
                          )}

                          {msg.attachment?.type === "video" && (
                            <div className="media-container video">
                              <video
                                src={getAttachmentUrl(msg.attachment.url)}
                                controls={!msg.isSending}
                              />
                              {msg.isSending && (
                                <div className="sending-overlay">
                                  <div className="spinner"></div>
                                </div>
                              )}
                            </div>
                          )}

                          {msg.post_data && (
                            <SharedPostCard postData={msg.post_data} />
                          )}

                          {msg.text && (
                            <div className="message-text">{msg.text}</div>
                          )}
                        </>
                      )}

                      {!isLikeEmoji && !msg.is_recalled && (
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nút thu hồi (Hiện khi hover vào message-container) */}
                  {isMine &&
                    !msg.is_recalled &&
                    !msg.isSending &&
                    !isLikeEmoji && (
                      <div className="message-actions">
                        <i
                          className="fas fa-undo-alt recall-btn"
                          title={t("chat.recall")}
                          onClick={() => handleRecall(msg.id)}
                        ></i>
                      </div>
                    )}
                </div>
              );
            })}

            {isTyping && (
              <div className="message-container them typing-indicator">
                <img
                  src={getAvatarUrl(contact)}
                  className="message-sender-avatar"
                  alt="..."
                />
                <div className="message-bubble typing">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* LIGHTBOX PREVIEW */}
      {previewImage && (
        <div
          className="image-preview-modal"
          onClick={() => setPreviewImage(null)}
        >
          <span className="close-preview" onClick={() => setPreviewImage(null)}>
            ×
          </span>
          <img
            src={previewImage}
            alt="Full Preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* FOOTER */}
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
          className="footer-btn attach-btn"
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

        <button type="button" className="footer-btn emoji-btn">
          <i className="far fa-smile"></i>
        </button>

        {message.trim() ? (
          <button type="submit" className="footer-btn send-btn">
            <i className="fas fa-paper-plane"></i>
          </button>
        ) : (
          <button
            type="button"
            className="footer-btn like-btn"
            onClick={handleSendLike}
          >
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

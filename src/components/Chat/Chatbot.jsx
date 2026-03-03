import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../../styles/chat/chatbot.css";
import ChatbotFull from "./ChatbotFull";
import { useTranslation } from "react-i18next";
import {
  fetchAiConversations,
  createAiConversation,
  deleteAiConversation,
} from "../../services/chatApi";

const Chatbot = ({ isOpen, onClose, botIcon }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [conversationList, setConversationList] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeConversationIdRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (!isFullScreen) scrollToBottom();
  }, [messages, isFullScreen, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- API LẤY DANH SÁCH ---
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchAiConversations();
      setConversationList(data);
      // Chỉ set ID mặc định nếu chưa có ID nào được chọn
      if (!activeConversationIdRef.current && data.length > 0) {
        setCurrentConversationId(data[0].id);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách AI chat:", e);
    }
  }, []);

  // --- LOGIC WEBSOCKET ---
  const connectWebSocket = useCallback(
    (convId) => {
      let token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");
      if (!token) {
        console.error("❌ Không tìm thấy Token, vui lòng đăng nhập lại.");
        return;
      }

      // Nếu đang kết nối tới đúng convId này rồi thì KHÔNG làm gì cả
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN &&
        activeConversationIdRef.current === convId
      ) {
        return;
      }

      // Clear timeout cũ
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);

      // Đóng socket cũ nếu nó đang chạy ở ID khác
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Cập nhật Ref ID hiện tại
      activeConversationIdRef.current = convId;

      const wsBase = process.env.REACT_APP_WS_BASE || "ws://localhost:8000";
      let wsUrl = `${wsBase}/ws/chatbot/?token=${token}`;
      if (convId) wsUrl += `&conversation_id=${convId}`;

      console.log("🔌 [AI Chat] Connecting:", wsUrl);
      const newSocket = new WebSocket(wsUrl);
      socketRef.current = newSocket;

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "history") {
            setMessages(data.messages);

            // Nếu server trả về ID khác (VD: tạo mới), chỉ update state UI
            // KHÔNG gọi lại connectWebSocket ở đây
            if (
              data.conversation_id &&
              data.conversation_id !== activeConversationIdRef.current
            ) {
              setCurrentConversationId(data.conversation_id);
              activeConversationIdRef.current = data.conversation_id; // Update ref để chặn reconnect
              loadConversations();
            }
            setTimeout(scrollToBottom, 100);
          } else if (data.type === "typing") {
            setIsTyping(data.status);
          } else if (data.type === "ai_response") {
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), text: data.message, sender: "bot" },
            ]);
            setIsTyping(false);
            loadConversations();
          }
        } catch (err) {}
      };

      newSocket.onclose = (e) => {
        // Chỉ reconnect nếu không phải do code chủ động đóng (1000) và Chatbot đang mở
        if (e.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(activeConversationIdRef.current); // Reconnect với ID hiện tại
          }, 3000);
        }
      };

      newSocket.onerror = (err) => {
        newSocket.close();
      };
    },
    [loadConversations],
  );

  // Effect khởi chạy
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      loadConversations();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000); // Code 1000: Normal Closure
      }
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isOpen, loadConversations]);

  // Effect theo dõi thay đổi ID hội thoại để kết nối
  useEffect(() => {
    if (isOpen && currentConversationId) {
      // Chỉ kết nối nếu ID thay đổi so với ID đang active
      if (currentConversationId !== activeConversationIdRef.current) {
        connectWebSocket(currentConversationId);
      }
    }
  }, [isOpen, currentConversationId, connectWebSocket]);

  const handleCreateNewChat = async () => {
    try {
      const newChat = await createAiConversation();
      setConversationList((prev) => [newChat, ...prev]);
      setCurrentConversationId(newChat.id); // Sẽ trigger useEffect -> connectWebSocket
      setMessages([]);
    } catch (e) {}
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteAiConversation(chatId);
      const newList = conversationList.filter((c) => c.id !== chatId);
      setConversationList(newList);
      if (currentConversationId === chatId) {
        setCurrentConversationId(null);
        activeConversationIdRef.current = null;
        setMessages([]);
        // Đóng socket nếu xóa cuộc hội thoại đang mở
        if (socketRef.current) socketRef.current.close();
      }
    } catch (e) {}
  };

  const handleSend = () => {
    if (!input.trim()) return;

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket(currentConversationId);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: input, sender: "user" },
    ]);

    socketRef.current.send(JSON.stringify({ message: input }));
    setInput("");
    setIsTyping(true);
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  if (isFullScreen) {
    return (
      <ChatbotFull
        messages={messages}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        handleKeyDown={handleKeyDown}
        isTyping={isTyping}
        onCloseFull={() => setIsFullScreen(false)}
        conversationList={conversationList}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onCreateNewChat={handleCreateNewChat}
        onDeleteChat={handleDeleteChat}
        botIcon={botIcon}
      />
    );
  }

  // Widget UI
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-[60] w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:brightness-110 border-2 border-blue-500 animate-bounce-in"
      >
        <img
          src={botIcon}
          alt="AI"
          className="w-10 h-10 object-contain drop-shadow-sm"
        />
        <span className="absolute top-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></span>
      </div>
    );
  }

  return (
    <div className="fixed z-[55] flex flex-col bg-white shadow-2xl overflow-hidden font-sans border border-gray-200 animate-slide-up bottom-6 right-6 w-full h-full sm:w-[400px] sm:h-[600px] sm:rounded-2xl">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 flex justify-between items-center text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm p-1">
            <img
              src={botIcon}
              alt="AI Bot"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="font-bold text-lg">DoveRx AI</h3>
            <div className="flex items-center gap-1.5 text-xs text-blue-100">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {t("chat.online", "Online")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateNewChat}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsFullScreen(true)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 12H6"
              />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4 chat-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 border border-blue-200 flex-shrink-0 p-1 self-start mt-1">
                <img
                  src={botIcon}
                  alt="Bot"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.sender === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"}`}
            >
              {msg.sender === "bot" ? (
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1 ml-10">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0 pb-6 sm:pb-3">
        <div className="relative flex items-center bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 min-w-0"
            placeholder={t("chat.type_question")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ml-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-md flex items-center justify-center flex-shrink-0"
          >
            <svg
              className="w-5 h-5 transform rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

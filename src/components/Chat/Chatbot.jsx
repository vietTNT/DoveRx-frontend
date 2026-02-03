// src/components/Chat/Chatbot.jsx
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../../styles/chat/chatbot.css";

const Chatbot = ({ isOpen, onClose, botIcon }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Xin chào! Tôi là trợ lý AI DoveRx. Tôi có thể giúp gì cho sức khỏe của bạn?",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      connectWebSocket();
    }
    return () => {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const connectWebSocket = () => {
    let token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          token = userObj.access || userObj.token || userObj.accessToken;
        }
      } catch (e) {}
    }

    if (!token) return;
    if (socket && socket.readyState === WebSocket.OPEN) return;

    const wsUrl = `ws://127.0.0.1:8000/ws/chatbot/?token=${token}`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => console.log("✅ Chatbot Connected");

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "typing") {
        setIsTyping(data.status);
      } else if (data.type === "ai_response") {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), text: data.message, sender: "bot" },
        ]);
        setIsTyping(false);
      }
    };

    newSocket.onclose = () => setSocket(null);
    setSocket(newSocket);
  };

  const handleSend = () => {
    if (!input.trim() || !socket) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: input, sender: "user" },
    ]);
    socket.send(JSON.stringify({ message: input }));
    setInput("");
    setIsTyping(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // --- RENDER ---
  if (!isOpen) return null;

  // 1. Giao diện BONG BÓNG (khi thu nhỏ)
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform animate-bounce-in border-2 border-white"
        title="Mở chat"
      >
        <img
          src={botIcon}
          alt="AI Bubble"
          className="w-10 h-10 object-contain drop-shadow-sm"
        />
        <span className="absolute top-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></span>
      </div>
    );
  }

  // 2. Giao diện CỬA SỔ CHAT (Responsive: Mobile Fullscreen - Desktop Popup)
  return (
    <div
      className="fixed z-50 flex flex-col bg-white shadow-2xl overflow-hidden font-sans border border-gray-200 animate-slide-up
      /* MOBILE: Full màn hình, sát đáy */
      w-full h-full bottom-0 right-0 rounded-none
      /* TABLET/PC (sm trở lên): Cửa sổ nhỏ góc phải, bo góc */
      sm:w-[400px] sm:h-[600px] sm:bottom-6 sm:right-6 sm:rounded-2xl"
    >
      {/* HEADER */}
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
              Online
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Thu nhỏ"
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
            title="Đóng chat"
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

      {/* MESSAGE AREA */}
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
              className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
              }`}
            >
              {msg.sender === "bot" ? (
                // Dùng class markdown-content từ CSS để style đẹp hơn
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
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot ml-1"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot ml-1"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER */}
      <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0 pb-6 sm:pb-3">
        <div className="relative flex items-center bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 min-w-0"
            placeholder="Nhập câu hỏi..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ml-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center flex-shrink-0"
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
        <div className="text-center mt-2">
          <p className="text-[10px] text-gray-400">
            AI có thể mắc lỗi. Vui lòng kiểm tra lại thông tin y tế quan trọng.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

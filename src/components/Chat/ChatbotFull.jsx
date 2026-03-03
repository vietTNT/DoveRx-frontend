import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../../styles/chat/ChatbotFull.css";
import { useTranslation } from "react-i18next";
const ChatbotFull = ({
  messages,
  input,
  setInput,
  handleSend,
  handleKeyDown,
  isTyping,
  onCloseFull,
  conversationList = [],
  currentConversationId,
  onSelectConversation,
  onCreateNewChat,
  onDeleteChat,
  botIcon,
}) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto scroll khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Hàm xử lý xóa chat (chặn sự kiện click lan ra ngoài)
  const handleDeleteClick = (e, chatId) => {
    e.stopPropagation();
    if (window.confirm(t("chat.delete_confirm"))) {
      onDeleteChat(chatId);
    }
  };
  const handleAutoResize = (e) => {
    const target = e.target;
    setInput(target.value);

    // Reset chiều cao để tính toán chính xác khi xóa bớt chữ
    target.style.height = "auto";

    // Giới hạn chiều cao tối đa (ví dụ 120px) để không che hết màn hình
    if (target.value !== "") {
      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
    }
  };
  return (
    <div className="chatbot-full-container">
      {/* --- SIDEBAR TRÁI (Giữ nguyên) --- */}
      <div className={`chatbot-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="chatbot-header">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="menu-toggle-btn"
            title={isCollapsed ? t("chat.expand") : t("chat.collapse")}
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
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </button>
          <span className="sidebar-text-header">{t("chat.history")}</span>
        </div>

        <div className="new-chat-container">
          <button
            onClick={onCreateNewChat}
            className="new-chat-btn"
            title={t("chat.new_conversation")}
          >
            <span className="icon-plus">
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
            </span>
            <span className="btn-text">{t("chat.new_conversation")}</span>
          </button>
        </div>

        <div className="sidebar-list">
          {conversationList.length === 0 ? (
            <div className="text-center text-gray-400 text-xs mt-4 italic sidebar-text">
              {t("chat.no_history")}
            </div>
          ) : (
            conversationList.map((chat) => (
              <div
                key={chat.id}
                className={`history-item group ${chat.id === currentConversationId ? "bg-blue-100/60" : ""}`}
                onClick={() => onSelectConversation(chat.id)}
              >
                <div className="history-icon">
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
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div className="history-info">
                  <div className="history-title truncate">
                    {chat.title || `${t("chat.conversation")} ${chat.id}`}
                  </div>
                  <div className="history-preview truncate text-gray-400">
                    {chat.last_msg_content || "..."}
                  </div>
                </div>
                <button
                  className="delete-chat-btn"
                  onClick={(e) => handleDeleteClick(e, chat.id)}
                  title={t("common.delete")}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- CỘT PHẢI (MAIN CHAT) --- */}
      <div className="chatbot-main bg-gray-50/50">
        <div className="chatbot-header bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 p-1">
              <img
                src={botIcon}
                className="w-full h-full object-contain"
                alt="Logo"
              />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base leading-tight">
                DoveRx AI
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs text-gray-500 font-medium">
                  {t("chat.online")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onCloseFull}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            title={t("chat.minimize")}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* MESSAGES AREA - Đã chỉnh sửa giao diện */}
        <div className="chatbot-messages-area p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none opacity-60">
              <img
                src={botIcon}
                className="w-24 h-24 mb-6 grayscale opacity-50"
                alt="Empty"
              />
              <p className="text-lg font-medium">{t("chat.ai_greeting")}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full gap-4 items-start ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* AVATAR */}
              <div className="flex-shrink-0 mt-1">
                {msg.sender === "bot" ? (
                  <div className="w-10 h-10 bg-white rounded-full border border-gray-200 p-1.5 shadow-sm">
                    <img
                      src={botIcon}
                      className="w-full h-full object-contain"
                      alt="Bot"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-blue-100">
                    You
                  </div>
                )}
              </div>

              {/* BUBBLE CHAT */}
              <div
                className={`relative max-w-[75%] lg:max-w-[65%] px-5 py-4 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                }`}
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {msg.sender === "bot" ? (
                  <div className="markdown-content">
                    {/* Style Markdown chuyên nghiệp cho AI */}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h3: ({ node, ...props }) => (
                          <h3
                            className="text-blue-700 font-bold text-lg mt-3 mb-2 border-b border-blue-50 pb-1"
                            {...props}
                          />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong
                            className="text-blue-900 font-bold"
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul
                            className="list-disc ml-5 space-y-1 my-2 text-gray-700"
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="pl-1" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="text-blue-600 underline hover:text-blue-800"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex w-full flex-row gap-4 items-start">
              <div className="w-10 h-10 bg-white rounded-full border border-gray-200 p-1.5 shadow-sm mt-1">
                <img
                  src={botIcon}
                  className="w-full h-full object-contain"
                  alt="Bot"
                />
              </div>
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center h-12">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA - Giữ nguyên như code gốc của bạn */}
        <div className="chatbot-footer">
          <div className="chatbot-input-wrapper ">
            <textarea
              ref={inputRef}
              rows={1}
              className="chatbot-input custom-scroll"
              placeholder={t("chat.type_question")}
              value={input}
              onChange={handleAutoResize}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  if (inputRef.current) inputRef.current.style.height = "auto";
                } else {
                  handleKeyDown && handleKeyDown(e);
                }
              }}
              style={{
                resize: "none",

                overflowY: "auto",
                maxHeight: "120px",
                minHeight: "24px",
                lineHeight: "1.5",
                width: "100%",
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                paddingRight: "10px",
                marginRight: "5px",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="chatbot-send-btn"
            >
              <svg
                className="w-4 h-4 transform rotate-90"
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
          <p className="text-center text-[11px] text-gray-400 mt-2">
            {t("chat.ai_warning")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatbotFull;

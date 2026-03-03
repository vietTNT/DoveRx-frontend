import React, { useState, useEffect, useCallback } from "react";
import ChatPopup from "./Chatpopup";

const ChatLayer = () => {
  const [openChats, setOpenChats] = useState([]);

  useEffect(() => {
    const handleOpenChat = (event) => {
      const { conversationId, targetUser } = event.detail;
      setOpenChats((prev) => {
        const existing = prev.find((c) => c.id === conversationId);
        if (existing) {
          // Nếu đã mở, đưa lên đầu và mở rộng (maximize)
          return [
            ...prev.filter((c) => c.id !== conversationId),
            { ...existing, isMinimized: false },
          ];
        }
        // Thêm mới và giới hạn 4 cái
        return [
          ...prev,
          { id: conversationId, contact: targetUser, isMinimized: false },
        ].slice(-4);
      });
    };

    window.addEventListener("OPEN_CHAT_POPUP", handleOpenChat);
    return () => window.removeEventListener("OPEN_CHAT_POPUP", handleOpenChat);
  }, []);

  const handleClose = useCallback((id) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleMinimize = useCallback((id) => {
    setOpenChats((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isMinimized: !c.isMinimized } : c,
      ),
    );
  }, []);

  // HÀM TÍNH VỊ TRÍ CỦA BẠN (ĐÃ TỐI ƯU)
  const getPositionStyle = (chat, allChats) => {
    const expandedChats = allChats.filter((c) => !c.isMinimized);
    const minimizedChats = allChats.filter((c) => c.isMinimized);
    const screenWidth = window.innerWidth;

    let miniGap = 70;
    let expandedGap = 348;
    let miniWidth = 80;
    let rightMargin = 10;

    if (screenWidth <= 768) {
      miniGap = 62;
      expandedGap = 310;
      miniWidth = 62;
    } else if (screenWidth <= 1400) {
      expandedGap = 340;
    }

    if (chat.isMinimized) {
      const idx = minimizedChats.findIndex((c) => c.id === chat.id);
      return {
        right: `${rightMargin}px`,
        bottom: `${rightMargin + idx * miniGap}px`,
        position: "fixed",
        zIndex: 1000 + idx,
      };
    } else {
      const idx = expandedChats.findIndex((c) => c.id === chat.id);
      const offsetForMini = minimizedChats.length > 0 ? miniWidth : 0;
      return {
        right: `${offsetForMini + rightMargin + idx * expandedGap}px`,
        bottom: `0px`,
        position: "fixed",
        zIndex: 1000 + idx,
      };
    }
  };

  return (
    <div className="chat-layer-container">
      {openChats.map((chat) => (
        <ChatPopup
          key={chat.id}
          conversation={{ id: chat.id }}
          contact={chat.contact}
          isMinimized={chat.isMinimized}
          onClose={() => handleClose(chat.id)}
          onMinimize={() => handleMinimize(chat.id)}
          style={getPositionStyle(chat, openChats)}
        />
      ))}
    </div>
  );
};

export default React.memo(ChatLayer);

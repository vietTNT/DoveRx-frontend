class ChatWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.pingInterval = null;
    this.messageQueue = []; // Hàng đợi tin nhắn khi mất kết nối
  }

  connect(token) {
    if (!token || token === "undefined" || token === "null") {
      console.error("❌ [chatWebSocket] Invalid token");
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) return;

    // Đảm bảo REACT_APP_WS_BASE không có dấu / ở cuối
    const wsBase = process.env.REACT_APP_WS_BASE.replace(/\/$/, "");
    const wsUrl = `${wsBase}/ws/chat/?token=${token}`;

    console.log("🔌 [chatWebSocket] Connecting to:", wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("✅ [chatWebSocket] Connected successfully");
      this.reconnectAttempts = 0;

      //  Gửi lại các tin nhắn bị kẹt khi mất mạng
      this.processMessageQueue();

      // Setup Heartbeat (Ping server mỗi 30s để giữ kết nối)
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({ type: "ping" });
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "pong") return;

        // Phát sự kiện cho các listeners (ChatPopup)
        this.notifyListeners(data.type, data);

        // // Hỗ trợ thêm event generic 'message' nếu cần
        // this.notifyListeners("message", data);
        if (data.type === "new_message" || data.type === "send_message") {
          window.dispatchEvent(
            new CustomEvent("chat:new_message", { detail: data }),
          );
        }
      } catch (err) {
        console.error("❌ [chatWebSocket] Parse error:", err);
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ [chatWebSocket] WebSocket error:", error);
    };

    this.ws.onclose = (event) => {
      console.log("🔌 [chatWebSocket] Closed. Code:", event.code);
      if (this.pingInterval) clearInterval(this.pingInterval);

      // Chỉ reconnect nếu không phải lỗi Auth (4001, 4003)
      if (event.code !== 4001 && event.code !== 4003) {
        this.reconnect(token);
      }
    };
  }

  // Xử lý hàng đợi
  processMessageQueue() {
    if (this.messageQueue.length > 0) {
      console.log(
        ` [chatWebSocket] Resending ${this.messageQueue.length} queued messages...`,
      );
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.send(msg); // Gọi lại send để gửi
      }
    }
  }

  reconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(` Reconnecting attempt ${this.reconnectAttempts}...`);
      setTimeout(() => this.connect(token), 3000);
    }
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Nếu chưa kết nối, lưu vào hàng đợi
      console.warn(
        " [chatWebSocket] Connection lost. Queuing message...",
        message,
      );
      this.messageQueue.push(message);

      // Thử reconnect ngay nếu có token
      const token = localStorage.getItem("access");
      if (token) this.connect(token);
    }
  }

  // Helper gửi tin nhắn text (Optional, dùng cái này cho gọn code bên ngoài)
  sendMessage(conversationId, text) {
    this.send({
      type: "send_message",
      conversation_id: conversationId,
      text,
    });
  }

  sendTyping(conversationId, isTyping = true) {
    this.send({
      type: "typing",
      conversation_id: conversationId,
      is_typing: isTyping,
    });
  }

  markAsRead(conversationId) {
    this.send({
      type: "mark_read",
      conversation_id: conversationId,
    });
  }

  // --- Event Listeners ---
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      this.listeners.set(
        eventType,
        callbacks.filter((cb) => cb !== callback),
      );
    }
  }

  notifyListeners(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`❌ Listener error:`, err);
        }
      });
    }
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const chatWebSocketService = new ChatWebSocketService();
export default chatWebSocketService;

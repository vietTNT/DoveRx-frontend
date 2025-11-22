class ChatWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.pingInterval = null;
    this.messageQueue = [];
  }

  connect(token) {
    if (!token || token === "undefined" || token === "null") {
      console.error("❌ [chatWebSocket] Invalid token");
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${process.env.REACT_APP_WS_BASE}/ws/chat/?token=${token}`;
    console.log("🔌 [chatWebSocket] Connecting to:", wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("✅ [chatWebSocket] Connected successfully");
      this.reconnectAttempts = 0;

      // ✅ FIX: Xả hàng đợi tin nhắn (Flush Queue)
      this.processMessageQueue();

      // Setup Heartbeat
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

        // ✅ KIỂM TRA LẠI: Có thể bị nhầm logic ở đây
        if (data.type === "new_message")
          this.notifyListeners("new_message", data);
        else if (data.type === "message_sent")
          this.notifyListeners("message_sent", data);
        else if (data.type === "user_typing")
          this.notifyListeners("user_typing", data);
        else if (data.type === "messages_read")
          this.notifyListeners("messages_read", data);
      } catch (err) {
        console.error("❌ [chatWebSocket] Parse error:", err);
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ [chatWebSocket] WebSocket error:", error);
    };

    this.ws.onclose = (event) => {
      console.log("🔌 [chatWebSocket] Closed");
      if (this.pingInterval) clearInterval(this.pingInterval);

      // Chỉ reconnect nếu không phải lỗi Auth
      if (event.code !== 4001 && event.code !== 4003) {
        this.reconnect(token);
      }
    };
  }

  // ✅ THÊM HÀM: Xử lý hàng đợi
  processMessageQueue() {
    if (this.messageQueue.length > 0) {
      console.log(
        `🔄 [chatWebSocket] Processing ${this.messageQueue.length} queued messages...`
      );

      while (this.messageQueue.length > 0) {
        const payload = this.messageQueue.shift(); // Lấy tin nhắn đầu tiên ra
        this.ws.send(JSON.stringify(payload));
        console.log("📤 [chatWebSocket] Sent queued message:", payload);
      }
    }
  }
  reconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(token), 3000);
    }
  }
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendMessage(conversationId, text) {
    const payload = {
      type: "send_message",
      conversation_id: conversationId,
      text,
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ [chatWebSocket] Connection lost. Queuing message...");

      // ✅ Đẩy vào queue để chờ reconnect
      this.messageQueue.push(payload);

      // Thử reconnect nếu cần
      const token = localStorage.getItem("access");
      if (token) this.connect(token);

      return;
    }

    this.ws.send(JSON.stringify(payload));
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

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    console.log(
      `👂 [chatWebSocket] Listener added for "${eventType}" (total: ${
        this.listeners.get(eventType).length
      })`
    );
  }

  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      this.listeners.set(
        eventType,
        callbacks.filter((cb) => cb !== callback)
      );
      console.log(
        `🧹 [chatWebSocket] Listener removed for "${eventType}" (remaining: ${
          this.listeners.get(eventType).length
        })`
      );
    }
  }

  notifyListeners(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks && callbacks.length > 0) {
      console.log(
        `🔔 [chatWebSocket] Notifying ${callbacks.length} listener(s) for "${eventType}"`
      );
      callbacks.forEach((cb, index) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`❌ [chatWebSocket] Listener ${index} error:`, err);
        }
      });
    } else {
      console.warn(`⚠️ [chatWebSocket] No listeners for "${eventType}"`);
    }
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      console.log("🔌 [chatWebSocket] Disconnecting...");
      this.ws.close();
      this.ws = null;
    }
  }
}

const chatWebSocketService = new ChatWebSocketService();

export default chatWebSocketService;

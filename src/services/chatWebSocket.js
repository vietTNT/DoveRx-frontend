class ChatWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.pingInterval = null; // ✅ THÊM
  }

  connect(token) {
    // ✅ Kiểm tra token hợp lệ
    if (!token || token === "undefined" || token === "null") {
      console.error("❌ [chatWebSocket] Invalid token:", token);
      return;
    }

    // ✅ Kiểm tra đã connected chưa
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("✅ [chatWebSocket] Already connected");
      return;
    }

    // ✅ Nếu đang connecting hoặc closing, đợi
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.log("⏳ [chatWebSocket] Already connecting, waiting...");
      return;
    }

    const baseUrl = process.env.REACT_APP_API_BASE;
    const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = baseUrl.replace(/^https?:\/\//, "");
    // const wsUrl = `${wsProtocol}://${wsHost}/ws/chat/?token=${token}`; local
    const wsUrl = `${process.env.REACT_APP_WS_BASE}/ws/chat/?token=${token}`;

    console.log("🔌 [chatWebSocket] Connecting to:", wsUrl);
    console.log(
      "🔑 [chatWebSocket] Token preview:",
      token.substring(0, 30) + "..."
    ); // ✅ THÊM LOG

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("✅ [chatWebSocket] Connected successfully");
      this.reconnectAttempts = 0;

      // ✅ THÊM: Gửi ping mỗi 30 giây để giữ kết nối
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log("🏓 [chatWebSocket] Sending ping...");
          this.send({ type: "ping" });
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 [chatWebSocket] Received:", data);

        if (data.type === "pong") {
          console.log("🏓 [chatWebSocket] Received pong");
          return;
        }

        // ✅ KIỂM TRA LẠI: Có thể bị nhầm logic ở đây
        if (data.type === "connection_established") {
          console.log("✅ [chatWebSocket] Server confirmed connection");
        } else if (data.type === "message_sent") {
          console.log("✅ [chatWebSocket] Message type: message_sent");
          this.notifyListeners("message_sent", data); // ✅ ĐÚNG
        } else if (data.type === "new_message") {
          console.log("💬 [chatWebSocket] Message type: new_message");
          this.notifyListeners("new_message", data); // ✅ ĐÚNG
        } else if (data.type === "user_typing") {
          console.log("⌨️ [chatWebSocket] Message type: user_typing");
          this.notifyListeners("user_typing", data); // ✅ ĐÚNG
        } else if (data.type === "messages_read") {
          this.notifyListeners("messages_read", data);
        } else if (data.type === "error") {
          console.error("❌ [chatWebSocket] Server error:", data.message);
        } else {
          console.warn("⚠️ [chatWebSocket] Unknown type:", data.type);
        }
      } catch (err) {
        console.error("❌ [chatWebSocket] Parse error:", err);
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ [chatWebSocket] WebSocket error:", error);
    };

    this.ws.onclose = (event) => {
      console.log("🔌 [chatWebSocket] Closed:", event.code, event.reason);

      // ✅ THÊM: Dừng ping khi đóng
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      // ✅ Chỉ reconnect nếu không phải lỗi auth
      if (event.code !== 4001 && event.code !== 4003) {
        this.reconnect(token);
      } else {
        console.error(
          "❌ [chatWebSocket] Authentication failed, not reconnecting"
        );
      }
    };
  }

  reconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 [chatWebSocket] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => this.connect(token), 3000);
    } else {
      console.error("❌ [chatWebSocket] Max reconnect attempts reached");
    }
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("📤 [chatWebSocket] Sending:", message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(
        "❌ [chatWebSocket] Not connected, ReadyState:",
        this.ws?.readyState
      );

      // ✅ Log chi tiết để debug
      console.error("❌ [chatWebSocket] WebSocket states:");
      console.error("   - CONNECTING:", WebSocket.CONNECTING);
      console.error("   - OPEN:", WebSocket.OPEN);
      console.error("   - CLOSING:", WebSocket.CLOSING);
      console.error("   - CLOSED:", WebSocket.CLOSED);
      console.error("   - Current:", this.ws?.readyState);
    }
  }

  sendMessage(conversationId, text) {
    const payload = {
      type: "send_message",
      conversation_id: conversationId,
      text,
    };

    console.log("📤 [chatWebSocket] sendMessage called:");
    console.log("   conversationId:", conversationId);
    console.log("   text:", text);
    console.log("   payload:", payload);
    console.log("   wsState:", this.ws?.readyState);
    console.log("   wsStates: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3");

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("❌ [chatWebSocket] WebSocket not ready!");
      console.error("   Current state:", this.ws?.readyState);
      console.error("   Expected state: 1 (OPEN)");

      // ✅ Thử reconnect
      const token = localStorage.getItem("access");
      if (token) {
        console.log("🔄 [chatWebSocket] Attempting to reconnect...");
        this.connect(token);

        // ✅ Queue tin nhắn để gửi sau khi reconnect
        if (!this.messageQueue) {
          this.messageQueue = [];
        }
        this.messageQueue.push(payload);
      }
      return;
    }

    console.log("✅ [chatWebSocket] Sending payload via WebSocket...");
    this.ws.send(JSON.stringify(payload));
    console.log("✅ [chatWebSocket] Payload sent successfully");
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

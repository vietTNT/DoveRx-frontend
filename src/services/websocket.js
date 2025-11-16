class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    // if (this.ws?.readyState === WebSocket.OPEN) return;

    // ✅ Lấy base URL từ env
    const baseUrl = process.env.REACT_APP_API_BASE || "http://localhost:8000";
    const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = baseUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/feed/?token=${token}`;

    console.log("🔌 Connecting to WebSocket:", wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(data.type, data);
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("🔌 WebSocket closed");
      this.reconnect(token);
    };
  }

  reconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts})`);
      setTimeout(() => this.connect(token), 3000);
    }
  }

  // send(message) {
  //   if (this.ws?.readyState === WebSocket.OPEN) {
  //     this.ws.send(JSON.stringify(message));
  //   }
  // }
  send(type, payload = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          ...payload,
        })
      );
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const callbacks = this.listeners.get(eventType);
    callbacks.push(callback);

    console.log(
      `👂 [WebSocket] Registered listener for "${eventType}". Total: ${callbacks.length}`
    ); // ✅ THÊM LOG
  }

  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      // ✅ Lọc bỏ callback cụ thể, giữ lại các callback khác
      const filtered = callbacks.filter((cb) => cb !== callback);

      if (filtered.length === 0) {
        // Nếu không còn listener nào cho event này, xóa luôn key
        this.listeners.delete(eventType);
      } else {
        this.listeners.set(eventType, filtered);
      }

      console.log(
        `🧹 [WebSocket] Removed listener for "${eventType}". Remaining: ${filtered.length}`
      );
    }
  }

  notifyListeners(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      console.log(
        `📢 [WebSocket] Notifying ${callbacks.length} listeners for "${eventType}"`
      ); // ✅ THÊM LOG
      callbacks.forEach((cb) => cb(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const websocketService = new WebSocketService();

export default websocketService;

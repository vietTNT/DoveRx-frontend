// App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import api from "./api/api";
import websocketService from "./services/websocket";
import chatWebSocketService from "./services/chatWebSocket";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/DashBoard";
import ProfilePage from "./pages/ProfilePage";
import DoctorLoginPage from "./pages/DoctorLoginPage";
import DoctorRegisterPage from "./pages/DoctorRegisterPage";
import DoctorVerifyPage from "./pages/DoctorVerifyPage";
import UserProfilePage from "./pages/UserProfilepage";
import { refreshTokenIfNeeded } from "./services/auth";
import AdminDashboard from "./components/dashboard/admin/AdminDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  //  Restore user từ localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined") {
        const userData = JSON.parse(stored);
        setUser(userData);
        console.log("✅ Restored user:", userData.email || userData.id);
      } else {
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("❌ Error reading user from localStorage:", error);
      localStorage.removeItem("user");
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Refresh token SAU KHI đã restore user
  useEffect(() => {
    if (!isInitialized) return;

    (async () => {
      try {
        const token = await refreshTokenIfNeeded();
        if (token) {
          console.log("✅ Token còn hạn hoặc đã được làm mới.");
        } else {
          console.log("⚠️ Token hết hạn, cần đăng nhập lại.");
        }
      } catch (error) {
        console.error("❌ Refresh token error:", error);
      }
    })();
  }, [isInitialized]);

  // Connect WebSocket CHỈ 1 LẦN (gộp cả Feed + Chat)
  useEffect(() => {
    if (!user) {
      console.log("⚠️ [App] No user, not connecting WebSocket");
      chatWebSocketService.disconnect();
      websocketService.disconnect();
      return;
    }

    const token = localStorage.getItem("access");
    if (!token) {
      console.warn("⚠️ [App] No access token, not connecting WebSocket");
      return;
    }

    console.log(
      "🔌 [App] Connecting WebSockets for user:",
      user.email || user.id
    );
    console.log("🔌 [App] Token preview:", token.substring(0, 20) + "...");

    // Connect Feed WebSocket
    websocketService.connect(token);

    // Listen đúng event name mà backend broadcast ('post_react' / 'post_change_react' / 'post_unreact')
    websocketService.on("post_react", (data) => {
      console.log("❤️ Post reacted (WS):", data);
    });
    websocketService.on("post_change_react", (data) => {
      console.log("🔁 Post reaction changed (WS):", data);
    });
    websocketService.on("post_unreact", (data) => {
      console.log("💨 Post unreact (WS):", data);
    });

    // Connect Chat WebSocket
    chatWebSocketService.connect(token);
  }, [user]);

  // THÊM useEffect mới CHỈ cleanup khi logout
  useEffect(() => {
    // Chỉ cleanup khi component App bị unmount HOÀN TOÀN
    return () => {
      console.log("🔌 [App] Component unmounting, disconnecting WebSockets");
      websocketService.disconnect();
      chatWebSocketService.disconnect();
    };
  }, []); // Empty dependency - chỉ chạy 1 lần khi unmount

  // Lắng nghe sự kiện user cập nhật từ ProfilePage
  useEffect(() => {
    // Thêm tham số 'event' vào hàm xử lý
    const handleUserUpdated = (event) => {
      //  Lấy dữ liệu "nóng" từ event (URL tạm thời Blob)
      // Đây là phần giúp Navbar đổi ảnh ngay lập tức
      if (event.detail && event.detail.user) {
        console.log("⚡ [App] Cập nhật nhanh từ Event:", event.detail.user);
        setUser(event.detail.user);
        return; // Dừng lại, không cần đọc localStorage nữa
      }

      //  ƯU TIÊN 2: Fallback đọc từ localStorage (Logic cũ)
      // Dành cho trường hợp F5 hoặc các update không gửi kèm detail
      try {
        const updatedUser = localStorage.getItem("user");
        if (updatedUser && updatedUser !== "undefined") {
          setUser(JSON.parse(updatedUser));
        }
      } catch {
        console.warn("Không đọc được user từ localStorage sau khi update");
      }
    };

    window.addEventListener("user:updated", handleUserUpdated);
    return () => window.removeEventListener("user:updated", handleUserUpdated);
  }, []);

  // Google login
  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const id_token = credentialResponse?.credential;
      if (!id_token) {
        alert("Thiếu id_token từ Google");
        return;
      }

      const { data } = await api.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/google-login/`,
        { id_token }
      );

      const packedUser = {
        ...data.user,
        access: data.access,
        refresh: data.refresh,
      };

      localStorage.setItem("user", JSON.stringify(packedUser));
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      setUser(packedUser);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.error("google-login error:", status, data, e);
      alert(
        `Đăng nhập thất bại: HTTP ${status || ""} ${
          data?.detail || JSON.stringify(data) || ""
        }`
      );
    }
  };

  const handleLogout = () => {
    console.log("🚪 Logging out...");

    // Disconnect WebSocket khi logout
    websocketService.disconnect();
    chatWebSocketService.disconnect();

    localStorage.removeItem("user");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.clear();

    setUser(null);
  };

  // Loading spinner
  if (!isInitialized) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div
          className="spinner"
          style={{
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #3498db",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  const ProtectedRoute = ({ children }) =>
    !user ? <Navigate to="/login" /> : children;

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />

          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage
                  user={user}
                  setUser={setUser}
                  onLogout={handleLogout}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor-login"
            element={<DoctorLoginPage onLoginSuccess={setUser} />}
          />
          <Route path="/doctor-register" element={<DoctorRegisterPage />} />
          <Route path="/doctor-verify" element={<DoctorVerifyPage />} />

          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <UserProfilePage user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          {/* ✅ Thêm route Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                {user?.role === "admin" ? (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/dashboard" />
                )}
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<h2>404 - Không tìm thấy trang</h2>} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;

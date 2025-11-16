// src/api/api.js
import axios from "axios";

// const API_BASE =
//   process.env.REACT_APP_API_BASE || "https://doverx-backend.onrender.com"; // server

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000"; // local
// 🔹 Hàm lấy access token từ localStorage
const getAccessToken = () => {
  const raw = localStorage.getItem("user");
  if (raw) {
    try {
      const u = JSON.parse(raw);
      return u?.access || u?.tokens?.access || u?.token || null;
    } catch {}
  }
  return (
    localStorage.getItem("access") || localStorage.getItem("token") || null
  );
};

// 🔹 Tạo instance axios
const api = axios.create({ baseURL: API_BASE });

// 🧩 Interceptor 1 — luôn gửi token kèm mọi request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🧩 Interceptor 2 — tự refresh access token khi hết hạn
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu backend trả về 401 (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh =
        localStorage.getItem("refresh") ||
        JSON.parse(localStorage.getItem("user") || "{}")?.refresh;

      if (!refresh) {
        console.warn("⚠️ Không có refresh token");
        // ❌ KHÔNG logout ngay, chỉ redirect đến login
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          `${API_BASE}/api/accounts/token/refresh/`,
          { refresh }
        );

        const newAccess = res.data.access;
        if (!newAccess) throw new Error("Không có access token mới");

        // ✅ Lưu access token mới
        localStorage.setItem("access", newAccess);

        // ✅ Cập nhật user trong localStorage
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          const user = JSON.parse(rawUser);
          user.access = newAccess;
          localStorage.setItem("user", JSON.stringify(user));
        }

        // ✅ Gắn token mới và gửi lại request ban đầu
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (err) {
        console.error("❌ Refresh token failed:", err);
        // ❌ CHỈ XÓA TOKEN, KHÔNG XÓA USER
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

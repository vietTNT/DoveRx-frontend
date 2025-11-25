import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE;
// Biến để khóa process refresh
let isRefreshing = false;
// Hàng đợi các request bị lỗi chờ refresh xong
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 🔹 Hàm lấy access token từ localStorage
const getAccessToken = () => {
  // Ưu tiên lấy key 'access' riêng lẻ vì nó được cập nhật mới nhất
  return (
    localStorage.getItem("access") ||
    (() => {
      const raw = localStorage.getItem("user");
      if (raw) {
        try {
          const u = JSON.parse(raw);
          return u?.access || u?.tokens?.access || u?.token || null;
        } catch {}
      }
      return null;
    })()
  );
};

// Tạo instance axios
const api = axios.create({ baseURL: API_BASE });

//  luôn gửi token kèm mọi request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

//  tự refresh access token khi hết hạn
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      //  KỸ THUẬT LOCKING: Nếu đang có 1 request khác đang refresh,
      // các request đến sau sẽ đợi chứ không gọi refresh lại
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refresh =
        localStorage.getItem("refresh") ||
        JSON.parse(localStorage.getItem("user") || "{}")?.refresh;

      if (!refresh) {
        console.warn("⚠️ Không có refresh token, logout...");
        handleLogout();
        return Promise.reject(error);
      }

      try {
        // Gọi API refresh (dùng instance axios thuần để tránh loop interceptor)
        const res = await axios.post(
          `${API_BASE}/api/accounts/token/refresh/`,
          { refresh }
        );

        const newAccess = res.data.access;

        //Cập nhật token mới vào storage
        localStorage.setItem("access", newAccess);

        //  Cập nhật user object (quan trọng để đồng bộ)
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          try {
            const user = JSON.parse(rawUser);
            user.access = newAccess;
            // Nếu user object có cấu trúc user.tokens.access thì update cả đó
            if (user.tokens) user.tokens.access = newAccess;
            localStorage.setItem("user", JSON.stringify(user));
          } catch {}
        }

        //  Xử lý hàng đợi đang chờ
        processQueue(null, newAccess);

        // Gọi lại request ban đầu
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        console.error("❌ Refresh token failed:", err);
        handleLogout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Hàm logout sạch sẽ
const handleLogout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user"); // Xóa luôn user để tránh dữ liệu cũ
  window.location.href = "/login";
};

export default api;

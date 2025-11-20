// // src/api/api.js
// import axios from "axios";

// const API_BASE = process.env.REACT_APP_API_BASE;
// // 🔹 Hàm lấy access token từ localStorage
// const getAccessToken = () => {
//   const raw = localStorage.getItem("user");
//   if (raw) {
//     try {
//       const u = JSON.parse(raw);
//       return u?.access || u?.tokens?.access || u?.token || null;
//     } catch {}
//   }
//   return (
//     localStorage.getItem("access") || localStorage.getItem("token") || null
//   );
// };

// // 🔹 Tạo instance axios
// const api = axios.create({ baseURL: API_BASE });

// // 🧩 Interceptor 1 — luôn gửi token kèm mọi request
// api.interceptors.request.use((config) => {
//   const token = getAccessToken();
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// // 🧩 Interceptor 2 — tự refresh access token khi hết hạn
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     // Nếu backend trả về 401 (Unauthorized)
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       const refresh =
//         localStorage.getItem("refresh") ||
//         JSON.parse(localStorage.getItem("user") || "{}")?.refresh;

//       if (!refresh) {
//         console.warn("⚠️ Không có refresh token");
//         // ❌ KHÔNG logout ngay, chỉ redirect đến login
//         window.location.href = "/login";
//         return Promise.reject(error);
//       }

//       try {
//         const res = await axios.post(
//           `${API_BASE}/api/accounts/token/refresh/`,
//           { refresh }
//         );

//         const newAccess = res.data.access;
//         if (!newAccess) throw new Error("Không có access token mới");

//         // ✅ Lưu access token mới
//         localStorage.setItem("access", newAccess);

//         // ✅ Cập nhật user trong localStorage
//         const rawUser = localStorage.getItem("user");
//         if (rawUser) {
//           const user = JSON.parse(rawUser);
//           user.access = newAccess;
//           localStorage.setItem("user", JSON.stringify(user));
//         }

//         // ✅ Gắn token mới và gửi lại request ban đầu
//         originalRequest.headers.Authorization = `Bearer ${newAccess}`;
//         return api(originalRequest);
//       } catch (err) {
//         console.error("❌ Refresh token failed:", err);
//         // ❌ CHỈ XÓA TOKEN, KHÔNG XÓA USER
//         localStorage.removeItem("access");
//         localStorage.removeItem("refresh");
//         window.location.href = "/login";
//         return Promise.reject(err);
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;
// src/api/api.js
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

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 🔥 KỸ THUẬT LOCKING: Nếu đang có 1 request khác đang refresh,
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

        // ✅ Cập nhật token mới vào storage
        localStorage.setItem("access", newAccess);

        // ✅ Cập nhật user object (quan trọng để đồng bộ)
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

        // ✅ Xử lý hàng đợi đang chờ
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
  localStorage.removeItem("user"); // 🔥 PHẢI XÓA CÁI NÀY để chặn loop
  window.location.href = "/login";
};

export default api;

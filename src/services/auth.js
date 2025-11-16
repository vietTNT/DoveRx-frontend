import axios from "axios";

// const API_BASE =
//   process.env.REACT_APP_API_BASE || "https://doverx-backend.onrender.com"; // server
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000"; // local
export async function refreshTokenIfNeeded() {
  const access = localStorage.getItem("access");
  const refresh = localStorage.getItem("refresh");

  if (!access || !refresh) return null;

  // ✅ Kiểm tra access token còn hạn không
  try {
    const payload = JSON.parse(atob(access.split(".")[1]));
    const exp = payload.exp * 1000;
    if (Date.now() < exp) return access; // còn hạn
  } catch {
    console.warn("⚠️ Không decode được access token");
  }

  // ✅ Hết hạn → gọi API refresh
  try {
    const res = await axios.post(`${API_BASE}/api/accounts/token/refresh/`, {
      refresh,
    });
    localStorage.setItem("access", res.data.access);
    console.log("🔁 Token refreshed!");
    return res.data.access;
  } catch (e) {
    console.error("❌ Refresh token failed:", e);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    return null;
  }
}

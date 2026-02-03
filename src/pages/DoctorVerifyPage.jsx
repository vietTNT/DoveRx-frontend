// src/pages/DoctorVerifyPage.jsx
import React, { useState } from "react";
import "../styles/LoginPage.css";
import logo from "../assets/logo.png";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/language/LanguageSwitcher";

const DoctorVerifyPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Lấy thông tin từ state truyền qua
  const emailFromState = location.state?.email || "";
  const mode = location.state?.mode || "verify"; // 'verify' (mặc định) hoặc 'reset'

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState(""); // State cho mật khẩu mới
  const [loading, setLoading] = useState(false);

  // Tiêu đề thay đổi theo chế độ
  const title = mode === "reset" ? "Đặt lại mật khẩu" : t("auth.verify_title");
  const btnText = mode === "reset" ? "Đổi mật khẩu" : t("auth.verify_btn");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "reset") {
        // --- LOGIC RESET MẬT KHẨU ---
        await axios.post(
          `${process.env.REACT_APP_API_BASE}/api/accounts/password-reset/confirm/`,
          { email, otp, new_password: newPassword },
        );
        alert("✅ Đổi mật khẩu thành công! Vui lòng đăng nhập.");
      } else {
        // --- LOGIC XÁC THỰC TÀI KHOẢN (CŨ) ---
        await axios.post(
          `${process.env.REACT_APP_API_BASE}/api/accounts/verify-otp/`,
          { email, otp },
        );
        // alert("✅ Xác thực thành công!"); // Bỏ alert nếu muốn mượt
      }
      navigate("/doctor-login");
    } catch (error) {
      alert(error.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return alert("Vui lòng nhập email!");
    try {
      // Dùng chung endpoint resend hoặc tạo riêng nếu cần
      const endpoint =
        mode === "reset"
          ? `${process.env.REACT_APP_API_BASE}/api/accounts/password-reset/request/`
          : `${process.env.REACT_APP_API_BASE}/api/accounts/resend-otp/`;

      await axios.post(endpoint, { email });
      alert("✅ Mã xác nhận mới đã được gửi!");
    } catch (error) {
      alert("❌ Không thể gửi lại mã.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: "15px", right: "15px" }}>
          <LanguageSwitcher />
        </div>
        <img src={logo} alt="DoveRx" className="logo-img" />
        <h2>{title} 🩺</h2>
        <p>
          {mode === "reset"
            ? "Nhập OTP và mật khẩu mới"
            : t("auth.verify_desc")}
        </p>

        <form onSubmit={handleSubmit} className="doctor-form">
          <input
            type="email"
            placeholder={t("auth.placeholder_email_register")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!emailFromState} // Nếu email được truyền qua thì không cho sửa
            style={emailFromState ? { backgroundColor: "#f3f4f6" } : {}}
          />
          <input
            type="text"
            placeholder={t("auth.placeholder_otp")}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />

          {/* 👇 CHỈ HIỆN KHI Ở CHẾ ĐỘ RESET PASS */}
          {mode === "reset" && (
            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ marginTop: "10px" }}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: "15px" }}
          >
            {loading ? t("common.processing") : btnText}
          </button>
        </form>

        <p style={{ marginTop: "15px" }}>
          {t("auth.otp_not_received")}{" "}
          <span
            style={{ color: "#2563eb", cursor: "pointer" }}
            onClick={handleResend}
          >
            {t("auth.resend_otp")}
          </span>
        </p>

        {/* Nút quay lại */}
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/doctor-login")}
        >
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
};

export default DoctorVerifyPage;

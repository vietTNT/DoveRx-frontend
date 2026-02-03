// src/pages/DoctorLoginPage.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import logo from "../assets/logo.png";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/language/LanguageSwitcher";

const DoctorLoginPage = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // State cho Modal Quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    // ... (Giữ nguyên logic đăng nhập cũ) ...
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/login/`,
        { email, password },
      );
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      if (onLoginSuccess) onLoginSuccess(res.data.user);
      window.location.href = "/dashboard";
    } catch (error) {
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        t("common.error");
      alert("⚠️ " + msg);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi yêu cầu OTP quên mật khẩu
  const handleForgotPasswordRequest = async () => {
    if (!forgotEmail) {
      alert("Vui lòng nhập email!");
      return;
    }
    setForgotLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/password-reset/request/`,
        {
          email: forgotEmail,
        },
      );
      // Thành công -> Chuyển sang trang Verify để nhập OTP và Pass mới
      // Truyền state mode='reset' để trang Verify biết
      setShowForgotModal(false);
      navigate("/doctor-verify", {
        state: { email: forgotEmail, mode: "reset" },
      });
    } catch (error) {
      alert("Có lỗi xảy ra hoặc email không tồn tại.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: "relative" }}>
        {/* ... (Logo và LanguageSwitcher giữ nguyên) ... */}
        <div style={{ position: "absolute", top: "15px", right: "15px" }}>
          <LanguageSwitcher />
        </div>
        <img src={logo} alt="DoveRx Logo" className="logo-img" />
        <h2>{t("auth.login_doctor")} 👨‍⚕️</h2>

        <form onSubmit={handleSubmit} className="doctor-form">
          <input
            type="text"
            placeholder={t("auth.placeholder_email_user")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t("auth.placeholder_password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* 👇 Thêm nút Quên mật khẩu ở đây */}
          <div
            style={{
              textAlign: "right",
              marginTop: "-10px",
              marginBottom: "15px",
            }}
          >
            <span
              onClick={() => setShowForgotModal(true)}
              style={{
                color: "#2563eb",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              {t("auth.forgot_password") || "Quên mật khẩu?"}
            </span>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? t("common.processing") : t("auth.login_now")}
          </button>
        </form>

        <p style={{ marginTop: "10px" }}>
          {t("auth.no_account")}{" "}
          <span
            style={{ color: "#2563eb", cursor: "pointer" }}
            onClick={() => navigate("/doctor-register")}
          >
            {t("auth.register_now")}
          </span>
        </p>
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/login")}
        >
          {t("auth.back_to_user")}
        </button>
      </div>

      {/* 👇 MODAL NHẬP EMAIL QUÊN MẬT KHẨU (Tận dụng CSS otp-modal-overlay đã làm) */}
      {showForgotModal && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <h3 className="modal-title">Khôi phục mật khẩu</h3>
            <p className="modal-desc">Nhập email đã đăng ký để nhận mã OTP.</p>
            <input
              type="email"
              className="otp-input-field"
              style={{
                fontSize: "16px",
                letterSpacing: "normal",
                textAlign: "left",
              }}
              placeholder="example@gmail.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <div className="modal-actions">
              <button
                className="btn-confirm"
                onClick={handleForgotPasswordRequest}
                disabled={forgotLoading}
              >
                {forgotLoading ? "Đang gửi..." : "Gửi mã xác nhận"}
              </button>
              <button
                className="btn-otp-back"
                onClick={() => setShowForgotModal(false)}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLoginPage;

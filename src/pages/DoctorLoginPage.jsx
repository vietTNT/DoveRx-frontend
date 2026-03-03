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
    if (!forgotEmail) return alert(t("auth.please_enter_email"));
    setForgotLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/password-reset/request/`,
        {
          email: forgotEmail,
        },
      );

      setShowForgotModal(false);
      navigate("/doctor-verify", {
        state: { email: forgotEmail, mode: "reset" },
      });
    } catch (error) {
      alert(error.response?.data?.error || t("common.error_try_again"));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: "relative" }}>
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

      {showForgotModal && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <h3 className="modal-title">{t("auth.forgot_password_title")}</h3>
            <p className="modal-desc">{t("auth.forgot_password_desc")}</p>
            <input
              type="email"
              className="otp-input-field"
              style={{
                fontSize: "16px",
                letterSpacing: "normal",
                textAlign: "left",
              }}
              placeholder={t("auth.placeholder_email_register")}
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <div className="modal-actions">
              <button
                className="btn-confirm"
                onClick={handleForgotPasswordRequest}
                disabled={forgotLoading}
              >
                {forgotLoading ? t("auth.sending") : t("auth.send_otp")}
              </button>
              <button
                className="btn-otp-back"
                onClick={() => setShowForgotModal(false)}
              >
                {t("auth.cancel_otp")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLoginPage;

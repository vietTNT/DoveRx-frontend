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

  const emailFromState = location.state?.email || "";
  const mode = location.state?.mode || "verify";

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const title =
    mode === "reset" ? t("auth.reset_password") : t("auth.verify_title");
  const btnText =
    mode === "reset" ? t("auth.reset_password") : t("auth.verify_btn");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "reset") {
        await axios.post(
          `${process.env.REACT_APP_API_BASE}/api/accounts/password-reset/confirm/`,
          { email, otp, new_password: newPassword },
        );
        alert(t("auth.reset_password_success"));
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_BASE}/api/accounts/verify-otp/`,
          { email, otp },
        );
        // alert(t("auth.verify_success"));
      }
      navigate("/doctor-login");
    } catch (error) {
      alert(error.response?.data?.error || t("common.error_try_again"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return alert(t("auth.please_enter_email"));
    try {
      const endpoint =
        mode === "reset"
          ? `${process.env.REACT_APP_API_BASE}/api/accounts/password-reset/request/`
          : `${process.env.REACT_APP_API_BASE}/api/accounts/resend-otp/`;

      await axios.post(endpoint, { email });
      alert(t("auth.new_otp_sent"));
    } catch (error) {
      alert(t("auth.resend_otp_error"));
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
            ? t("auth.enter_otp_new_password")
            : t("auth.verify_desc")}
        </p>

        <form onSubmit={handleSubmit} className="doctor-form">
          <input
            type="email"
            placeholder={t("auth.placeholder_email_register")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!emailFromState}
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

          {mode === "reset" && (
            <input
              type="password"
              placeholder={t("auth.enter_new_password")}
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

        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/doctor-login")}
        >
          {t("auth.back_to_login")}
        </button>
      </div>
    </div>
  );
};

export default DoctorVerifyPage;

import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import logo from "../assets/logo.png";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/language/LanguageSwitcher";
const LoginPage = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) navigate("/dashboard");
  }, [navigate]);

  const handleSuccess = (response) => {
    setLoading(true);
    onLoginSuccess(response);

    setTimeout(() => {
      const user = localStorage.getItem("user");
      if (user) {
        navigate("/dashboard");
      } else {
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: "20px", right: "20px" }}>
          <LanguageSwitcher />
        </div>
        <img src={logo} alt="DoveRx Logo" className="logo-img" />
        <h2>{t("auth.welcome")}</h2>
        <p>{t("auth.tagline")}</p>

        {loading ? (
          <>
            <div className="loading-spinner"></div>
            <p>{t("auth.logging_in")}</p>
          </>
        ) : (
          <div className="login-button">
            <GoogleLogin onSuccess={handleSuccess} />
          </div>
        )}

        {/* 🔹 Thêm phần dành riêng cho bác sĩ */}
        <div className="doctor-login-section">
          <p>👨‍⚕️ {t("auth.login_doctor")}</p>
          <button
            className="doctor-btn"
            onClick={() => navigate("/doctor-login")}
          >
            {t("auth.login_doctor")}
          </button>
          <button
            className="doctor-btn-outline"
            onClick={() => navigate("/doctor-register")}
          >
            {t("auth.register_doctor")}
          </button>
        </div>

        <footer>{t("auth.copyright")}</footer>
      </div>
    </div>
  );
};

export default LoginPage;

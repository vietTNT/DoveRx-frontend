import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import logo from "../assets/logo.png";

const LoginPage = ({ onLoginSuccess }) => {
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
        alert("Đăng nhập thất bại, vui lòng thử lại!");
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={logo} alt="DoveRx Logo" className="logo-img" />
        <h2>Chào mừng đến với DoveRx</h2>
        <p>Đăng nhập để truy cập hệ thống chăm sóc sức khỏe thông minh</p>

        {loading ? (
          <>
            <div className="loading-spinner"></div>
            <p>Đang đăng nhập...</p>
          </>
        ) : (
          <div className="login-button">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => alert("Đăng nhập thất bại, vui lòng thử lại!")}
            />
          </div>
        )}

        {/* 🔹 Thêm phần dành riêng cho bác sĩ */}
        <div className="doctor-login-section">
          <p>👨‍⚕️ Dành cho bác sĩ:</p>
          <button
            className="doctor-btn"
            onClick={() => navigate("/doctor-login")}
          >
            Đăng nhập bác sĩ
          </button>
          <button
            className="doctor-btn-outline"
            onClick={() => navigate("/doctor-register")}
          >
            Đăng ký bác sĩ
          </button>
        </div>

        <footer>© 2025 DoveRx Healthcare Platform</footer>
      </div>
    </div>
  );
};

export default LoginPage;

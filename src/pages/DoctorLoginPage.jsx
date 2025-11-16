import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import logo from "../assets/logo.png";

const DoctorLoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // const res = await axios.post(
      //   "https://doverx-backend.onrender.com/api/accounts/login/", // server
      //   { email, password }
      // );
      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/login/`, // local
        { email, password }
      );

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      if (onLoginSuccess) {
        onLoginSuccess(res.data.user);
      }
      window.location.href = "/dashboard";
    } catch (error) {
      alert("❌ Đăng nhập thất bại, kiểm tra lại thông tin!");
      console.error(error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "Đăng nhập thất bại, vui lòng thử lại!";
      alert("⚠️ " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={logo} alt="DoveRx Logo" className="logo-img" />
        <h2>Đăng nhập bác sĩ 👨‍⚕️</h2>

        <form onSubmit={handleSubmit} className="doctor-form">
          <input
            type="text"
            placeholder="Tên đăng nhập hoặc Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "⏳ Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <p style={{ marginTop: "10px" }}>
          Chưa có tài khoản?{" "}
          <span
            style={{ color: "#2563eb", cursor: "pointer" }}
            onClick={() => navigate("/doctor-register")}
          >
            Đăng ký ngay
          </span>
        </p>
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/login")}
        >
          Quay lại đăng nhập người dùng
        </button>
      </div>
    </div>
  );
};

export default DoctorLoginPage;

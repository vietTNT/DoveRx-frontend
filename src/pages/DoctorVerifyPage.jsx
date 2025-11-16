import React, { useState } from "react";
import "../styles/LoginPage.css"; // dùng lại style cũ cho đồng bộ
import logo from "../assets/logo.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

const DoctorVerifyPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Gửi yêu cầu xác minh OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/verify-otp/`,
        {
          email,
          otp,
        }
      );

      alert("🎉 Xác minh thành công! Hãy đăng nhập để tiếp tục.");
      navigate("/doctor-login");
    } catch (error) {
      alert(error.response?.data?.error || "Mã xác nhận không hợp lệ!");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Gửi lại mã OTP (nếu cần)
  const handleResend = async () => {
    if (!email) {
      alert("Vui lòng nhập email trước!");
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/register/doctor/`, // server
        { email }
      );
      // await axios.post("http://localhost:8000/api/accounts/register/doctor/", {
      //   // local
      //   email,
      // });
      alert("✅ Mã xác nhận mới đã được gửi lại!");
    } catch (error) {
      alert("❌ Không thể gửi lại mã, vui lòng thử lại.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={logo} alt="DoveRx" className="logo-img" />
        <h2>Xác minh tài khoản bác sĩ 🩺</h2>
        <p>Nhập email và mã OTP đã được gửi để kích hoạt tài khoản</p>

        <form onSubmit={handleVerify} className="doctor-form">
          <input
            type="email"
            placeholder="Nhập email đã đăng ký"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Nhập mã OTP (6 chữ số)"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Đang xác minh..." : "Xác minh"}
          </button>
        </form>

        <p style={{ marginTop: "15px" }}>
          Không nhận được mã?{" "}
          <span
            style={{ color: "#2563eb", cursor: "pointer" }}
            onClick={handleResend}
          >
            Gửi lại mã
          </span>
        </p>

        <footer>© 2025 DoveRx Healthcare Platform</footer>
      </div>
    </div>
  );
};

export default DoctorVerifyPage;

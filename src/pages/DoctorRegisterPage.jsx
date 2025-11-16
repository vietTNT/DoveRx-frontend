import React, { useState } from "react";
import "../styles/LoginPage.css"; // hoặc dùng LoginPage.css nếu chung style
import logo from "../assets/logo.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const DoctorRegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    specialty: "",
    workplace: "",
    phone: "",
    license_number: "",
    doctorType: "doctor", // mặc định
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/register/doctor/`, // server
        {
          ...formData,
        }
      );
      // await axios.post("http://localhost:8000/api/accounts/register/doctor/", {
      //   // local
      //   ...formData,
      // });
      alert("✅ Đăng ký thành công! Vui lòng xác minh email bằng mã OTP.");
      navigate("/doctor-verify", { state: { email: formData.email } });
    } catch (error) {
      const msg =
        error.response?.data?.error || "Có lỗi khi đăng ký, vui lòng thử lại!";
      alert("⚠️ " + msg);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={logo} alt="DoveRx" className="logo-img" />
        <h2>Đăng ký tài khoản bác sĩ 👨‍⚕️</h2>
        <p>Vui lòng nhập thông tin để tham gia nền tảng DoveRx</p>

        <form onSubmit={handleSubmit} className="doctor-form">
          <input
            name="username"
            placeholder="Tên đăng nhập"
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Mật khẩu"
            onChange={handleChange}
            required
          />
          <input name="first_name" placeholder="Họ" onChange={handleChange} />
          <input name="last_name" placeholder="Tên" onChange={handleChange} />
          <input
            name="specialty"
            placeholder="Chuyên khoa"
            onChange={handleChange}
          />
          <input
            name="workplace"
            placeholder="Nơi làm việc"
            onChange={handleChange}
          />
          <input
            name="phone"
            placeholder="Số điện thoại"
            onChange={handleChange}
          />
          <input
            name="license_number"
            placeholder="Chứng chỉ hành nghề (nếu có)"
            onChange={handleChange}
          />

          {/* 🩺 Chọn loại bác sĩ */}
          <div className="doctor-type-group">
            <label>
              <input
                type="radio"
                name="doctorType"
                value="doctor"
                checked={formData.doctorType === "doctor"}
                onChange={handleChange}
              />
              👨‍⚕️ Bác sĩ chính thức
            </label>
            <label>
              <input
                type="radio"
                name="doctorType"
                value="student"
                checked={formData.doctorType === "student"}
                onChange={handleChange}
              />
              🎓 Sinh viên y khoa
            </label>
            <label>
              <input
                type="radio"
                name="doctorType"
                value="intern"
                checked={formData.doctorType === "intern"}
                onChange={handleChange}
              />
              🧑‍🔬 Thực tập sinh
            </label>
          </div>

          <button type="submit">Đăng ký</button>
        </form>

        <p>
          Đã có tài khoản?{" "}
          <span onClick={() => navigate("/doctor-login")}>Đăng nhập</span>
        </p>
      </div>
    </div>
  );
};

export default DoctorRegisterPage;

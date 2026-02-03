import React, { useState } from "react";
import "../styles/LoginPage.css";
import logo from "../assets/logo.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/language/LanguageSwitcher";

const DoctorRegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State lưu thông tin form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    specialty: "",
    workplace: "",
    phone: "",
    license_number: "",
    doctorType: "doctor",
  });

  // State lưu file
  const [files, setFiles] = useState([]);

  // State quản lý Modal OTP và Loading
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Xử lý thay đổi file
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  // Xử lý thay đổi input text
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- BƯỚC 1: Gọi API để lấy OTP (Chưa gửi file) ---
  const handleInitiateRegister = async (e) => {
    e.preventDefault();

    // Validate cơ bản
    if (files.length === 0) {
      alert(t("doctor_form.license") + " là bắt buộc!");
      return;
    }

    setLoading(true);
    try {
      // Gọi API bước 1: Kiểm tra email và gửi OTP
      // Lưu ý: Đảm bảo Backend đã có endpoint này như ở bước trước
      await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/register/initiate/`,
        { email: formData.email },
      );

      // Thành công -> Hiện Modal nhập OTP
      setShowOtpModal(true);
    } catch (error) {
      const msg = error.response?.data?.error || t("common.error");
      alert("⚠️ " + msg);
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC 2: Gửi OTP + Toàn bộ Form + File để tạo tài khoản ---
  const handleConfirmOtp = async () => {
    if (!otp || otp.length < 6) {
      alert("Vui lòng nhập mã OTP hợp lệ");
      return;
    }
    setLoading(true);

    // Tạo FormData để gửi file
    const data = new FormData();

    // 1. Append dữ liệu text
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key]);
    });

    // 2. Append OTP
    data.append("otp", otp);

    // 3. Append Files
    files.forEach((file) => {
      data.append("license_files", file);
    });

    try {
      // Gọi API bước 2: Hoàn tất đăng ký
      await axios.post(
        `${process.env.REACT_APP_API_BASE}/api/accounts/register/complete/`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      // Đăng ký xong -> Chuyển sang trang Login
      navigate("/doctor-login");
    } catch (error) {
      const msg = error.response?.data?.error || t("common.error");
      alert("❌ " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: "15px", right: "15px" }}>
          <LanguageSwitcher />
        </div>
        <img src={logo} alt="DoveRx" className="logo-img" />
        <h2>{t("auth.register_doctor_title")} 👨‍⚕️</h2>
        <p>{t("auth.register_doctor_desc")}</p>

        {/* Form nhập liệu - Disable khi Modal hiện */}
        <form
          onSubmit={handleInitiateRegister}
          className="doctor-form"
          style={{ opacity: showOtpModal ? 0.3 : 1 }}
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            required
            disabled={showOtpModal}
          />
          <input
            name="password"
            type="password"
            placeholder={t("auth.placeholder_password")}
            onChange={handleChange}
            required
            disabled={showOtpModal}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              name="first_name"
              placeholder={t("doctor_form.first_name")}
              onChange={handleChange}
              required
              style={{ flex: 1 }}
              disabled={showOtpModal}
            />
            <input
              name="last_name"
              placeholder={t("doctor_form.last_name")}
              onChange={handleChange}
              required
              style={{ flex: 1 }}
              disabled={showOtpModal}
            />
          </div>

          <input
            name="specialty"
            placeholder={t("doctor_form.specialty")}
            onChange={handleChange}
            required
            disabled={showOtpModal}
          />
          <input
            name="workplace"
            placeholder={t("doctor_form.workplace")}
            onChange={handleChange}
            required
            disabled={showOtpModal}
          />
          <input
            name="phone"
            placeholder={t("doctor_form.phone")}
            onChange={handleChange}
            required
            disabled={showOtpModal}
          />

          <div className="form-group">
            <label>{t("doctor_form.license")}</label>
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileChange}
              required
              disabled={showOtpModal}
            />
            {files.length > 0 && (
              <ul style={{ fontSize: "12px", marginTop: "5px", color: "#666" }}>
                {files.map((f, index) => (
                  <li key={index}>📎 {f.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="doctor-type-group">
            <label>
              <input
                type="radio"
                name="doctorType"
                value="doctor"
                checked={formData.doctorType === "doctor"}
                onChange={handleChange}
                disabled={showOtpModal}
              />
              👨‍⚕️ {t("doctor_form.type_doctor")}
            </label>
            <label>
              <input
                type="radio"
                name="doctorType"
                value="student"
                checked={formData.doctorType === "student"}
                onChange={handleChange}
                disabled={showOtpModal}
              />
              🎓 {t("doctor_form.type_student")}
            </label>
            <label>
              <input
                type="radio"
                name="doctorType"
                value="intern"
                checked={formData.doctorType === "intern"}
                onChange={handleChange}
                disabled={showOtpModal}
              />
              🧑‍🔬 {t("doctor_form.type_intern")}
            </label>
          </div>

          <button type="submit" disabled={loading || showOtpModal}>
            {loading
              ? t("common.processing")
              : t("doctor_form.register_doctor")}
          </button>
        </form>

        <p>
          {t("auth.have_account")}{" "}
          <span onClick={() => !showOtpModal && navigate("/doctor-login")}>
            {t("auth.login_now")}
          </span>
        </p>
      </div>

      {/* --- MODAL OTP --- */}
      {/* --- OTP MODAL OVERLAY (Đã làm đẹp) --- */}
      {showOtpModal && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <div className="modal-icon">🔒</div>
            <h3 className="modal-title">Xác thực bảo mật</h3>
            <p className="modal-desc">
              Mã OTP gồm 6 chữ số đã được gửi đến email:
              <br />
              <span className="highlight-email">{formData.email}</span>
            </p>

            <input
              type="text"
              className="otp-input-field"
              value={otp}
              onChange={(e) => {
                // Chỉ cho phép nhập số
                const val = e.target.value.replace(/[^0-9]/g, "");
                setOtp(val);
              }}
              placeholder="------"
              maxLength={6}
              autoFocus
            />

            <div className="modal-actions">
              <button
                className="btn-confirm"
                onClick={handleConfirmOtp}
                disabled={loading || otp.length < 6}
              >
                {loading ? "Đang xử lý..." : "Xác nhận ngay"}
              </button>

              <button
                className="btn-otp-back"
                onClick={() => {
                  setShowOtpModal(false);
                  setLoading(false);
                }}
                disabled={loading}
              >
                Quay lại kiểm tra thông tin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorRegisterPage;

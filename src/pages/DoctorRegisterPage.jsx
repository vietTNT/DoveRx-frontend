import React, { useState } from "react";
import "../styles/LoginPage.css"; // hoặc dùng LoginPage.css nếu chung style
import logo from "../assets/logo.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/language/LanguageSwitcher";
const DoctorRegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

      alert("✅ " + t("common.success") + "! " + t("auth.verify_desc"));
      navigate("/doctor-verify", { state: { email: formData.email } });
    } catch (error) {
      const msg = error.response?.data?.error || t("common.error");
      alert("⚠️ " + msg);
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

        <form onSubmit={handleSubmit} className="doctor-form">
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
            placeholder={t("auth.placeholder_password")}
            onChange={handleChange}
            required
          />
          <input
            name="first_name"
            placeholder={t("doctor_form.first_name")}
            onChange={handleChange}
          />
          <input
            name="last_name"
            placeholder={t("doctor_form.last_name")}
            onChange={handleChange}
          />
          <input
            name="specialty"
            placeholder={t("doctor_form.specialty")}
            onChange={handleChange}
          />
          <input
            name="workplace"
            placeholder={t("doctor_form.workplace")}
            onChange={handleChange}
          />
          <input
            name="phone"
            placeholder={t("doctor_form.phone")}
            onChange={handleChange}
          />
          <input
            name="license_number"
            placeholder={t("doctor_form.license")}
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
              👨‍⚕️ {t("doctor_form.type_doctor")}
            </label>
            <label>
              <input
                type="radio"
                name="doctorType"
                value="student"
                checked={formData.doctorType === "student"}
                onChange={handleChange}
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
              />
              🧑‍🔬 {t("doctor_form.type_intern")}
            </label>
          </div>

          <button type="submit">{t("doctor_form.register_doctor")}</button>
        </form>

        <p>
          {t("auth.have_account")}{" "}
          <span onClick={() => navigate("/doctor-login")}>
            {t("auth.login_now")}
          </span>
        </p>
      </div>
    </div>
  );
};

export default DoctorRegisterPage;

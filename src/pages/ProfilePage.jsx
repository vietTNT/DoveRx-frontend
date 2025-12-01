import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import AvatarEditorModal from "../components/avatar/AvatarEditor";
import "../styles/ProfilePage.css";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
const getAvatarUrl = (a) => {
  const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  const avatar = a || "";
  if (!avatar) return defaultAvatar;
  // giữ nguyên nếu là blob/data hoặc đã là full URL
  if (
    avatar.startsWith("http") ||
    avatar.startsWith("blob:") ||
    avatar.startsWith("data:")
  )
    return avatar;
  const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
  const path = avatar.startsWith("/") ? avatar : `/${avatar}`;
  return base ? `${base}${path}` : path;
};

// --- NEW: chuẩn hóa giá trị gender từ API -> label hiển thị
const apiToLabelGender = (g) => {
  if (!g && g !== 0) return "";
  const s = String(g).toLowerCase().trim();
  if (s.includes("male") || s === "m" || s === "nam") return "male";
  if (s.includes("female") || s === "f" || s === "nữ" || s === "nu")
    return "female";
  return "other";
};
const getDoctorTypeLabel = (type, t) => {
  const mapping = {
    doctor: t("doctor_form.type_doctor"),
    student: t("doctor_form.type_student"),
    intern: t("doctor_form.type_intern"),
  };
  return mapping[type] || type;
};
const ProfilePage = ({ onLogout, user: appUser, setUser: setAppUser }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState(appUser || null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    gender: "",
    age: "",
    phone: "",
    address: "",
    bio: "",
    avatar: "",
    specialty: "",
    workplace: "",
    experience_years: "",
    license_number: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  //  State cho Avatar Editor
  const [showEditor, setShowEditor] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const displayGender = (genderKey) => {
    if (!genderKey) return t("profile.not_updated");
    if (genderKey === "male") return t("profile.gender_male");
    if (genderKey === "female") return t("profile.gender_female");
    return t("profile.gender_other");
  };
  useEffect(() => {
    // Ưu tiên lấy từ prop appUser nếu có, fallback localStorage
    const storedUser =
      appUser || JSON.parse(localStorage.getItem("user") || "null");
    if (storedUser) {
      setUser(storedUser);
      setFormData({
        first_name: storedUser.first_name || "",
        last_name: storedUser.last_name || "",

        gender: apiToLabelGender(storedUser.gender),
        age: storedUser.age || "",
        phone: storedUser.phone || "",
        address: storedUser.address || "",
        bio: storedUser.bio || "",
        doctorType: storedUser.doctor_type || "doctor",
        avatar: "",
        doctorType: storedUser.doctor_type || "doctor",
        specialty: storedUser.specialty || "",
        workplace: storedUser.workplace || "",
        experience_years: storedUser.experience_years || "",
        license_number: storedUser.license_number || "",
      });

      setAvatarPreview(
        storedUser.avatar ? getAvatarUrl(storedUser.avatar) : ""
      );
    }
  }, [appUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  //  Xử lý chọn ảnh
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawImage(URL.createObjectURL(file));
      setShowEditor(true);
    }
  };

  const handleSaveAvatar = (croppedFile) => {
    // KHÔNG block UI: không dùng async ở đây, chỉ chạy sync rất nhanh
    setRawImage(null); // dọn state ảnh raw

    // 1. Tạo URL tạm để hiển thị mượt ngay lập tức
    const tempUrl = URL.createObjectURL(croppedFile);

    const oldAvatar = user?.avatar || null;
    const oldPreview = avatarPreview;

    // 2. Cập nhật giao diện ngay (Optimistic UI)
    setAvatarPreview(tempUrl);
    setFormData((prev) => ({ ...prev, avatar: croppedFile }));

    const tempUser = { ...user, avatar: tempUrl };
    setUser(tempUser);

    // Bắn event để Navbar đổi avatar ngay (dùng blob URL)
    window.dispatchEvent(
      new CustomEvent("user:updated", {
        detail: { user: tempUser },
      })
    );

    // 3. UPLOAD NGẦM LÊN SERVER (background)
    (async () => {
      try {
        const token = localStorage.getItem("access");
        const formData = new FormData();
        formData.append("avatar", croppedFile);

        const res = await axios.put(
          `${process.env.REACT_APP_API_BASE}/api/accounts/update-profile/`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const updatedUser = res.data; // chứa URL Cloudinary thật

        // Lưu lại để F5 không mất
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Cập nhật user local + preview bằng URL thật từ Cloudinary
        setUser(updatedUser);
        setAvatarPreview(
          updatedUser.avatar ? getAvatarUrl(updatedUser.avatar) : ""
        );

        // Bắn event lần nữa để App/Navbar dùng URL Cloudinary (không còn blob:)
        // Cập nhật local
        setUser(updatedUser);
        setAvatarPreview(getAvatarUrl(updatedUser.avatar));

        // Đồng bộ lên App cha
        if (setAppUser) setAppUser(updatedUser);

        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Giải phóng blob tạm cho đỡ leak RAM
        URL.revokeObjectURL(tempUrl);

        toast.success("Đã cập nhật ảnh đại diện!");
      } catch (error) {
        console.error("Lỗi upload avatar:", error);
        toast.error("Lỗi cập nhật ảnh, đang hoàn tác...");

        // 4. ROLLBACK nếu upload lỗi
        setUser((prev) => ({ ...prev, avatar: oldAvatar }));
        setAvatarPreview(oldPreview);
        setFormData((prev) => ({ ...prev, avatar: oldAvatar }));

        window.dispatchEvent(
          new CustomEvent("user:updated", {
            detail: { user: { ...user, avatar: oldAvatar } },
          })
        );
      }
    })();
  };

  //  Xóa avatar về mặc định
  const handleRemoveAvatar = async () => {
    if (!window.confirm(t("profile.confirm_remove_avatar"))) return;

    try {
      const token = localStorage.getItem("access");
      const res = await axios.delete(
        `${process.env.REACT_APP_API_BASE}/api/accounts/remove-avatar/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset avatar
      const defaultAvatar =
        "https://cdn-icons-png.flaticon.com/512/847/847969.png";
      setAvatarPreview(defaultAvatar);

      const updatedUser = { ...user, avatar: null };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      if (setAppUser) setAppUser(updatedUser);

      toast.success("✅ Đã xóa ảnh đại diện!");
    } catch (error) {
      console.error("❌ Lỗi khi xóa avatar:", error);
      toast.error("Không thể xóa ảnh đại diện!");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const token = localStorage.getItem("access");
      const form = new FormData();

      const skip = ["id", "email", "role", "avatar", "gender"];

      for (const key in formData) {
        if (skip.includes(key)) continue;
        const v = formData[key];
        if (v !== undefined && v !== null && v !== "") {
          form.append(key, v);
        }
      }

      // Map gender
      const gMap = { Nam: "male", Nữ: "female", Khác: "other", "": "" };
      const genderValue = gMap[formData.gender] || formData.gender;
      if (genderValue) form.append("gender", genderValue);

      const res = await axios.put(
        `${process.env.REACT_APP_API_BASE}/api/accounts/update-profile/`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const finalUser = res.data;

      setFormData((prev) => ({
        ...prev,
        gender: apiToLabelGender(finalUser.gender),
      }));

      setUser(finalUser);
      if (setAppUser) setAppUser(finalUser);
      localStorage.setItem("user", JSON.stringify(finalUser));

      toast.success("🎉 Thông tin đã được lưu!");
      setIsEditing(false); // Thoát chế độ sửa

      window.dispatchEvent(
        new CustomEvent("user:updated", {
          detail: { user: finalUser },
        })
      );
    } catch (error) {
      console.error("❌ Update profile failed", error);
      toast.error("Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  if (!user)
    return (
      <div>
        <Navbar user={null} onLogout={onLogout} />
        <div style={{ textAlign: "center", marginTop: "80px" }}>
          <h3>⚠️ Bạn chưa đăng nhập</h3>
        </div>
      </div>
    );

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="profile-container">
        <div className="profile-card">
          <div className="avatar-section">
            <img
              src={getAvatarUrl(avatarPreview || user?.avatar)}
              alt="Avatar"
              className="profile-avatar"
            />
            {isEditing && (
              <div className="avatar-buttons">
                <button
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📸 {t("profile.change_avatar")}
                </button>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  hidden
                  ref={fileInputRef}
                />

                {avatarPreview &&
                  avatarPreview !==
                    "https://cdn-icons-png.flaticon.com/512/847/847969.png" && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="remove-avatar-btn"
                    >
                      🗑️ {t("profile.remove_avatar")}
                    </button>
                  )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="edit-form">
              <div className="inline-fields">
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder={t("profile.first_name")}
                />
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder={t("profile.last_name")}
                />
              </div>

              <div className="inline-fields">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">{t("profile.gender")}</option>
                  <option value="Nam">{t("profile.gender_male")}</option>
                  <option value="Nữ">{t("profile.gender_female")}</option>
                  <option value="Khác">{t("profile.gender_other")}</option>
                </select>
                <input
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder={t("profile.age")}
                  type="number"
                />
              </div>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t("profile.phone")}
              />
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder={t("profile.address")}
              />
              {user.role === "doctor" && (
                <>
                  <input
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    placeholder={t("profile.specialty")}
                  />
                  <input
                    name="workplace"
                    value={formData.workplace}
                    onChange={handleChange}
                    placeholder={t("profile.workplace")}
                  />
                  <select
                    name="doctorType"
                    value={formData.doctorType}
                    onChange={handleChange}
                    className="profile-select"
                  >
                    <option value="doctor">
                      {t("doctor_form.type_doctor")}
                    </option>
                    <option value="student">
                      {t("doctor_form.type_student")}
                    </option>
                    <option value="intern">
                      {t("doctor_form.type_intern")}
                    </option>
                  </select>
                  <input
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                    placeholder={t("profile.experience_years")}
                    type="number"
                  />
                  <input
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleChange}
                    placeholder={t("profile.license_number")}
                  />
                </>
              )}
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder={t("profile.bio")}
              />
              <button onClick={handleSave} className="save-btn">
                💾 {t("profile.save_changes")}
              </button>
            </div>
          ) : (
            <div className="info-section">
              <h2>
                {user.first_name || ""} {user.last_name || user.username}
              </h2>
              <p>
                <b>Email:</b> {user.email}
              </p>
              <p>
                <b>{t("profile.gender")}:</b>{" "}
                {displayGender(apiToLabelGender(user.gender))}
              </p>
              <p>
                <b>{t("profile.age")}:</b>{" "}
                {user.age || t("profile.not_updated")}
              </p>
              <p>
                <b>{t("profile.phone")}:</b>{" "}
                {user.phone || t("profile.not_updated")}
              </p>
              <p>
                <b>{t("profile.address")}:</b>{" "}
                {user.address || t("profile.not_updated")}
              </p>

              {user.role === "doctor" && (
                <>
                  <p>
                    <b>{t("profile.specialty")}:</b>{" "}
                    {user.specialty || t("profile.not_updated")}
                  </p>
                  <p>
                    <b>{t("profile.workplace")}:</b>{" "}
                    {user.workplace || t("profile.not_updated")}
                  </p>
                  <p>
                    <b>{t("profile.doctor_type")}:</b>{" "}
                    {user.doctor_type
                      ? getDoctorTypeLabel(user.doctor_type, t)
                      : t("profile.not_updated")}
                  </p>
                  <p>
                    <b>{t("profile.experience_years")}:</b>{" "}
                    {user.experience_years || t("profile.not_updated")}
                  </p>
                  <p>
                    <b>{t("profile.license_number")}:</b>{" "}
                    {user.license_number || t("profile.not_updated")}
                  </p>
                </>
              )}

              <p>
                <b>{t("profile.bio")}:</b>{" "}
                {user.bio || t("profile.not_updated")}
              </p>
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                ✏️ {t("common.edit")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🆕 Avatar Editor Modal */}
      {showEditor && (
        <AvatarEditorModal
          image={rawImage}
          onSave={handleSaveAvatar}
          onCancel={() => {
            setShowEditor(false);
            setRawImage(null);
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;

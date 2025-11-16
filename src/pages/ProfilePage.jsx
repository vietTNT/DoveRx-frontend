import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import AvatarEditorModal from "../components/avatar/AvatarEditor";
import "../styles/ProfilePage.css";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProfilePage = ({ onLogout, user: appUser, setUser: setAppUser }) => {
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

  // 🆕 State cho Avatar Editor
  const [showEditor, setShowEditor] = useState(false);
  const [rawImage, setRawImage] = useState(null);

  useEffect(() => {
    // Ưu tiên lấy từ prop appUser nếu có, fallback localStorage
    const storedUser =
      appUser || JSON.parse(localStorage.getItem("user") || "null");
    if (storedUser) {
      setUser(storedUser);
      setFormData({
        first_name: storedUser.first_name || "",
        last_name: storedUser.last_name || "",
        gender: storedUser.gender || "",
        age: storedUser.age || "",
        phone: storedUser.phone || "",
        address: storedUser.address || "",
        bio: storedUser.bio || "",
        avatar: "", // only store File here when user selects new image
      });
      setAvatarPreview(storedUser.avatar || "");
    }
  }, [appUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 🆕 Xử lý chọn ảnh
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawImage(URL.createObjectURL(file));
      setShowEditor(true);
    }
  };

  // 🆕 Lưu ảnh đã crop
  const handleSaveAvatar = (croppedFile) => {
    setFormData({ ...formData, avatar: croppedFile });
    setAvatarPreview(URL.createObjectURL(croppedFile));
    setShowEditor(false);
    setRawImage(null);
  };

  // 🆕 Xóa avatar về mặc định
  const handleRemoveAvatar = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa ảnh đại diện?")) return;

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
      const token = localStorage.getItem("access");
      const form = new FormData();

      // 1️⃣ Append các field (trừ avatar & gender)
      const skip = ["id", "email", "role", "avatar", "gender"];
      for (const key in formData) {
        if (skip.includes(key)) continue;
        const v = formData[key];
        if (v !== undefined && v !== null) form.append(key, v);
      }

      // 2️⃣ Append avatar nếu là file
      if (formData.avatar instanceof File) {
        form.append("avatar", formData.avatar);
      }

      // 3️⃣ Append gender
      const gMap = { Nam: "male", Nữ: "female", Khác: "other", "": "" };
      const genderValue = gMap.hasOwnProperty(formData.gender)
        ? gMap[formData.gender]
        : formData.gender || "";
      if (genderValue !== "") form.append("gender", genderValue);

      // 4️⃣ Gửi API update
      const res = await axios.put(
        `${process.env.REACT_APP_API_BASE}/api/accounts/update-profile/`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Giữ lại token cũ & user cũ
      const oldUser = JSON.parse(localStorage.getItem("user")) || {};
      const updatedUser = { ...oldUser, ...res.data };

      // Lưu user mới mà KHÔNG làm mất token
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      if (setAppUser) setAppUser(updatedUser);

      toast.success("✅ Hồ sơ đã được lưu thành công!");

      // 6️⃣ Refresh lại profile mới nhất
      const refreshed = await axios.get(
        `${process.env.REACT_APP_API_BASE}/api/accounts/profile/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Cập nhật lại dữ liệu mà vẫn giữ token
      const finalUser = { ...updatedUser, ...refreshed.data };

      localStorage.setItem("user", JSON.stringify(finalUser));
      setUser(finalUser);
      if (setAppUser) setAppUser(finalUser);
      setFormData({ ...finalUser, avatar: "" });
      setAvatarPreview(finalUser.avatar || "");

      setIsEditing(false);
      window.dispatchEvent(new CustomEvent("user:updated"));
    } catch (error) {
      console.error(
        "❌ Lỗi khi cập nhật hồ sơ:",
        error.response?.data || error
      );
      alert("Cập nhật thất bại!");
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
              src={
                avatarPreview ||
                user?.avatar ||
                "https://cdn-icons-png.flaticon.com/512/847/847969.png"
              }
              alt="Avatar"
              className="profile-avatar"
            />
            {isEditing && (
              <div className="avatar-buttons">
                <label className="upload-btn">
                  📸 Đổi ảnh
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    hidden
                  />
                </label>

                {/* 🆕 Nút xóa avatar */}
                {avatarPreview &&
                  avatarPreview !==
                    "https://cdn-icons-png.flaticon.com/512/847/847969.png" && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="remove-avatar-btn"
                    >
                      🗑️ Xóa ảnh
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
                  placeholder="Họ"
                />
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Tên"
                />
              </div>

              <div className="inline-fields">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
                <input
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Tuổi"
                  type="number"
                />
              </div>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Số điện thoại"
              />
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Địa chỉ"
              />
              {user.role === "doctor" && (
                <>
                  <input
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    placeholder="Chuyên khoa"
                  />
                  <input
                    name="workplace"
                    value={formData.workplace}
                    onChange={handleChange}
                    placeholder="Nơi làm việc"
                  />
                  <input
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                    placeholder="Số năm kinh nghiệm"
                    type="number"
                  />
                  <input
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleChange}
                    placeholder="Số chứng chỉ hành nghề"
                  />
                </>
              )}
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Giới thiệu bản thân / kinh nghiệm chuyên môn"
              />
              <button onClick={handleSave} className="save-btn">
                💾 Lưu thay đổi
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
                <b>Giới tính:</b>{" "}
                {user.gender === "male"
                  ? "Nam"
                  : user.gender === "female"
                  ? "Nữ"
                  : user.gender === "other"
                  ? "Khác"
                  : "Chưa cập nhật"}
              </p>
              <p>
                <b>Tuổi:</b> {user.age || "Chưa cập nhật"}
              </p>
              <p>
                <b>Số điện thoại:</b> {user.phone || "Chưa cập nhật"}
              </p>
              <p>
                <b>Địa chỉ:</b> {user.address || "Chưa cập nhật"}
              </p>

              {user.role === "doctor" && (
                <>
                  <p>
                    <b>Chuyên khoa:</b> {user.specialty || "Chưa cập nhật"}
                  </p>
                  <p>
                    <b>Nơi làm việc:</b> {user.workplace || "Chưa cập nhật"}
                  </p>
                  <p>
                    <b>Loại bác sĩ:</b> {user.doctor_type || "Không xác định"}
                  </p>
                  <p>
                    <b>Số năm kinh nghiệm:</b>{" "}
                    {user.experience_years || "Chưa cập nhật"}
                  </p>
                  <p>
                    <b>Chứng chỉ hành nghề:</b>{" "}
                    {user.license_number || "Chưa cập nhật"}
                  </p>
                </>
              )}

              <p>
                <b>Bio:</b> {user.bio || "Chưa có mô tả."}
              </p>
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                ✏️ Chỉnh sửa
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

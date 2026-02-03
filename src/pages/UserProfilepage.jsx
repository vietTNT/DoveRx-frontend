import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import AvatarEditorModal from "../components/avatar/AvatarEditor";
import { resolveImageUrl } from "../utils/imageHelper";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../services/friendApi";
import { getOrCreateConversation } from "../services/chatApi";
import api from "../api/api";
import axios from "axios";
import "../styles/userProfile/UserProfilepage.css";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import UserPostsTab from "../components/profile/UserPostsTab";
import UserMediaTab from "../components/profile/UserMediaTab";
import UserFriendsTab from "../components/profile/UserFriendsTab";
// Helper lấy giá trị RGB
const getRgbFromHex = (hex) => {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split("");
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",");
  }
  return "255,205,56";
};

const UserProfilePage = ({ user: currentUser, onLogout, setAppUser }) => {
  const { t } = useTranslation();
  const { userId } = useParams();

  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");

  // --- STATE CHỈNH SỬA & FORM ---
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    age: "",
    phone: "",
    address: "",
    bio: "",
    specialty: "",
    workplace: "",
    experience_years: "",
    license_number: "",
    doctorType: "doctor",
  });

  // --- STATE AVATAR ---
  const [showEditor, setShowEditor] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const fileInputRef = useRef(null);

  // Theme Color
  const [accentColor, setAccentColor] = useState(
    localStorage.getItem("profileAccentColor") || "#ffcd38",
  );
  const [showThemePicker, setShowThemePicker] = useState(false);

  const isMe =
    currentUser && (String(userId) === String(currentUser.id) || !userId);
  const targetId = userId || (currentUser ? currentUser.id : null);

  const apiToLabelGender = (g) => {
    if (!g) return "";
    const s = String(g).toLowerCase();
    if (s.includes("male") || s === "nam") return "Nam";
    if (s.includes("female") || s === "nữ") return "Nữ";
    return "Khác";
  };

  // --- LOAD DATA ---
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!targetId) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/api/accounts/users/${targetId}/`);
        setUser(data);
        setFriendshipStatus(data.friendship_status);

        if (isMe) {
          setFormData({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            gender: apiToLabelGender(data.gender),
            age: data.age || "",
            phone: data.phone || "",
            address: data.address || "",
            bio: data.bio || "",
            specialty: data.specialty || "",
            workplace: data.workplace || "",
            experience_years: data.experience_years || "",
            license_number: data.license_number || "",
            doctorType: data.doctor_type || "doctor",
          });
        }
      } catch (error) {
        console.error("Error loading user:", error);
        toast.error("Không thể tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };
    loadUserProfile();
  }, [targetId, isMe]);

  // --- HANDLERS AVATAR ---
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawImage(URL.createObjectURL(file));
      setShowEditor(true);
      e.target.value = null;
    }
  };

  const handleSaveAvatar = async (croppedFile) => {
    setShowEditor(false);
    setRawImage(null);
    const tempUrl = URL.createObjectURL(croppedFile);
    setUser((prev) => ({ ...prev, avatar: tempUrl }));

    try {
      const token = localStorage.getItem("access");
      const form = new FormData();
      form.append("avatar", croppedFile);
      const res = await axios.put(
        `${process.env.REACT_APP_API_BASE}/api/accounts/update-profile/`,
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updatedUser = res.data;
      setUser(updatedUser);
      if (setAppUser) setAppUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Đã cập nhật ảnh đại diện!");
    } catch (error) {
      toast.error("Lỗi cập nhật ảnh!");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("access");
      const form = new FormData();
      const gMap = { Nam: "male", Nữ: "female", Khác: "other" };
      const genderValue = gMap[formData.gender] || formData.gender;

      Object.keys(formData).forEach((key) => {
        if (key === "gender") {
          if (genderValue) form.append("gender", genderValue);
        } else {
          form.append(key, formData[key]);
        }
      });

      const res = await axios.put(
        `${process.env.REACT_APP_API_BASE}/api/accounts/update-profile/`,
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const finalUser = res.data;
      setUser(finalUser);
      setFormData((prev) => ({
        ...prev,
        gender: apiToLabelGender(finalUser.gender),
      }));
      if (setAppUser) setAppUser(finalUser);
      localStorage.setItem("user", JSON.stringify(finalUser));
      toast.success("Lưu thông tin thành công!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // --- Styles ---
  const accentStyle = { color: accentColor };
  const accentBgStyle = {
    backgroundColor: accentColor,
    color: "#fff", // Text trắng cho tương phản tốt trên nền màu đậm
    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
    boxShadow: `0 4px 14px 0 rgba(0,0,0,0.15)`,
  };
  const accentRgb = getRgbFromHex(accentColor);

  if (loading)
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div
          className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin"
          style={{ borderTopColor: accentColor }}
        ></div>
      </div>
    );
  if (!user)
    return (
      <div className="h-screen bg-gray-50 text-gray-800 flex items-center justify-center">
        Người dùng không tồn tại.
      </div>
    );

  return (
    <div
      className="min-h-screen bg-gray-50 font-sans text-gray-900"
      style={{ "--accent-color": accentColor, "--accent-color-rgb": accentRgb }}
    >
      <Navbar user={currentUser} onLogout={onLogout} />

      {/* --- HEADER (Dải màu Gradient MỚI + Curved) --- */}
      <div className="relative w-full bg-gray-50 pb-20">
        {/* 1. KHỐI BÌA (COVER) ĐÃ SỬA: Bo cong và Gradient mượt */}
        <div className="profile-header-wrapper h-64 md:h-80 lg:h-[350px]">
          {/* Dải màu Gradient từ CSS */}
          <div className="profile-cover-gradient"></div>

          {/* Họa tiết chấm bi mờ (Tạo texture nhẹ) */}
          <div className="profile-cover-pattern"></div>

          {/* Lớp phủ mờ ở đáy */}
          <div className="profile-cover-overlay"></div>
        </div>

        {/* 2. THÔNG TIN USER (Avatar + Tên) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-20 md:-mt-24">
          <div className="flex flex-col md:flex-row items-end gap-6">
            {/* Avatar - Sử dụng class mới profile-avatar-container */}
            <div className="relative shrink-0 group">
              <div className="w-36 h-36 md:w-44 md:h-44 profile-avatar-container">
                <img
                  src={resolveImageUrl(user.avatar)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />

                {/* Overlay nút đổi Avatar */}
                {isMe && (
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <i className="fas fa-camera text-3xl text-white"></i>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* Tên & Nút Action */}
            <div className="flex-1 w-full mb-2 flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 flex items-center gap-3">
                  {user.name}
                  {isMe && (
                    <div className="relative">
                      <i
                        className="fas fa-palette text-gray-400 text-lg hover:text-gray-800 cursor-pointer transition p-2"
                        onClick={() => setShowThemePicker(!showThemePicker)}
                      ></i>
                      {showThemePicker && (
                        <div className="absolute top-8 left-0 bg-white border border-gray-200 p-3 rounded-xl shadow-xl flex gap-2 z-50 animate-fade-in">
                          {[
                            "#ffcd38",
                            "#3b82f6",
                            "#ef4444",
                            "#22c55e",
                            "#a855f7",
                          ].map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                setAccentColor(c);
                                localStorage.setItem("profileAccentColor", c);
                                setShowThemePicker(false);
                              }}
                              className="w-8 h-8 rounded-full border-2 border-white ring-2 ring-gray-200 hover:scale-110 transition shadow-sm"
                              style={{ backgroundColor: c }}
                            ></button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </h1>
                <p className="text-gray-500 font-medium mt-1 max-w-xl">
                  {user.bio || "Chưa có giới thiệu"}
                </p>
              </div>

              <div className="flex gap-3">
                {isMe ? (
                  <button
                    onClick={() => {
                      setIsEditing(!isEditing);
                      setActiveTab("about");
                    }}
                    className="h-11 px-6 rounded-xl font-bold text-white transition shadow flex items-center gap-2 hover:brightness-110"
                    style={accentBgStyle}
                  >
                    <i
                      className={`fas ${isEditing ? "fa-times" : "fa-pen"}`}
                    ></i>{" "}
                    {isEditing ? "Hủy bỏ" : "Chỉnh sửa"}
                  </button>
                ) : (
                  <>
                    <button
                      className="h-11 px-6 rounded-xl font-bold text-white flex items-center gap-2 shadow hover:brightness-110"
                      style={accentBgStyle}
                    >
                      <i className="fas fa-user-plus"></i> Kết bạn
                    </button>
                    <button className="h-11 px-6 rounded-xl bg-white text-gray-700 border border-gray-300 font-bold hover:bg-gray-50 transition shadow-sm">
                      Nhắn tin
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- THANH ĐIỀU HƯỚNG TAB --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 border-b border-gray-200">
        <div className="flex gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: "posts", icon: "fas fa-newspaper", label: "Bài đăng" },
            { id: "media", icon: "fas fa-images", label: "Hình ảnh" },
            { id: "friends", icon: "fas fa-user-friends", label: "Bạn bè" },
            { id: "about", icon: "fas fa-info-circle", label: "Giới thiệu" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide relative transition ${
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <i className={tab.icon}></i> {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-0 w-full h-[3px] rounded-t-sm"
                  style={{ backgroundColor: accentColor }}
                ></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* --- NỘI DUNG CHÍNH --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* 1. TAB GIỚI THIỆU (Giữ nguyên logic cũ) */}
        {activeTab === "about" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <i className="fas fa-user-edit" style={accentStyle}></i>
                {isEditing
                  ? "Chỉnh sửa thông tin cá nhân"
                  : "Thông tin chi tiết"}
              </h3>

              {isEditing ? (
                /* --- GIAO DIỆN CHỈNH SỬA (Giữ nguyên code form của bạn) --- */
                <div className="animate-fade-in form-grid-container">
                  {/* ... (Copy lại nội dung form từ file cũ vào đây nếu cần, hoặc giữ nguyên khối div này) ... */}
                  {/* Để ngắn gọn, bạn giữ nguyên toàn bộ phần form input ở đây như file gốc */}
                  {/* Bắt đầu từ <div className="grid grid-cols-2 gap-5"> đến hết phần button Lưu */}

                  {/* Hàng 1: Họ & Tên */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="modern-label">Họ</label>
                      <input
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder="Nhập họ..."
                      />
                    </div>
                    <div>
                      <label className="modern-label">Tên</label>
                      <input
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder="Nhập tên..."
                      />
                    </div>
                  </div>

                  {/* ... (Các phần input khác giữ nguyên) ... */}
                  {/* Copy lại toàn bộ code bên trong khối isEditing của file gốc */}

                  {/* Đoạn code form dài của bạn... */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="modern-label">Giới tính</label>
                      <div className="relative">
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="modern-input appearance-none cursor-pointer"
                        >
                          <option value="">-- Chọn giới tính --</option>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="modern-label">Tuổi</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder="VD: 25"
                      />
                    </div>
                  </div>

                  {/* Thông tin liên hệ */}
                  <div>
                    <label className="modern-label">Số điện thoại</label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="modern-input"
                      placeholder="Nhập số điện thoại..."
                    />
                  </div>

                  <div>
                    <label className="modern-label">Địa chỉ hiện tại</label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="modern-input"
                      placeholder="VD: Hà Nội, Việt Nam"
                    />
                  </div>

                  <div>
                    <label className="modern-label">Tiểu sử (Bio)</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="modern-input"
                      placeholder="Hãy viết một chút về bản thân bạn..."
                    ></textarea>
                  </div>

                  {/* Khu vực Bác sĩ */}
                  {user.role === "doctor" && (
                    <div className="doctor-info-box">
                      <p className="doctor-title">
                        <i className="fas fa-user-md text-lg"></i> Thông tin
                        chuyên môn
                      </p>
                      <div className="space-y-5">
                        {/* ... Các input bác sĩ giữ nguyên ... */}
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="modern-label text-blue-800">
                              Chức danh
                            </label>
                            <div className="relative">
                              <select
                                name="doctorType"
                                value={formData.doctorType}
                                onChange={handleInputChange}
                                className="modern-input bg-white border-blue-200 focus:border-blue-500"
                              >
                                <option value="doctor">Bác sĩ</option>
                                <option value="student">Sinh viên Y</option>
                                <option value="intern">Thực tập sinh</option>
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                                <i className="fas fa-chevron-down text-xs"></i>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="modern-label text-blue-800">
                              Kinh nghiệm (năm)
                            </label>
                            <input
                              type="number"
                              name="experience_years"
                              value={formData.experience_years}
                              onChange={handleInputChange}
                              className="modern-input bg-white border-blue-200 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="modern-label text-blue-800">
                            Nơi làm việc
                          </label>
                          <input
                            name="workplace"
                            value={formData.workplace}
                            onChange={handleInputChange}
                            className="modern-input bg-white border-blue-200 focus:border-blue-500"
                            placeholder="VD: Bệnh viện Bạch Mai"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="modern-label text-blue-800">
                              Chuyên khoa
                            </label>
                            <input
                              name="specialty"
                              value={formData.specialty}
                              onChange={handleInputChange}
                              className="modern-input bg-white border-blue-200 focus:border-blue-500"
                              placeholder="VD: Nội khoa"
                            />
                          </div>
                          <div>
                            <label className="modern-label text-blue-800">
                              Số chứng chỉ
                            </label>
                            <input
                              name="license_number"
                              value={formData.license_number}
                              onChange={handleInputChange}
                              className="modern-input bg-white border-blue-200 focus:border-blue-500"
                              placeholder="CCHN..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nút Save/Cancel */}
                  <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-8 py-3 rounded-xl font-bold text-white transition flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                      }}
                    >
                      {saving ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-check"></i>
                      )}{" "}
                      Lưu thay đổi
                    </button>
                  </div>
                </div>
              ) : (
                /* --- CHẾ ĐỘ XEM (VIEW MODE) - GIỮ NGUYÊN --- */
                <ul className="space-y-6">
                  {[
                    {
                      icon: "fas fa-venus-mars",
                      label: "Giới tính",
                      val: apiToLabelGender(user.gender),
                    },
                    {
                      icon: "fas fa-birthday-cake",
                      label: "Tuổi",
                      val: user.age ? `${user.age} tuổi` : null,
                    },
                    {
                      icon: "fas fa-phone",
                      label: "Điện thoại",
                      val: user.phone,
                    },
                    {
                      icon: "fas fa-envelope",
                      label: "Email",
                      val: user.email,
                    },
                    {
                      icon: "fas fa-map-marker-alt",
                      label: "Địa chỉ",
                      val: user.address,
                    },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200"
                        style={{ color: accentColor }}
                      >
                        <i className={item.icon}></i>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">
                          {item.label}
                        </p>
                        <p className="text-gray-900 font-medium text-lg">
                          {item.val || "Chưa cập nhật"}
                        </p>
                      </div>
                    </li>
                  ))}
                  {user.role === "doctor" && (
                    <>
                      <li className="pt-6 border-t border-gray-100">
                        <span className="text-blue-600 font-bold text-sm uppercase flex items-center gap-2">
                          <i className="fas fa-notes-medical"></i> Thông tin Y
                          khoa
                        </span>
                      </li>
                      <li className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Chuyên khoa
                          </p>
                          <p className="font-medium">
                            {user.specialty || "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Kinh nghiệm
                          </p>
                          <p className="font-medium">
                            {user.experience_years
                              ? `${user.experience_years} năm`
                              : "---"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Nơi làm việc
                          </p>
                          <p className="font-medium">
                            {user.workplace || "---"}
                          </p>
                        </div>
                      </li>
                    </>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 2. TAB BÀI ĐĂNG (Thay thế đoạn placeholder cũ) */}
        {activeTab === "posts" && (
          <div className="max-w-3xl mx-auto">
            <UserPostsTab userId={user.id} currentUser={currentUser} />
          </div>
        )}

        {/* 3. TAB HÌNH ẢNH */}
        {activeTab === "media" && <UserMediaTab userId={user.id} />}

        {/* 4. TAB BẠN BÈ */}
        {activeTab === "friends" && <UserFriendsTab userId={user.id} />}
      </div>

      {/* Modal Crop Ảnh */}
      {showEditor && rawImage && (
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

export default UserProfilePage;

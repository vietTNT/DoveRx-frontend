import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AvatarEditorModal from "../components/avatar/AvatarEditor";
import { resolveImageUrl } from "../utils/imageHelper";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriendUser,
  cancelFriendRequest,
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
  const navigate = useNavigate();

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
    if (s.includes("male") || s === "nam") return t("profile.gender_male");
    if (s.includes("female") || s === "nữ") return t("profile.gender_female");
    return t("profile.gender_other");
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
        toast.error(t("profile.error_load_user"));
      } finally {
        setLoading(false);
      }
    };
    loadUserProfile();
  }, [targetId, isMe, t]);

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
      toast.success(t("profile.avatar_updated"));
    } catch (error) {
      toast.error(t("profile.avatar_update_error"));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Tìm đến hàm handleSaveProfile cũ và thay thế bằng đoạn này:
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("access");
      const form = new FormData();

      // 1. Map giới tính (Code cũ của bạn)
      const gMap = {
        [t("profile.gender_male")]: "male",
        [t("profile.gender_female")]: "female",
        [t("profile.gender_other")]: "other",
      };

      // 2. Thêm các trường cơ bản (Dùng snake_case cho chắc chắn khớp Backend)
      form.append("first_name", formData.first_name);
      form.append("last_name", formData.last_name);
      form.append("gender", gMap[formData.gender] || formData.gender);
      form.append("age", formData.age);
      form.append("phone", formData.phone);
      form.append("address", formData.address);
      form.append("bio", formData.bio);

      // 3. XỬ LÝ QUAN TRỌNG CHO BÁC SĨ (Sửa lỗi mất dữ liệu ở đây)
      // Backend Django của bạn đang đợi: doctor_type (có gạch dưới)
      // Nhưng form React của bạn đang lưu: doctorType (viết liền)
      if (user.role === "doctor") {
        form.append("doctor_type", formData.doctorType); // <--- ĐÃ SỬA TÊN BIẾN
        form.append("experience_years", formData.experience_years);
        form.append("workplace", formData.workplace);
        form.append("specialty", formData.specialty);
        form.append("license_number", formData.license_number);
      }

      // 4. Đổi PUT thành PATCH
      // PATCH an toàn hơn vì nó chỉ update những gì bạn gửi, không xóa những cái thiếu
      const res = await axios.patch(
        `${process.env.REACT_APP_API_BASE}/api/accounts/update-profile/`,
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const finalUser = res.data;
      setUser(finalUser);

      // Cập nhật lại state form để hiển thị đúng ngay lập tức
      setFormData((prev) => ({
        ...prev,
        gender: apiToLabelGender(finalUser.gender),
      }));

      if (setAppUser) setAppUser(finalUser);
      localStorage.setItem("user", JSON.stringify(finalUser));

      toast.success(t("profile.save_doctor_success"));
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error(t("profile.update_failed"));
    } finally {
      setSaving(false);
    }
  };
  // --- HANDLERS KẾT BẠN & NHẮN TIN ---
  const handleFriendAction = async (action) => {
    try {
      if (action === "add") {
        await sendFriendRequest(targetId);
        setFriendshipStatus("pending");
        toast.success(t("user_profile.sent_success"));
      } else if (action === "accept") {
        await acceptFriendRequest(targetId);
        setFriendshipStatus("accepted");
        toast.success(t("user_profile.accepted_success"));
      } else if (action === "reject") {
        await rejectFriendRequest(targetId);
        setFriendshipStatus(null);
      } else if (action === "cancel") {
        await cancelFriendRequest(targetId);
        setFriendshipStatus(null);
        toast.success(t("user_profile.cancel_request"));
      } else if (action === "unfriend") {
        const confirmDelete = window.confirm(
          t("user_profile.confirm_unfriend"),
        );
        if (confirmDelete) {
          await unfriendUser(targetId);
          setFriendshipStatus(null);
          toast.success(t("user_profile.unfriended"));
        }
      }
    } catch (error) {
      toast.error(t("common.error_try_again"));
    }
  };

  const handleMessageClick = async () => {
    try {
      const conv = await getOrCreateConversation(targetId);
      if (conv && conv.id) {
        window.dispatchEvent(
          new CustomEvent("OPEN_CHAT_POPUP", {
            detail: {
              conversationId: conv.id,
              targetUser: {
                ...user, // Spread toàn bộ dữ liệu profile đang có
                id: targetId,
                name: user.get_full_name || user.username,
                avatar: user.avatar,
                // Đảm bảo có trường online (tùy thuộc vào tên trường từ Backend của bạn)
                online: user.is_online || user.online,
              },
            },
          }),
        );
      }
    } catch (error) {
      toast.error(t("chat.cannot_open_chat"));
    }
  };
  // --- Styles ---
  const accentStyle = { color: accentColor };
  const accentBgStyle = {
    backgroundColor: accentColor,
    color: "#fff",
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
        {t("user_profile.not_found")}
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
                  {user.bio || t("profile.no_bio")}
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
                    {isEditing ? t("common.cancel") : t("common.edit")}
                  </button>
                ) : (
                  <>
                    <>
                      {friendshipStatus === "friends" ||
                      friendshipStatus === "accepted" ||
                      friendshipStatus === "received_accepted" ? (
                        <button
                          onClick={() => handleFriendAction("unfriend")}
                          className="group h-11 px-6 rounded-xl font-bold bg-gray-200 text-gray-800 flex items-center gap-2 shadow-sm hover:bg-red-50 hover:text-red-600 transition duration-200"
                        >
                          {/* Khi không hover */}
                          <i className="fas fa-user-check group-hover:hidden"></i>
                          <span className="group-hover:hidden">
                            {t("user_profile.friend_status")}
                          </span>

                          {/* Khi đưa chuột vào (Hover) */}
                          <i className="fas fa-user-times hidden group-hover:block"></i>
                          <span className="hidden group-hover:block">
                            {t("user_profile.unfriend")}
                          </span>
                        </button>
                      ) : friendshipStatus === "pending" ? (
                        <button
                          onClick={() => handleFriendAction("cancel")}
                          className="group h-11 px-6 rounded-xl font-bold bg-gray-200 text-gray-800 flex items-center gap-2 shadow-sm hover:bg-red-50 hover:text-red-600 transition duration-200"
                        >
                          {/* Trạng thái bình thường */}
                          <i className="fas fa-user-clock group-hover:hidden"></i>
                          <span className="group-hover:hidden">
                            {t("user_profile.request_sent")}
                          </span>

                          {/* Khi di chuột vào (Hover) */}
                          <i className="fas fa-user-times hidden group-hover:block"></i>
                          <span className="hidden group-hover:block">
                            {t("user_profile.cancel_request")}
                          </span>
                        </button>
                      ) : friendshipStatus === "received_pending" ? (
                        <button
                          onClick={() => handleFriendAction("accept")}
                          className="h-11 px-6 rounded-xl font-bold text-white flex items-center gap-2 shadow hover:brightness-110"
                          style={accentBgStyle}
                        >
                          <i className="fas fa-user-check"></i>
                          {t("user_profile.accept")}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFriendAction("add")}
                          className="h-11 px-6 rounded-xl font-bold text-white flex items-center gap-2 shadow hover:brightness-110"
                          style={accentBgStyle}
                        >
                          <i className="fas fa-user-plus"></i>
                          {t("user_profile.add_friend")}
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleMessageClick();
                        }}
                        className="h-11 px-6 rounded-xl bg-white text-gray-700 border border-gray-300 font-bold hover:bg-gray-50 transition shadow-sm"
                      >
                        <i className="fab fa-facebook-messenger mr-2"></i>
                        {t("user_profile.message")}
                      </button>
                    </>
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
            {
              id: "posts",
              icon: "fas fa-newspaper",
              label: t("profile.tabs.posts"),
            },
            {
              id: "media",
              icon: "fas fa-images",
              label: t("profile.tabs.media"),
            },
            {
              id: "friends",
              icon: "fas fa-user-friends",
              label: t("profile.tabs.friends"),
            },
            {
              id: "about",
              icon: "fas fa-info-circle",
              label: t("profile.tabs.about"),
            },
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
                  ? t("profile.edit_personal_info")
                  : t("profile.detail_info")}
              </h3>

              {isEditing ? (
                <div className="animate-fade-in form-grid-container">
                  {/* Hàng 1: Họ & Tên */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="modern-label">
                        {t("profile.first_name")}
                      </label>
                      <input
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder={t("profile.placeholders.first_name")}
                      />
                    </div>
                    <div>
                      <label className="modern-label">
                        {t("profile.last_name")}
                      </label>
                      <input
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder={t("profile.placeholders.last_name")}
                      />
                    </div>
                  </div>

                  {/* Đoạn code form dài của bạn... */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="modern-label">
                        {t("profile.gender")}
                      </label>
                      <div className="relative">
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="modern-input appearance-none cursor-pointer"
                        >
                          <option value="">-- {t("profile.gender")} --</option>
                          <option value={t("profile.gender_male")}>
                            {t("profile.gender_male")}
                          </option>
                          <option value={t("profile.gender_female")}>
                            {t("profile.gender_female")}
                          </option>
                          <option value={t("profile.gender_other")}>
                            {t("profile.gender_other")}
                          </option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="modern-label">{t("profile.age")}</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder={t("profile.placeholders.age")}
                      />
                    </div>
                  </div>

                  {/* Thông tin liên hệ */}
                  <div>
                    <label className="modern-label">{t("profile.phone")}</label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="modern-input"
                      placeholder={t("profile.placeholders.phone")}
                    />
                  </div>

                  <div>
                    <label className="modern-label">
                      {t("profile.address")}
                    </label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="modern-input"
                      placeholder={t("profile.placeholders.address")}
                    />
                  </div>

                  <div>
                    <label className="modern-label">{t("profile.bio")}</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="modern-input"
                      placeholder={t("profile.placeholders.bio")}
                    ></textarea>
                  </div>

                  {/* Khu vực Bác sĩ */}
                  {user.role === "doctor" && (
                    <div className="doctor-info-box">
                      <p className="doctor-title">
                        <i className="fas fa-user-md text-lg"></i>{" "}
                        {t("profile.professional_info")}
                      </p>
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="modern-label text-blue-800">
                              {t("profile.job_title")}
                            </label>
                            <div className="relative">
                              <select
                                name="doctorType"
                                value={formData.doctorType}
                                onChange={handleInputChange}
                                className="modern-input bg-white border-blue-200 focus:border-blue-500"
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
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                                <i className="fas fa-chevron-down text-xs"></i>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="modern-label text-blue-800">
                              {t("profile.experience_years")}
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
                            {t("profile.workplace")}
                          </label>
                          <input
                            name="workplace"
                            value={formData.workplace}
                            onChange={handleInputChange}
                            className="modern-input bg-white border-blue-200 focus:border-blue-500"
                            placeholder={t("profile.placeholders.workplace")}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="modern-label text-blue-800">
                              {t("profile.specialty")}
                            </label>
                            <input
                              name="specialty"
                              value={formData.specialty}
                              onChange={handleInputChange}
                              className="modern-input bg-white border-blue-200 focus:border-blue-500"
                              placeholder={t("profile.placeholders.specialty")}
                            />
                          </div>
                          <div>
                            <label className="modern-label text-blue-800">
                              {t("profile.license_number")}
                            </label>
                            <input
                              name="license_number"
                              value={formData.license_number}
                              onChange={handleInputChange}
                              className="modern-input bg-white border-blue-200 focus:border-blue-500"
                              placeholder={t("profile.placeholders.license")}
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
                      {t("common.cancel")}
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
                      {t("common.save")}
                    </button>
                  </div>
                </div>
              ) : (
                /* --- CHẾ ĐỘ XEM  --- */
                <ul className="space-y-6">
                  {[
                    {
                      icon: "fas fa-venus-mars",
                      label: t("profile.gender"),
                      val: apiToLabelGender(user.gender),
                    },
                    {
                      icon: "fas fa-birthday-cake",
                      label: t("profile.age"),
                      val: user.age ? `${user.age} tuổi` : null,
                    },
                    {
                      icon: "fas fa-phone",
                      label: t("profile.phone"),
                      val: user.phone,
                    },
                    {
                      icon: "fas fa-envelope",
                      label: "Email",
                      val: user.email,
                    },
                    {
                      icon: "fas fa-map-marker-alt",
                      label: t("profile.address"),
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
                          {item.val || t("profile.not_updated")}
                        </p>
                      </div>
                    </li>
                  ))}
                  {user.role === "doctor" && (
                    <>
                      <li className="pt-6 border-t border-gray-100">
                        <span className="text-blue-600 font-bold text-sm uppercase flex items-center gap-2">
                          <i className="fas fa-notes-medical"></i>
                          {t("profile.professional_info")}
                        </span>
                      </li>
                      <li className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            {t("profile.specialty")}
                          </p>
                          <p className="font-medium">
                            {user.specialty || "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            {t("profile.experience_years")}
                          </p>
                          <p className="font-medium">
                            {user.experience_years
                              ? `${user.experience_years} năm`
                              : "---"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            {t("profile.workplace")}
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

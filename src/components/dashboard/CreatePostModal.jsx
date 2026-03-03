import React, { useState, useEffect } from "react";
import "../../styles/CreatePostModal.css";
import { useTranslation } from "react-i18next";

// Helper resolveAvatar (Giữ nguyên như cũ)
const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

const resolveAvatar = (avatar) => {
  if (!avatar) return DEFAULT_AVATAR;
  if (typeof avatar === "object") {
    if (avatar.url) {
      const u = avatar.url;
      if (u.startsWith("/")) {
        const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
        return base + u;
      }
      return u;
    }
    if (avatar.path) {
      const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
      return (
        base + (avatar.path.startsWith("/") ? avatar.path : "/" + avatar.path)
      );
    }
    if (avatar instanceof File || avatar instanceof Blob) {
      try {
        return URL.createObjectURL(avatar);
      } catch {
        return DEFAULT_AVATAR;
      }
    }
    return DEFAULT_AVATAR;
  }
  if (typeof avatar === "string") {
    if (!avatar || avatar === "null" || avatar === "undefined")
      return DEFAULT_AVATAR;
    if (avatar.startsWith("/")) {
      const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
      return base + avatar;
    }
    return avatar;
  }
  return DEFAULT_AVATAR;
};

const CreatePostModal = ({
  isOpen,
  onClose,
  user,
  postType,
  newPost,
  setNewPost,
  medicalForm,
  setMedicalForm,
  selectedImages,
  removeImage,
  fileInputRef,
  handleImageChange,
  handlePost,
  visibility,
  setVisibility,
  category,
  setCategory,
}) => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  useEffect(() => {
    if (postType === "medical") {
      setVisibility("public");
    }
  }, [postType, setVisibility]);
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* ================= HEADER ================= */}
        <div className="modal-header relative flex items-center justify-between w-full">
          <h3>{t("dashboard.create_post") || "Tạo bài viết"}</h3>

          {/* NÚT CHỌN LOẠI BÀI VIẾT (Đưa lên Header và căn giữa) */}

          {postType === "normal" && (
            <div className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 z-[70]">
              <div className="bg-gradient-to-r from-emerald-400 to-cyan-500 p-[2px] rounded-lg shadow-md min-w-[154px] transition-all hover:shadow-emerald-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#f0fdfa] hover:bg-[#d1f2eb] text-[#117864] text-[13px] font-extrabold py-1.5 px-4 rounded-lg transition-all outline-none border-none"
                >
                  <span>
                    {/* Hiển thị text theo category đã chọn */}
                    {category === "medical_knowledge"
                      ? t("post.category_medical_knowledge")
                      : category === "medical_question"
                        ? t("post.category_medical_question")
                        : t("post.category_other")}
                  </span>
                </button>
              </div>
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-[70]">
                  <ul className="flex flex-col py-1 m-0 list-none p-0">
                    {/* 1. Lựa chọn: Khác (Ai cũng thấy) */}
                    <li
                      className={`px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                        category === "other" || !category
                          ? "text-[#117864] bg-[#d1f2eb]"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setCategory("other");
                        setIsCategoryDropdownOpen(false);
                      }}
                    >
                      {t("post.category_other")}
                    </li>

                    {/* 2. Lựa chọn: Câu hỏi y khoa (Ai cũng thấy) */}
                    <li
                      className={`px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                        category === "medical_question"
                          ? "text-[#117864] bg-[#d1f2eb]"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setCategory("medical_question");
                        setIsCategoryDropdownOpen(false);
                      }}
                    >
                      {t("post.category_medical_question")}
                    </li>

                    {/* 3. Lựa chọn: Kiến thức y khoa (CHỈ BÁC SĨ MỚI THẤY) */}
                    {user?.role === "doctor" && (
                      <li
                        className={`px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                          category === "medical_knowledge"
                            ? "text-[#117864] bg-[#d1f2eb]"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          setCategory("medical_knowledge");
                          setIsCategoryDropdownOpen(false);
                        }}
                      >
                        {t("post.category_medical_knowledge")}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        {/* Body */}
        <div className="modal-body">
          {/* Thông tin người dùng */}
          {/* <div className="modal-user">
            <img
              src={resolveAvatar(user?.avatar)}
              alt="avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
            <strong>{user?.name || "Người dùng"}</strong>
          </div> */}
          {/* Vùng thông tin người dùng bọc ngoài cùng */}
          <div className="flex items-center justify-between w-full mb-4">
            {/* Nửa bên trái: Avatar + Tên */}
            <div className="flex items-center gap-3">
              <img
                src={resolveAvatar(user?.avatar)}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <span className="font-semibold text-[15px] text-gray-900">
                {user?.name || t("navbar.role_user")}
              </span>
            </div>

            {/* Nửa bên phải: Nút Select quyền riêng tư */}
            {/* Nửa bên phải: Custom Dropdown thay cho Select native */}
            {postType !== "medical" && (
              <div className="relative">
                {/* Nút bấm chính */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[13px] font-semibold py-1.5 px-3.5 rounded-lg border border-sky-200 transition-colors outline-none"
                >
                  <span>
                    {visibility === "public"
                      ? t("post.visibility_public")
                      : visibility === "friends"
                        ? t("post.visibility_friends")
                        : t("post.visibility_private")}
                  </span>
                </button>

                {/* Khung menu thả xuống */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50">
                    <ul className="flex flex-col py-1 m-0">
                      {/* Lựa chọn 1: Cộng đồng */}
                      <li
                        className={`px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                          visibility === "public"
                            ? "text-sky-700 bg-sky-50"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          setVisibility("public");
                          setIsDropdownOpen(false);
                        }}
                      >
                        {t("post.visibility_public")}
                      </li>

                      {/* Lựa chọn 2: Bạn bè */}
                      <li
                        className={`px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                          visibility === "friends"
                            ? "text-sky-700 bg-sky-50"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          setVisibility("friends");
                          setIsDropdownOpen(false);
                        }}
                      >
                        {t("post.visibility_friends")}
                      </li>

                      {/* Lựa chọn 3: Chỉ mình tôi */}
                      <li
                        className={`px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                          visibility === "private"
                            ? "text-sky-700 bg-sky-50"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          setVisibility("private");
                          setIsDropdownOpen(false);
                        }}
                      >
                        {t("post.visibility_private")}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Khu vực nhập nội dung chính */}
          <div className="modal-input-area">
            {postType === "normal" ? (
              <textarea
                className="main-textarea"
                placeholder={t("dashboard.what_thinking", {
                  name: user?.name || t("profile.you", "Bạn"),
                })}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
            ) : (
              <div className="medical-form scrollable-form">
                {/* Form y tế giữ nguyên */}
                <h4> {t("dashboard.medical_form.title_symptom")}</h4>
                <textarea
                  placeholder={t("dashboard.medical_form.symptom")}
                  value={medicalForm.symptom}
                  onChange={(e) =>
                    setMedicalForm({ ...medicalForm, symptom: e.target.value })
                  }
                />
                <textarea
                  placeholder={t("dashboard.medical_form.duration")}
                  value={medicalForm.duration}
                  onChange={(e) =>
                    setMedicalForm({ ...medicalForm, duration: e.target.value })
                  }
                />
                <textarea
                  placeholder={t("dashboard.medical_form.severity")}
                  value={medicalForm.severity}
                  onChange={(e) =>
                    setMedicalForm({ ...medicalForm, severity: e.target.value })
                  }
                />
                <textarea
                  placeholder={t("dashboard.medical_form.factors")}
                  value={medicalForm.factors}
                  onChange={(e) =>
                    setMedicalForm({ ...medicalForm, factors: e.target.value })
                  }
                />

                <h4> {t("dashboard.medical_form.title_history")}</h4>
                <textarea
                  placeholder={t("dashboard.medical_form.history_personal")}
                  value={medicalForm.historyPersonal}
                  onChange={(e) =>
                    setMedicalForm({
                      ...medicalForm,
                      historyPersonal: e.target.value,
                    })
                  }
                />
                <textarea
                  placeholder={t("dashboard.medical_form.history_family")}
                  value={medicalForm.historyFamily}
                  onChange={(e) =>
                    setMedicalForm({
                      ...medicalForm,
                      historyFamily: e.target.value,
                    })
                  }
                />
                <textarea
                  placeholder={t("dashboard.medical_form.medication")}
                  value={medicalForm.medication}
                  onChange={(e) =>
                    setMedicalForm({
                      ...medicalForm,
                      medication: e.target.value,
                    })
                  }
                />

                <h4> {t("dashboard.medical_form.title_lifestyle")}</h4>
                <textarea
                  placeholder={t("dashboard.medical_form.lifestyle")}
                  value={medicalForm.lifestyle}
                  onChange={(e) =>
                    setMedicalForm({
                      ...medicalForm,
                      lifestyle: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* Xem trước ảnh/video (Di chuyển lên đây) */}
          {selectedImages.length > 0 && (
            <div className="image-preview">
              {selectedImages.map((media, index) => {
                const previewSrc =
                  typeof media === "string"
                    ? media
                    : media?.url
                      ? media.url
                      : media instanceof File || media instanceof Blob
                        ? URL.createObjectURL(media)
                        : media?.path
                          ? (process.env.REACT_APP_API_BASE || "").replace(
                              /\/$/,
                              "",
                            ) +
                            (media.path.startsWith("/")
                              ? media.path
                              : "/" + media.path)
                          : DEFAULT_AVATAR;

                const isVideo =
                  (media?.type && media.type.startsWith("video/")) ||
                  (media?.file?.type && media.file.type.startsWith("video/")) ||
                  (typeof previewSrc === "string" &&
                    (previewSrc.includes("/video/") ||
                      previewSrc.endsWith(".mp4") ||
                      previewSrc.endsWith(".webm")));

                return (
                  <div key={index} className="preview-item">
                    {isVideo ? (
                      <video
                        src={previewSrc}
                        controls
                        className="preview-media"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                        }}
                      />
                    ) : (
                      <img
                        src={previewSrc}
                        alt={`preview-${index}`}
                        className="preview-media"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                    )}
                    <button
                      onClick={() => {
                        if (media instanceof File || media instanceof Blob) {
                          try {
                            URL.revokeObjectURL(previewSrc);
                          } catch {}
                        }
                        removeImage(media);
                      }}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Các nút hành động nằm ngang */}
          <div className="modal-actions">
            <button
              className="modal-action"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fas fa-images"></i>{" "}
              {t("dashboard.modal_actions.photo_video")}
            </button>
            <button className="modal-action">
              <i className="fas fa-user-tag"></i>{" "}
              {t("dashboard.modal_actions.tag_friends")}
            </button>
            <button className="modal-action">
              {/* Đổi icon cho giống "Nhãn dán" */}
              <i className="fas fa-smile"></i>{" "}
              {t("dashboard.modal_actions.feeling")}
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            multiple
            accept="image/*,video/*"
            onChange={handleImageChange}
          />

          {/* Nút Đăng */}
          <button className="modal-post-btn" onClick={handlePost}>
            {t("dashboard.post_btn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;

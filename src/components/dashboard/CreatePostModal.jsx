import React from "react";
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
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>{t("dashboard.create_post")}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Thông tin người dùng */}
          <div className="modal-user">
            <img
              src={resolveAvatar(user?.avatar)}
              alt="avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
            <strong>{user?.name || "Người dùng"}</strong>
          </div>

          {/* Khu vực nhập nội dung chính */}
          <div className="modal-input-area">
            {postType === "normal" ? (
              <textarea
                className="main-textarea"
                placeholder={t("dashboard.what_thinking", {
                  name: user?.name || "Bạn",
                })}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
            ) : (
              <div className="medical-form scrollable-form">
                {/* Form y tế giữ nguyên */}
                <h4>🩺 {t("dashboard.medical_form.title_symptom")}</h4>
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

                <h4>💊 {t("dashboard.medical_form.title_history")}</h4>
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

                <h4>🧠 {t("dashboard.medical_form.title_lifestyle")}</h4>
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

                return (
                  <div key={index} className="preview-item">
                    {String(previewSrc).startsWith("data:") ||
                    String(previewSrc).startsWith("blob:") ||
                    previewSrc?.includes("video") ||
                    (media?.type && media.type.startsWith("video")) ? (
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

import React from "react";
import "../../styles/CreatePostModal.css";
import { useTranslation } from "react-i18next";
// Thêm helper resolveAvatar
const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

const resolveAvatar = (avatar) => {
  if (!avatar) return DEFAULT_AVATAR;

  // Nếu trả về object với { url: "/media/..." } hoặc {path: "..."}
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
    // File/Blob
    if (avatar instanceof File || avatar instanceof Blob) {
      try {
        return URL.createObjectURL(avatar);
      } catch {
        return DEFAULT_AVATAR;
      }
    }
    return DEFAULT_AVATAR;
  }

  // string
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
        <div className="modal-header">
          <h3>{t("dashboard.create_post")}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
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

          {postType === "normal" ? (
            <textarea
              placeholder={t("dashboard.what_thinking", {
                name: user?.name || "Bạn",
              })}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
          ) : (
            <div className="medical-form scrollable-form">
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
                  setMedicalForm({ ...medicalForm, medication: e.target.value })
                }
              />

              <h4>🧠 {t("dashboard.medical_form.title_lifestyle")}</h4>
              <textarea
                placeholder={t("dashboard.medical_form.lifestyle")}
                value={medicalForm.lifestyle}
                onChange={(e) =>
                  setMedicalForm({ ...medicalForm, lifestyle: e.target.value })
                }
              />
            </div>
          )}

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
              <i className="fas fa-face-smile"></i>{" "}
              {t("dashboard.modal_actions.feeling")}
            </button>
          </div>

          {selectedImages.length > 0 && (
            <div className="image-preview">
              {selectedImages.map((media, index) => {
                // Tính preview src an toàn:
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
                        ""
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
                        // nếu bạn dùng URL.createObjectURL ở đây, nhớ revoke khi remove:
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

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            multiple
            accept="image/*,video/*"
            onChange={handleImageChange}
          />
          <button className="modal-post-btn" onClick={handlePost}>
            {t("dashboard.post_btn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;

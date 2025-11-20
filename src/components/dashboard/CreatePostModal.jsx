import React from "react";
import "../../styles/CreatePostModal.css";

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
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo bài viết</h3>
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
              placeholder={`${user?.name || "Bạn"} ơi, bạn đang nghĩ gì thế?`}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
          ) : (
            <div className="medical-form scrollable-form">
              <h4>🩺 Về triệu chứng và tình trạng hiện tại</h4>
              <textarea
                placeholder="Bạn đang gặp những triệu chứng gì?"
                value={medicalForm.symptom}
                onChange={(e) =>
                  setMedicalForm({ ...medicalForm, symptom: e.target.value })
                }
              />
              <textarea
                placeholder="Triệu chứng xuất hiện từ khi nào, diễn ra liên tục hay ngắt quãng?"
                value={medicalForm.duration}
                onChange={(e) =>
                  setMedicalForm({ ...medicalForm, duration: e.target.value })
                }
              />
              <textarea
                placeholder="Mức độ nghiêm trọng đến mức nào?"
                value={medicalForm.severity}
                onChange={(e) =>
                  setMedicalForm({ ...medicalForm, severity: e.target.value })
                }
              />
              <textarea
                placeholder="Có yếu tố nào làm triệu chứng nặng hơn hoặc đỡ hơn không?"
                value={medicalForm.factors}
                onChange={(e) =>
                  setMedicalForm({ ...medicalForm, factors: e.target.value })
                }
              />

              <h4>💊 Về tiền sử bệnh lý và điều trị</h4>
              <textarea
                placeholder="Tiền sử cá nhân: bạn đã từng mắc bệnh hay phẫu thuật chưa?"
                value={medicalForm.historyPersonal}
                onChange={(e) =>
                  setMedicalForm({
                    ...medicalForm,
                    historyPersonal: e.target.value,
                  })
                }
              />
              <textarea
                placeholder="Tiền sử gia đình: có ai mắc bệnh di truyền, tim mạch, ung thư không?"
                value={medicalForm.historyFamily}
                onChange={(e) =>
                  setMedicalForm({
                    ...medicalForm,
                    historyFamily: e.target.value,
                  })
                }
              />
              <textarea
                placeholder="Thuốc bạn đang dùng hiện tại?"
                value={medicalForm.medication}
                onChange={(e) =>
                  setMedicalForm({ ...medicalForm, medication: e.target.value })
                }
              />

              <h4>🧠 Về lối sống và tâm lý</h4>
              <textarea
                placeholder="Bạn có hút thuốc, uống rượu, thức khuya hay gặp căng thẳng không?"
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
              <i className="fas fa-images"></i> Ảnh/video
            </button>
            <button className="modal-action">
              <i className="fas fa-user-tag"></i> Gắn thẻ bạn bè
            </button>
            <button className="modal-action">
              <i className="fas fa-face-smile"></i> Cảm xúc
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
            Đăng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;

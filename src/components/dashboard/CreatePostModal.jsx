import React from "react";
import "../../styles/CreatePostModal.css";
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
              src={
                user?.avatar ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              }
              alt="avatar"
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
              {selectedImages.map((media, index) => (
                <div key={index} className="preview-item">
                  {media.type && media.type.startsWith("video") ? (
                    <video src={media.url} controls className="preview-media" />
                  ) : (
                    <img
                      src={media.url}
                      alt={`preview-${index}`}
                      className="preview-media"
                    />
                  )}
                  <button
                    onClick={() => removeImage(media)}
                    className="remove-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
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

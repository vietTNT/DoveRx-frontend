import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import "../../styles/AvatarEditor.css";

const AvatarEditorModal = ({ image, onSave, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async () => {
    try {
      const imageObj = await createImage(image);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const { width, height, x, y } = croppedAreaPixels;

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(imageObj, x, y, width, height, 0, 0, width, height);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(new File([blob], "avatar.png", { type: "image/png" }));
        }, "image/png");
      });
    } catch (e) {
      console.error("❌ Lỗi khi crop ảnh:", e);
      return null;
    }
  };

  const handleSave = async () => {
    const croppedImage = await getCroppedImg();
    if (croppedImage) {
      onSave(croppedImage);
    }
  };

  return (
    <div className="avatar-editor-overlay" onClick={onCancel}>
      <div className="avatar-editor-modal" onClick={(e) => e.stopPropagation()}>
        <h3>✨ Chỉnh sửa ảnh đại diện</h3>

        <div className="cropper-container">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: {
                width: "100%",
                height: "100%",
                position: "relative",
              },
            }}
          />
        </div>

        <div className="editor-controls">
          <label>
            <span className="zoom-label">
              <i className="fas fa-search-plus"></i> Phóng to/Thu nhỏ
            </span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            />
          </label>
        </div>

        <div className="editor-actions">
          <button onClick={onCancel} className="btn-cancel" type="button">
            <i className="fas fa-times"></i> Hủy
          </button>
          <button onClick={handleSave} className="btn-save" type="button">
            <i className="fas fa-check"></i> Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditorModal;

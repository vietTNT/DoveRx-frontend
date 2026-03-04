import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import "../../styles/AvatarEditor.css";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
const AvatarEditorModal = ({ image, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);

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

      // return new Promise((resolve) => {
      //   canvas.toBlob((blob) => {
      //     resolve(new File([blob], "avatar.png", { type: "image/png" }));
      //   }, "image/png");
      // });
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) =>
            resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" })),
          "image/jpeg",
          0.85,
        );
      });
    } catch (e) {
      console.error("❌ Lỗi khi crop ảnh:", e);
      return null;
    }
  };

  // const handleSave = async () => {
  //   if (isProcessing) return; // Chặn spam click
  //   setIsProcessing(true);
  //   if (isSaving) return;
  //   setIsSaving(true);
  //   try {
  //     const croppedImage = await getCroppedImg();
  //     if (croppedImage) {
  //       await onSave(croppedImage);
  //       toast.success(t("profile.avatar_updated", "Đã cập nhật ảnh đại diện!"));
  //       onCancel();
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error(t("profile.avatar_update_error"));
  //   } finally {
  //     setIsProcessing(false);
  //     setIsSaving(false);
  //   }
  // };
  const handleSave = async () => {
    if (isProcessing) return;
    setIsProcessing(true); // Bật icon loading xoay tròn trên nút

    try {
      const croppedImage = await getCroppedImg(); // Xử lý cắt siêu tốc
      if (croppedImage) {
        // Chỉ truyền file ra ngoài, trang Profile sẽ tự lo việc đóng Modal và Upload
        onSave(croppedImage);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("profile.avatar_update_error", "Lỗi cắt ảnh!"));
      setIsProcessing(false); // Chỉ tắt loading khi bị lỗi
    }
  };
  return (
    <div className="avatar-editor-overlay" onClick={onCancel}>
      <div className="avatar-editor-modal" onClick={(e) => e.stopPropagation()}>
        <h3>✨ {t("avatarEditor.title")}</h3>

        <div className="cropper-container">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
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
              cropAreaStyle: {
                borderRadius: "12px",
              },
            }}
          />
        </div>

        <div className="editor-controls">
          <label>
            <span className="zoom-label">
              <i className="fas fa-search-plus"></i> {t("avatarEditor.zoom")}:
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
            <i className="fas fa-times"></i> {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="btn-save"
            type="button"
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>{" "}
                {t("common.processing")}
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>{" "}
                {t("avatarEditor.save_changes")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditorModal;

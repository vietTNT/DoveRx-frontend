import React from "react";
import "../../styles/Lightbox.css";
import { resolveImageUrl } from "../../utils/imageHelper";
const Lightbox = ({ lightbox, onClose, changeImage }) => {
  if (!lightbox?.open) return null;
  const current = lightbox.images[lightbox.index];
  if (!current) return null;
  const isVideo =
    current?.type?.startsWith("video") ||
    (current?.url &&
      (current.url.includes("/video/") || current.url.endsWith(".mp4")));
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        ×
      </button>

      {isVideo ? (
        <video
          // Bọc resolveImageUrl cho video
          src={resolveImageUrl(current.url)}
          controls
          autoPlay
          className="lightbox-media"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          // Bọc resolveImageUrl cho hình ảnh
          src={resolveImageUrl(current.url)}
          alt="zoomed"
          className="lightbox-media"
          onClick={(e) => e.stopPropagation()}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
          }}
        />
      )}

      {lightbox.images.length > 1 && (
        <>
          <button
            className="lightbox-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              changeImage("prev");
            }}
          >
            ‹
          </button>
          <button
            className="lightbox-nav next"
            onClick={(e) => {
              e.stopPropagation();
              changeImage("next");
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
};

export default Lightbox;

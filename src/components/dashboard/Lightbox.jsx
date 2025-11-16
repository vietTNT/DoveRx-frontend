import React from "react";
import "../../styles/Lightbox.css";
const Lightbox = ({ lightbox, onClose, changeImage }) => {
  if (!lightbox?.open) return null;
  const current = lightbox.images[lightbox.index];

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        ×
      </button>

      {current?.type?.startsWith("video") ? (
        <video
          src={current.url}
          controls
          autoPlay
          className="lightbox-media"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={current.url}
          alt="zoomed"
          className="lightbox-media"
          onClick={(e) => e.stopPropagation()}
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

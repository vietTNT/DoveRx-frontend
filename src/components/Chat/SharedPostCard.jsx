import React from "react";
import { resolveImageUrl } from "../../utils/imageHelper";

const SharedPostCard = ({ postData }) => {
  if (!postData) return null;

  // 1. Lấy dữ liệu hiển thị (Ưu tiên shared_post)
  const displayData = postData.shared_post ? postData.shared_post : postData;

  // 2. Xử lý nội dung text
  let contentDisplay = displayData.content || displayData.content_text || "";
  if (typeof contentDisplay === "object") {
    contentDisplay = `Hồ sơ y tế: ${contentDisplay.symptom || "Chi tiết..."}`;
  } else if (
    typeof contentDisplay === "string" &&
    contentDisplay.startsWith("{")
  ) {
    try {
      const parsed = JSON.parse(contentDisplay);
      contentDisplay = `Hồ sơ y tế: ${parsed.symptom || "Chi tiết..."}`;
    } catch {
      // Giữ nguyên nếu không parse được
    }
  }

  // 3. Xử lý Media (Ảnh/Video)
  const mediaList = displayData.images || displayData.media || [];
  const firstMedia = mediaList.length > 0 ? mediaList[0] : null;

  let isVideo = false;
  let mediaUrl = "";

  if (firstMedia) {
    // ✅ SỬA: Truy xuất đúng thuộc tính URL
    const rawUrl = firstMedia.url || firstMedia.file || firstMedia.image || "";
    mediaUrl = resolveImageUrl(rawUrl);

    console.log("🖼️ [SharedPostCard] Image URL:", mediaUrl);

    const type = firstMedia.type || firstMedia.file_type || "";
    const isVideoExtension = /\.(mp4|mov|avi|webm|mkv)$/i.test(mediaUrl);

    if (type === "video" || isVideoExtension) {
      isVideo = true;
    }
  }

  const handleClick = (e) => {
    e.stopPropagation();
    const targetId = displayData.id || postData.id;
    window.dispatchEvent(
      new CustomEvent("open_post_notification", {
        detail: { postId: targetId },
      }),
    );
  };

  return (
    <div
      className="shared-post-message"
      onClick={handleClick}
      style={{
        marginTop: "8px",
        marginBottom: "4px",
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        maxWidth: "280px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      }}
    >
      {/* --- PHẦN MEDIA (ẢNH/VIDEO) --- */}
      {firstMedia ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "140px",
            backgroundColor: "#f0f2f5", // Màu nền xám để dễ thấy khung
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #eee",
          }}
        >
          {isVideo ? (
            <video
              src={mediaUrl}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              muted
              playsInline
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
              }}
            />
          )}

          {isVideo && (
            <div
              style={{
                position: "absolute",
                color: "white",
                fontSize: "30px",
                opacity: 0.9,
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              <i className="fas fa-play-circle"></i>
            </div>
          )}
        </div>
      ) : // Nếu không có media list
      null}

      {/* --- PHẦN NỘI DUNG TEXT --- */}
      <div style={{ padding: "10px", backgroundColor: "#f0f2f5" }}>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <span
            style={{ fontWeight: "bold", fontSize: "12px", color: "#050505" }}
          >
            {displayData.author?.name || "Người dùng"}
          </span>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "#65676b",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: "1.4",
          }}
        >
          {contentDisplay || "Chia sẻ bài viết"}
        </p>
      </div>
    </div>
  );
};

export default SharedPostCard;

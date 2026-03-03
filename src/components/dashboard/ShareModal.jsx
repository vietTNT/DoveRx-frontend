import React, { useState, useEffect } from "react";
import { resolveImageUrl } from "../../utils/imageHelper";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getFriends } from "../../services/friendApi";
import { sharePost } from "../../services/socialApi";
import { sharePostToMessage } from "../../services/chatApi";

const ShareModal = ({ onClose, user, post, onShare }) => {
  const { t } = useTranslation();

  const [message, setMessage] = useState("");
  const [shareTarget, setShareTarget] = useState("public");
  const [viewMode, setViewMode] = useState("MAIN");
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState([]);
  const [isSharing, setIsSharing] = useState(false);

  const isButtonDisabled = isSharing || (!message.trim() && !post);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await getFriends();
        if (Array.isArray(data)) {
          const formatted = data.map((f) => ({
            id: f.id,
            name: f.name || f.user?.name || t("navbar.role_user", "Người dùng"),
            avatar: f.avatar || f.user?.avatar,
            isSent: false,
          }));
          setContacts(formatted);
        }
      } catch (error) {
        console.error("❌ Lỗi tải danh sách bạn bè:", error);
      }
    };
    fetchFriends();
  }, [t]);

  const handleShare = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);

      // shareTarget đang lưu 'public', 'friends', 'private' -> khớp với backend
      const payload = {
        message: message || "",
        visibility: shareTarget,
      };

      // Gọi API tại đây
      const result = await sharePost(post?.id, payload);

      // FIX 2: Truyền kết quả (result) ra ngoài thay vì chỉ truyền message
      if (onShare) {
        onShare(result);
      }

      toast.success(t("dashboard.share_success", "✅ Đã chia sẻ bài viết!"));
      onClose();
    } catch (error) {
      console.error("❌ Lỗi chia sẻ:", error);
      toast.error(
        error.response?.data?.detail ||
          t("error.generic", "❌ Chia sẻ thất bại!"),
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleSendToMessage = async (contactId) => {
    // Chặn spam click
    if (contacts.find((c) => c.id === contactId)?.isSent) return;

    try {
      // ✅ GỌI API THẬT
      await sharePostToMessage({
        recipientId: contactId,
        postId: post.id,
        text: message, // Lấy từ state message (input "Bạn đang nghĩ gì...")
      });

      // Cập nhật UI: Đổi nút "Gửi" thành "Đã gửi"
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, isSent: true } : c)),
      );

      toast.success(
        t("share_modal.send_message_success", "Đã gửi tin nhắn thành công!"),
      );
    } catch (error) {
      console.error("❌ Lỗi gửi tin nhắn:", error);
      toast.error(
        t(
          "share_modal.send_message_error",
          "Không thể gửi tin nhắn. Vui lòng thử lại.",
        ),
      );
    }
  };

  const getAudienceInfo = (target) => {
    switch (target) {
      case "public":
        return {
          icon: "fas fa-globe-americas",
          text: t("post.visibility_public", "Công khai"),
        };
      case "friends":
        return {
          icon: "fas fa-user-friends",
          text: t("post.visibility_friends", "Bạn bè"),
        };
      case "private":
        return {
          icon: "fas fa-lock",
          text: t("post.visibility_private", "Chỉ mình tôi"),
        };
      default:
        return {
          icon: "fas fa-globe-americas",
          text: t("post.visibility_public", "Công khai"),
        };
    }
  };
  const currentAudience = getAudienceInfo(shareTarget);

  const audienceOptions = [
    {
      id: "public",
      icon: "fas fa-globe-americas",
      title: t("post.visibility_public", "Công khai"),
      sub: t("share_modal.public_desc", "Bất kỳ ai ở trên hoặc ngoài DoveRx"),
    },
    {
      id: "friends",
      icon: "fas fa-user-friends",
      title: t("post.visibility_friends", "Bạn bè"),
      sub: t("share_modal.friends_desc", "Bạn bè của bạn trên DoveRx"),
    },
    {
      id: "private",
      icon: "fas fa-lock",
      title: t("post.visibility_private", "Chỉ mình tôi"),
      sub: t("share_modal.private_desc", "Chỉ mình bạn nhìn thấy bài viết này"),
    },
  ];

  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Hàm đóng modal và reset state
  const handleClose = () => {
    // Reset state isSent của tất cả contacts
    setContacts((prev) => prev.map((c) => ({ ...c, isSent: false })));
    setMessage("");
    setSearchTerm("");
    setViewMode("MAIN");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-overlay-enter"
      onClick={handleClose} // ✅ SỬA: Gọi handleClose thay vì onClose
    >
      <div
        className="relative w-full max-w-[550px] bg-[#242526] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-[#3e4042] flex flex-col overflow-hidden animate-modal-enter transition-all duration-300"
        style={{
          maxHeight: "90vh",
          height: viewMode === "MESSAGE" ? "600px" : "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {viewMode === "MAIN" && (
          <>
            {/* Header Main */}
            <div className="relative flex items-center justify-center h-[60px] border-b border-[#3e4042] shrink-0 bg-[#242526] z-10">
              <h3 className="text-[20px] font-bold text-[#e4e6eb]">
                {t("share.title", "Chia sẻ")}
              </h3>
              <div
                onClick={handleClose} // ✅ SỬA: Gọi handleClose
                className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#3a3b3c] hover:bg-[#4e4f50] flex items-center justify-center cursor-pointer transition-colors"
              >
                <i className="fas fa-times text-[20px] text-[#b0b3b8]"></i>
              </div>
            </div>

            {/* Body Main */}
            <div className="flex-1 overflow-y-auto p-4 custom-scroll relative">
              <div className="flex gap-3 mb-4 items-start">
                <img
                  src={resolveImageUrl(user?.avatar)}
                  alt="avatar"
                  className="w-10 h-10 rounded-full border border-[#3e4042] object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-[#e4e6eb] font-semibold text-[15px] mb-0.5">
                    {user?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode("AUDIENCE")}
                      className="bg-[#3a3b3c] px-2 py-[4px] rounded-[6px] text-[13px] text-[#e4e6eb] font-semibold leading-none flex items-center gap-1 hover:bg-[#4e4f50] transition-colors"
                    >
                      <i
                        className={`${currentAudience.icon} text-[12px] text-[#b0b3b8]`}
                      ></i>
                      <span>{currentAudience.text}</span>
                      <i className="fas fa-caret-down text-[12px] text-[#b0b3b8]"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative mb-2 group">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-transparent text-[#e4e6eb] text-[20px] outline-none resize-none min-h-[100px] placeholder-[#8e8e8e] py-2 pr-8"
                  placeholder={
                    t("dashboard.what_thinking", {
                      name: user?.name?.split(" ").pop() || "",
                    }) ||
                    `Bạn đang nghĩ gì thế, ${user?.name?.split(" ").pop() || ""}?`
                  }
                  autoFocus
                />
                <div className="absolute right-0 top-2 cursor-pointer p-1 rounded-full hover:bg-[#3a3b3c] transition-colors">
                  <i className="far fa-smile text-[24px] text-[#b0b3b8] hover:text-[#e4e6eb]"></i>
                </div>
              </div>

              {post && (
                <div className="border border-[#3e4042] rounded-lg overflow-hidden mt-2 bg-[#242526]">
                  {post.images && post.images.length > 0 && (
                    <div className="bg-[#18191a] flex justify-center border-b border-[#3e4042]">
                      <img
                        src={resolveImageUrl(post.images[0].url)}
                        className="max-h-[280px] w-auto object-contain"
                        alt="preview"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                        }}
                      />
                    </div>
                  )}

                  <div className="p-3 bg-[#323436]/30">
                    <p className="text-[#e4e6eb] font-bold line-clamp-1 mt-0.5 text-[15px]">
                      {post.author?.name || t("navbar.role_user", "Người dùng")}
                    </p>

                    {/* ĐÃ FIX: Xử lý hiển thị an toàn khi content là Object Y khoa */}
                    <div className="text-[#b0b3b8] text-[13px] line-clamp-2 mt-0.5">
                      {post.kind === "medical" &&
                      typeof post.content === "object" ? (
                        <div className="flex flex-col">
                          {post.content.symptom && (
                            <span>
                              <strong>
                                {t(
                                  "dashboard.medical_form.symptom",
                                  "Triệu chứng",
                                )}
                                :
                              </strong>{" "}
                              {post.content.symptom}
                            </span>
                          )}
                          <span className="text-[#2d88ff] italic text-[12px] mt-0.5">
                            {t(
                              "post.expand_medical_form",
                              "... Xem Form bệnh lý đính kèm",
                            )}
                          </span>
                        </div>
                      ) : (
                        post.content ||
                        t("post.no_content", "Không có nội dung")
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Main */}
            <div className="p-4 pt-2 border-t border-[#3e4042] shrink-0 bg-[#242526] flex flex-col gap-2 z-20">
              <div
                onClick={() => !isSharing && setViewMode("MESSAGE")}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group ${
                  isSharing
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#3a3b3c]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2d88ff]/10 flex items-center justify-center">
                    <i className="fab fa-facebook-messenger text-[20px] text-[#2d88ff]"></i>
                  </div>
                  <span className="text-[#e4e6eb] text-[15px] font-semibold">
                    {t("share.send_via_messenger", "Gửi bằng tin nhắn")}
                  </span>
                </div>
                <i className="fas fa-chevron-right text-[#b0b3b8] text-[14px]"></i>
              </div>

              <button
                onClick={handleShare}
                disabled={isButtonDisabled}
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-[15px] transition-all 
                  ${
                    isButtonDisabled
                      ? "bg-[#505151] text-[#8e8e8e] cursor-not-allowed"
                      : "bg-[#1877f2] hover:bg-[#166fe5] text-white shadow-md active:scale-[0.98]"
                  }`}
              >
                {isSharing
                  ? t("share_modal.sharing", "Đang chia sẻ...")
                  : t("share.share_now", "Chia sẻ ngay")}
              </button>
            </div>
          </>
        )}

        {viewMode === "AUDIENCE" && (
          <div className="flex flex-col h-full animate-fadeIn bg-[#242526]">
            <div className="relative flex items-center justify-center h-[60px] border-b border-[#3e4042] shrink-0">
              <div
                onClick={() => setViewMode("MAIN")}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#3a3b3c] hover:bg-[#4e4f50] flex items-center justify-center cursor-pointer transition-colors"
              >
                <i className="fas fa-arrow-left text-[20px] text-[#b0b3b8]"></i>
              </div>
              <h3 className="text-[20px] font-bold text-[#e4e6eb]">
                {t("share_modal.who_can_see", "Đối tượng")}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scroll">
              <p className="text-[#e4e6eb] text-[17px] font-bold mb-2">
                {t("share_modal.who_can_see", "Ai có thể xem bài viết này?")}
              </p>
              <p className="text-[#b0b3b8] text-[14px] mb-4">
                {t(
                  "share_modal.feed_visibility_desc",
                  "Bài viết sẽ hiển thị trên Bảng feed, trang cá nhân và kết quả tìm kiếm.",
                )}
              </p>

              <div className="flex flex-col gap-1">
                {audienceOptions.map((opt) => {
                  const isSelected = shareTarget === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-[#2d88ff]/10" : "hover:bg-[#3a3b3c]"}`}
                      onClick={() => setShareTarget(opt.id)}
                    >
                      <div className="w-[50px] h-[50px] rounded-full bg-[#3a3b3c] flex items-center justify-center text-[24px] text-[#e4e6eb] shrink-0">
                        <i className={opt.icon}></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-[16px] font-semibold text-[#e4e6eb]">
                          {opt.title}
                        </p>
                        <p className="text-[13px] text-[#b0b3b8] leading-tight mt-1">
                          {opt.sub}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-[#1877f2]" : "border-[#b0b3b8]"}`}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 bg-[#1877f2] rounded-full"></div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === "MESSAGE" && (
          <div className="flex flex-col h-full animate-fadeIn bg-[#242526]">
            <div className="relative flex items-center justify-center h-[60px] border-b border-[#3e4042] shrink-0">
              <h3 className="text-[20px] font-bold text-[#e4e6eb]">
                {t("share_modal.new_message", "Gửi tin nhắn mới")}
              </h3>
            </div>

            <div className="px-4 py-3 border-b border-[#3e4042]">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b3b8]">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  placeholder={t(
                    "share_modal.search_people",
                    "Tìm kiếm người...",
                  )}
                  className="w-full bg-[#3a3b3c] text-[#e4e6eb] rounded-full pl-10 pr-4 py-2 outline-none placeholder-[#b0b3b8] focus:bg-[#4e4f50] transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scroll">
              <p className="text-[#b0b3b8] text-[13px] font-semibold px-4 py-2 uppercase">
                {t("share_modal.suggestions", "Gợi ý")}
              </p>
              <div className="flex flex-col px-2">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[#3a3b3c] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#505151] flex shrink-0 items-center justify-center overflow-hidden border border-[#3e4042]">
                          {contact.avatar ? (
                            <img
                              src={resolveImageUrl(contact.avatar)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[#e4e6eb] font-bold text-sm">
                              {contact.name?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[#e4e6eb] font-semibold text-[15px] leading-snug truncate">
                            {contact.name}
                          </span>
                          <span className="text-[#b0b3b8] text-[12px]">
                            {t("user_profile.friend_status", "Bạn bè")}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendToMessage(contact.id);
                        }}
                        disabled={contact.isSent}
                        style={{ width: "auto" }}
                        className={`ml-3 px-5 py-[6px] rounded-[6px] font-semibold text-[14px] transition-all shrink-0 border whitespace-nowrap min-w-[70px] flex justify-center items-center
                            ${
                              contact.isSent
                                ? "bg-transparent border-transparent text-[#b0b3b8] cursor-default"
                                : "bg-[#2d88ff]/10 text-[#2d88ff] hover:bg-[#2d88ff]/20 border-transparent"
                            }`}
                      >
                        {contact.isSent
                          ? t("share_modal.sent", "Đã gửi")
                          : t("share_modal.send", "Gửi")}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-[#b0b3b8]">
                    {contacts.length === 0
                      ? t("share_modal.loading_list", "Đang tải danh sách...")
                      : t(
                          "share_modal.no_user_found",
                          "Không tìm thấy người dùng.",
                        )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#3e4042] shrink-0 flex justify-end bg-[#242526]">
              <button
                className="px-8 py-2 rounded-lg font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] shadow-md transition-colors"
                onClick={() => setViewMode("MAIN")}
              >
                {t("share_modal.done", "Xong")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;

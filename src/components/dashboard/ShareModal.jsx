import React, { useState } from "react";

import { resolveImageUrl } from "../../utils/imageHelper";
import { useTranslation } from "react-i18next";

const ShareModal = ({ onClose, user, post, onShare }) => {
  const { t } = useTranslation();
  
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [message, setMessage] = useState("");
  const [shareTarget, setShareTarget] = useState("public");
  const [viewMode, setViewMode] = useState("MAIN"); // 'MAIN' | 'AUDIENCE' | 'MESSAGE'
  const [searchTerm, setSearchTerm] = useState("");

  // Mock Data bạn bè
  const [contacts, setContacts] = useState([
    { id: 1, name: "Nguyễn Văn A", avatar: null, isSent: false },
    { id: 2, name: "Trần Thị B", avatar: null, isSent: false },
    { id: 3, name: "Lê Văn C", avatar: null, isSent: false },
    { id: 4, name: "Team Dev DoveRx", avatar: null, isSent: false },
  ]);

  const isButtonDisabled = !message.trim() && !post;

  // --- ACTIONS ---
  const handleShare = () => {
    if (onShare) onShare(message, shareTarget);
    onClose();
  };

  const handleSendToMessage = (id) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, isSent: true } : c));
  };

  // --- HELPER FUNCTIONS ---
  const getAudienceInfo = (target) => {
    switch (target) {
      case "public": return { icon: "fas fa-globe-americas", text: t("share.audience.public") || "Công khai" };
      case "friends": return { icon: "fas fa-user-friends", text: t("share.audience.friends") || "Bạn bè" };
      case "private": return { icon: "fas fa-lock", text: t("share.audience.only_me") || "Chỉ mình tôi" };
      default: return { icon: "fas fa-globe-americas", text: t("share.audience.public") || "Công khai" };
    }
  };
  const currentAudience = getAudienceInfo(shareTarget);

  const audienceOptions = [
    { id: "public", icon: "fas fa-globe-americas", title: "Công khai", sub: "Bất kỳ ai ở trên hoặc ngoài DoveRx" },
    { id: "friends", icon: "fas fa-user-friends", title: "Bạn bè", sub: "Bạn bè của bạn trên DoveRx" },
    { id: "private", icon: "fas fa-lock", title: "Chỉ mình tôi", sub: "Chỉ mình bạn nhìn thấy bài viết này" }
  ];

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // OVERLAY
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-overlay-enter"
      onClick={onClose}
    >
      {/* MODAL CONTAINER */}
      <div 
        className="relative w-full max-w-[550px] bg-[#242526] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-[#3e4042] flex flex-col overflow-hidden animate-modal-enter transition-all duration-300"
        style={{ maxHeight: "90vh", height: viewMode === 'MESSAGE' ? '600px' : 'auto' }} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ================================================================================= */}
        {/* VIEW 1: MAIN (SOẠN BÀI VIẾT) */}
        {/* ================================================================================= */}
        {viewMode === "MAIN" && (
          <>
            {/* Header Main */}
            <div className="relative flex items-center justify-center h-[60px] border-b border-[#3e4042] shrink-0 bg-[#242526] z-10">
              <h3 className="text-[20px] font-bold text-[#e4e6eb]">{t("share.title") || "Tạo bài viết"}</h3>
              <div onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#3a3b3c] hover:bg-[#4e4f50] flex items-center justify-center cursor-pointer transition-colors">
                <i className="fas fa-times text-[20px] text-[#b0b3b8]"></i>
              </div>
            </div>

            {/* Body Main */}
            <div className="flex-1 overflow-y-auto p-4 custom-scroll relative">
               <div className="flex gap-3 mb-4 items-start">
                 <img src={resolveImageUrl(user?.avatar)} alt="avatar" className="w-10 h-10 rounded-full border border-[#3e4042] object-cover"/>
                 <div className="flex flex-col">
                    <span className="text-[#e4e6eb] font-semibold text-[15px] mb-0.5">{user?.name}</span>
                    <div className="flex items-center gap-2">
                       {/* Nút chọn đối tượng */}
                       <button 
                         onClick={() => setViewMode("AUDIENCE")} 
                         className="bg-[#3a3b3c] px-2 py-[4px] rounded-[6px] text-[13px] text-[#e4e6eb] font-semibold leading-none flex items-center gap-1 hover:bg-[#4e4f50] transition-colors"
                       >
                           <i className={`${currentAudience.icon} text-[12px] text-[#b0b3b8]`}></i> 
                           <span>{currentAudience.text}</span>
                           <i className="fas fa-caret-down text-[12px] text-[#b0b3b8]"></i>
                       </button>
                       
                    </div>
                 </div>
               </div>

               {/* Input Area */}
               <div className="relative mb-2 group">
                 <textarea 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-transparent text-[#e4e6eb] text-[20px] outline-none resize-none min-h-[100px] placeholder-[#8e8e8e] py-2 pr-8"
                    placeholder={`Bạn đang nghĩ gì thế, ${user?.name?.split(' ').pop()}?`}
                    autoFocus
                 />
                 <div className="absolute right-0 top-2 cursor-pointer p-1 rounded-full hover:bg-[#3a3b3c] transition-colors">
                     <i className="far fa-smile text-[24px] text-[#b0b3b8] hover:text-[#e4e6eb]"></i>
                 </div>
               </div>
               
               {/* Post Preview */}
               {post && (
                  <div className="border border-[#3e4042] rounded-lg overflow-hidden mt-2 bg-[#242526] hover:bg-[#303031] transition-colors cursor-pointer">
                     {post.images?.[0] && (
                         <div className="bg-[#18191a] flex justify-center border-b border-[#3e4042]">
                             <img src={post.images[0].url} className="max-h-[280px] w-auto object-contain" alt="preview"/>
                         </div>
                     )}
                     <div className="p-3 bg-[#323436]/30">
                        <p className="text-[#b0b3b8] text-[12px] uppercase font-medium">DoveRx Link</p>
                        <p className="text-[#e4e6eb] font-bold line-clamp-1 mt-0.5 text-[15px]">{post.author?.name}</p>
                        <p className="text-[#b0b3b8] text-[13px] line-clamp-1 mt-0.5">{post.content}</p>
                     </div>
                  </div>
               )}
            </div>

            {/* Footer Main */}
            <div className="p-4 pt-2 border-t border-[#3e4042] shrink-0 bg-[#242526] flex flex-col gap-2 z-20">
               {/* Nút mở màn hình tin nhắn */}
               <div 
                 onClick={() => setViewMode("MESSAGE")} 
                 className="flex items-center justify-between p-2 rounded-lg hover:bg-[#3a3b3c] cursor-pointer transition-colors group"
               >
                  <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-full bg-[#2d88ff]/10 group-hover:bg-[#2d88ff]/20 flex items-center justify-center transition-colors">
                        <i className="fab fa-facebook-messenger text-[20px] text-[#2d88ff]"></i>
                     </div>
                     <span className="text-[#e4e6eb] text-[15px] font-semibold leading-tight">Gửi bằng tin nhắn</span>
                  </div>
                  <i className="fas fa-chevron-right text-[#b0b3b8] text-[14px]"></i>
               </div>

               <button 
                  onClick={handleShare} 
                  disabled={isButtonDisabled}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-[15px] transition-all 
                    ${isButtonDisabled 
                       ? "bg-[#505151] text-[#8e8e8e] cursor-not-allowed" 
                       : "bg-[#1877f2] hover:bg-[#166fe5] text-white shadow-md active:scale-[0.98]"}`}
               >
                  Chia sẻ ngay
               </button>
            </div>
          </>
        )}

        {/* ================================================================================= */}
        {/* VIEW 2: AUDIENCE (CHỌN ĐỐI TƯỢNG) */}
        {/* ================================================================================= */}
        {viewMode === "AUDIENCE" && (
          <div className="flex flex-col h-full animate-fadeIn bg-[#242526]">
            <div className="relative flex items-center justify-center h-[60px] border-b border-[#3e4042] shrink-0">
               <div onClick={() => setViewMode("MAIN")} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#3a3b3c] hover:bg-[#4e4f50] flex items-center justify-center cursor-pointer transition-colors">
                  <i className="fas fa-arrow-left text-[20px] text-[#b0b3b8]"></i>
               </div>
               <h3 className="text-[20px] font-bold text-[#e4e6eb]">Đối tượng</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scroll">
               <p className="text-[#e4e6eb] text-[17px] font-bold mb-2">Ai có thể xem bài viết này?</p>
               <p className="text-[#b0b3b8] text-[14px] mb-4">Bài viết sẽ hiển thị trên Bảng feed, trang cá nhân và kết quả tìm kiếm.</p>
               
               <div className="flex flex-col gap-1">
                 {audienceOptions.map((opt) => {
                   const isSelected = shareTarget === opt.id;
                   return (
                     <label key={opt.id} className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-[#2d88ff]/10" : "hover:bg-[#3a3b3c]"}`} onClick={() => setShareTarget(opt.id)}>
                       <div className="w-[50px] h-[50px] rounded-full bg-[#3a3b3c] flex items-center justify-center text-[24px] text-[#e4e6eb] shrink-0">
                         <i className={opt.icon}></i>
                       </div>
                       <div className="flex-1">
                         <p className="text-[16px] font-semibold text-[#e4e6eb]">{opt.title}</p>
                         <p className="text-[13px] text-[#b0b3b8] leading-tight mt-1">{opt.sub}</p>
                       </div>
                       {/* Custom Radio Button */}
                       <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-[#1877f2]" : "border-[#b0b3b8]"}`}>
                          {isSelected && <div className="w-3 h-3 bg-[#1877f2] rounded-full"></div>}
                       </div>
                     </label>
                   );
                 })}
               </div>
            </div>
            
        
          </div>
        )}

        {/* ================================================================================= */}
        {/* VIEW 3: MESSAGE (GỬI TIN NHẮN) */}
        {/* ================================================================================= */}
        {viewMode === "MESSAGE" && (
          <div className="flex flex-col h-full animate-fadeIn bg-[#242526]">
            {/* Header Message */}
            <div className="relative flex items-center justify-center h-[60px] border-b border-[#3e4042] shrink-0">
          
               <h3 className="text-[20px] font-bold text-[#e4e6eb]">Gửi tin nhắn mới</h3>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-[#3e4042]">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b3b8]"><i className="fas fa-search"></i></span>
                <input 
                  type="text" placeholder="Tìm kiếm người..." 
                  className="w-full bg-[#3a3b3c] text-[#e4e6eb] rounded-full pl-10 pr-4 py-2 outline-none placeholder-[#b0b3b8] focus:bg-[#4e4f50] transition-colors"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus
                />
              </div>
            </div>

            {/* List Friends */}
            <div className="flex-1 overflow-y-auto p-2 custom-scroll">
              <p className="text-[#b0b3b8] text-[13px] font-semibold px-4 py-2 uppercase">Gợi ý</p>
              <div className="flex flex-col px-2">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#3a3b3c] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#505151] flex shrink-0 items-center justify-center overflow-hidden border border-[#3e4042]">
                        {contact.avatar ? <img src={resolveImageUrl(contact.avatar)} alt="" className="w-full h-full object-cover"/> : <span className="text-[#e4e6eb] font-bold text-sm">{contact.name.charAt(0)}</span>}
                      </div>
                      <div className="flex flex-col min-w-0">
                         <span className="text-[#e4e6eb] font-semibold text-[15px] leading-snug truncate">{contact.name}</span>
                         <span className="text-[#b0b3b8] text-[12px]">Bạn bè</span>
                      </div>
                    </div>
                    
                    {/* --- FIX LỖI BUTTON Ở ĐÂY --- */}
                    {/* Dùng style inline để chắc chắn background transparent và width auto, tránh bị CSS global ghi đè */}
                 <button 
                      onClick={(e) => { e.stopPropagation(); handleSendToMessage(contact.id); }}
                      disabled={contact.isSent}
                      style={{ width: 'auto' }} 
                      className={`ml-3 px-5 py-[6px] rounded-[6px] font-semibold text-[14px] transition-all shrink-0 border whitespace-nowrap min-w-[70px] flex justify-center items-center
                        ${contact.isSent 
                          ? "bg-transparent border-transparent text-[#b0b3b8] cursor-default" 
                          : "bg-[#2d88ff]/10 text-[#2d88ff] hover:bg-[#2d88ff]/20 border-transparent"}`}
                    >
                      {contact.isSent ? "Đã gửi" : "Gửi"}
                    </button>
                  </div>
                ))}
                {filteredContacts.length === 0 && <div className="text-center py-6 text-[#b0b3b8]">Không tìm thấy người dùng.</div>}
              </div>
            </div>
            
            {/* Footer Message */}
            <div className="p-4 border-t border-[#3e4042] shrink-0 flex justify-end bg-[#242526]">
               <button className="px-8 py-2 rounded-lg font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] shadow-md transition-colors" onClick={() => setViewMode("MAIN")}>Xong</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ShareModal;
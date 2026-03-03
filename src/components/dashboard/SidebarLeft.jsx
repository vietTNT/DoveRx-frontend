import React, { useEffect, useState } from "react";
import "../../styles/SidebarLeft.css";
import { useTranslation } from "react-i18next";
import FriendSuggestions from "../FriendSuggestions";

const SidebarLeft = () => {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Lấy thông tin user từ localStorage
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error("❌ Parse user error:", e);
      }
    }
  }, []);

  return (
    <aside className="sidebar-left">
      <ul>
        <li>
          <i className="fas fa-home"></i> {t("navbar.home")}
        </li>
        {/* <li>
          <i className="fas fa-user-friends"></i> {t("navbar.friend_request")}
        </li>
        <li>
          <i className="fas fa-users"></i> {t("navbar.community")}
        </li>
        <li>
          <i className="fas fa-video"></i> {t("dashboard.video")}
        </li>
        <li>
          <i className="fas fa-calendar-alt"></i> {t("dashboard.event")}
        </li> */}
      </ul>

      {currentUser?.role !== "admin" && (
        <div className="sidebar-section">
          <FriendSuggestions />
        </div>
      )}
    </aside>
  );
};

export default SidebarLeft;

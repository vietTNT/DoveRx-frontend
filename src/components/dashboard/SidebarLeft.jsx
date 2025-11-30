import React from "react";
import "../../styles/SidebarLeft.css";
import { useTranslation } from "react-i18next"; // 1. Import

const SidebarLeft = () => {
  const { t } = useTranslation(); // 2. Hook

  return (
    <aside className="sidebar-left">
      <ul>
        <li>
          <i className="fas fa-home"></i> {t("navbar.home")}
        </li>
        <li>
          <i className="fas fa-user-friends"></i> {t("navbar.friend_request")}
        </li>
        <li>
          <i className="fas fa-users"></i> {t("navbar.community")}
        </li>
        {/* Những mục chưa có trong JSON có thể thêm sau hoặc dùng tạm text cứng */}
        <li>
          <i className="fas fa-video"></i> {t("dashboard.video")}
        </li>
        <li>
          <i className="fas fa-calendar-alt"></i> {t("dashboard.event")}
        </li>
      </ul>
    </aside>
  );
};

export default SidebarLeft;

import React from "react";
import "../../styles/SidebarLeft.css";
const SidebarLeft = () => (
  <aside className="sidebar-left">
    <ul>
      <li>
        <i className="fas fa-home"></i> Trang chủ
      </li>
      <li>
        <i className="fas fa-user-friends"></i> Bạn bè
      </li>
      <li>
        <i className="fas fa-users"></i> Nhóm
      </li>
      <li>
        <i className="fas fa-video"></i> Video
      </li>
      <li>
        <i className="fas fa-calendar-alt"></i> Sự kiện
      </li>
    </ul>
  </aside>
);

export default SidebarLeft;

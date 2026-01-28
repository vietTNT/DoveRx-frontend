import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { deleteUserAccount, getAllUsers } from "../../../api/adminApi";
import Navbar from "../../Navbar";
import "../../../styles/AdminDashboard.css";

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("doctors"); // "doctors" | "users"
  const [doctors, setDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "doctors") {
      loadPendingDoctors();
    } else {
      loadAllUsers();
    }
  }, [activeTab]);

  const loadPendingDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/accounts/admin/pending-doctors/");
      setDoctors(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      // Lọc bỏ admin khỏi danh sách
      setUsers(data.filter((u) => u.role !== "admin"));
    } catch (err) {
      console.error("Lỗi tải users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorAction = async (id, action) => {
    const actionText = action === "approve" ? "duyệt" : "từ chối";
    if (!window.confirm(`Bạn chắc chắn muốn ${actionText} bác sĩ này?`)) return;

    try {
      const reason = action === "reject" ? prompt("Lý do từ chối (tùy chọn):") : "";
      await api.post(`/api/accounts/admin/approve-doctor/${id}/`, { action, reason });
      alert(`✅ Đã ${actionText} thành công!`);
      loadPendingDoctors();
    } catch (err) {
      console.error("Lỗi xử lý:", err);
      alert(`❌ ${actionText} thất bại`);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`⚠️ Bạn chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${userName}"?`)) return;

    try {
      await deleteUserAccount(userId);
      alert("✅ Đã xóa tài khoản thành công!");
      loadAllUsers();
    } catch (err) {
      console.error("Lỗi xóa user:", err);
      alert("❌ Xóa thất bại");
    }
  };

  return (
    <div className="admin-dashboard">
      <Navbar user={user} onLogout={onLogout} />

      <div className="admin-content">
        <div className="admin-header">
          <h1>📋 Admin Panel</h1>
          <span className="admin-badge">Administrator</span>
        </div>

        {/* ✅ TABS */}
        <div className="admin-tabs">
          <button
            className={activeTab === "doctors" ? "active" : ""}
            onClick={() => setActiveTab("doctors")}
          >
            👨‍⚕️ Duyệt Bác sĩ ({doctors.length})
          </button>
          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            👥 Quản lý Users ({users.length})
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">
            <i className="fas fa-spinner fa-spin"></i> Đang tải...
          </div>
        ) : activeTab === "doctors" ? (
          // ✅ TAB DUYỆT BÁC SĨ (GIỮ NGUYÊN CODE CŨ)
          doctors.length === 0 ? (
            <div className="admin-empty">
              <i className="fas fa-inbox"></i>
              <p>Không có yêu cầu nào đang chờ duyệt</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên bác sĩ</th>
                    <th>Chuyên khoa</th>
                    <th>Nơi làm việc</th>
                    <th>Chứng chỉ</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="doctor-name">
                          <strong>{doc.name}</strong>
                          <span className="doctor-email">{doc.email}</span>
                        </div>
                      </td>
                      <td>{doc.specialty || "Chưa có"}</td>
                      <td>{doc.workplace || "Chưa có"}</td>
                      <td>
                        {doc.license_files.length > 0 ? (
                          <ul className="license-files">
                            {doc.license_files.map((url, i) => (
                              <li key={i}>
                                <a href={url} target="_blank" rel="noreferrer">
                                  <i className="fas fa-file-medical"></i> File {i + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="no-files">Chưa có file</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-approve"
                            onClick={() => handleDoctorAction(doc.id, "approve")}
                          >
                            <i className="fas fa-check"></i> Duyệt
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleDoctorAction(doc.id, "reject")}
                          >
                            <i className="fas fa-times"></i> Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // ✅ TAB QUẢN LÝ USERS
          users.length === 0 ? (
            <div className="admin-empty">
              <i className="fas fa-users"></i>
              <p>Không có user nào</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>
                        <div className="user-info">
                          <img
                            src={u.avatar || "/default-avatar.png"}
                            alt=""
                            style={{ width: 40, height: 40, borderRadius: "50%", marginRight: 10 }}
                          />
                          <strong>{u.name || u.username}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role === "doctor" ? "👨‍⚕️ Bác sĩ" : "👤 User"}
                        </span>
                      </td>
                      <td>
                        {u.is_verified ? (
                          <span className="status-badge verified">✅ Đã xác thực</span>
                        ) : (
                          <span className="status-badge pending">⏳ Chưa xác thực</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-delete-user"
                          onClick={() => handleDeleteUser(u.id, u.name || u.username)}
                        >
                          <i className="fas fa-trash-alt"></i> Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import Navbar from "../../Navbar"; // ✅ Import Navbar

const AdminDashboard = ({ user, onLogout }) => {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    loadPendingDoctors();
  }, []);

  const loadPendingDoctors = async () => {
    try {
      const res = await api.get("/api/accounts/admin/pending-doctors/");
      setDoctors(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
    }
  };

  const handleAction = async (id, action) => {
    if (!window.confirm(`Bạn chắc chắn muốn ${action}?`)) return;
    try {
      await api.post(`/api/accounts/admin/approve-doctor/${id}/`, { action });
      alert("Thành công!");
      loadPendingDoctors(); // Load lại danh sách
    } catch (err) {
      alert("Lỗi xử lý");
    }
  };

  return (
    <div>
      {/* ✅ Thêm Navbar */}
      <Navbar user={user} onLogout={onLogout} />

      <div
        style={{
          padding: "20px",
          marginTop: "70px", // Tránh bị che bởi Navbar
          maxWidth: "1200px",
          margin: "90px auto 0",
        }}
      >
        <h2 style={{ color: "#dc2626" }}>📋 Quản lý hồ sơ Bác sĩ (Admin)</h2>
        {doctors.length === 0 ? (
          <p>Không có yêu cầu nào.</p>
        ) : (
          <table
            border="1"
            cellPadding="10"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th>Tên</th>
                <th>Chuyên khoa</th>
                <th>Chứng chỉ</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <b>{doc.name}</b>
                    <br />
                    <small>{doc.email}</small>
                  </td>
                  <td>
                    {doc.specialty}
                    <br />({doc.workplace})
                  </td>
                  <td>
                    {doc.license_files && doc.license_files.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        {doc.license_files.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "blue" }}
                          >
                            📄 Xem File {index + 1}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "red" }}>Chưa có file</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleAction(doc.id, "approve")}
                      style={{
                        background: "green",
                        color: "white",
                        marginRight: "5px",
                        padding: "5px 10px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => handleAction(doc.id, "reject")}
                      style={{
                        background: "red",
                        color: "white",
                        padding: "5px 10px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ❌ Từ chối
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

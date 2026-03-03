import api from "./api";

/**
 * Admin: Xóa tài khoản user
 */
export const deleteUserAccount = async (userId) => {
  const response = await api.delete(`/api/accounts/admin/delete-user/${userId}/`);
  return response.data;
};

/**
 * Admin: Lấy danh sách tất cả users
 */
export const getAllUsers = async () => {
  const response = await api.get("/api/accounts/users/");
  return response.data;
};
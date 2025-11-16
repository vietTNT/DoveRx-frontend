export const mapPostToUI = (srv) => ({
  id: srv.id,
  author: srv.author?.name || "Người dùng",
  avatar:
    srv.author?.avatar ||
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
  time: srv.time, // bạn có thể format “2 giờ trước”
  content: srv.kind === "medical" ? srv.content : srv.content || "",
  images: (srv.images || []).map((m) => ({ url: m.url, type: m.type })),
  _raw: srv,
});

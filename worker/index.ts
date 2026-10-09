export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 接続確認用。配信設定の変更は行わない。
    if (url.pathname === "/api/health") {
      return Response.json({
        success: true,
        service: "vtulog-live",
        message: "Worker is running",
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
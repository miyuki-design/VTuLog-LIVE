export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 既存の動作確認用API
    if (url.pathname === "/api/health") {
      return Response.json({
        success: true,
        service: "vtulog-live",
        message: "Worker is running",
      });
    }

    // 配信先切り替えAPI
    if (url.pathname === "/api/target") {
      if (!["GET", "POST"].includes(request.method)) {
        return new Response("Method Not Allowed", {
          status: 405,
        });
      }

      // 本人認証が完成するまでは操作を禁止
      return Response.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 403 }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
import { serve } from "bun";

serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname;
    
    if (path === "/") path = "/index.html";
    
    try {
      const file = Bun.file(`./public${path}`);
      const exists = await file.exists();
      
      if (!exists) {
        return new Response("Not found", { status: 404 });
      }
      
      const headers = new Headers({
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Content-Type": file.type || "text/plain"
      });
      
      return new Response(file, { headers });
    } catch (error) {
      return new Response("Server error", { status: 500 });
    }
  }
});

console.log("🚀 Server running at http://localhost:3000");
console.log("Headers: COOP=same-origin, COEP=require-corp");

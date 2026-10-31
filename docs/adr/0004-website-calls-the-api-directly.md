# The website calls the API directly, not through a Vercel proxy

The website (Vercel, openearemedy.com) calls the API at api.openearemedy.com (Render) directly, with CORS, rather than proxying `/api` through Vercel. Auth is a bearer token, not a cookie, so cross-origin calls cost nothing extra, and a proxy would risk running admin ebook uploads (up to 50 MB) into Vercel's request size limits and made every request appear to come from Vercel's IP addresses, breaking per-person rate limits. The call WebSocket has to go direct anyway, because Vercel cannot proxy WebSockets.

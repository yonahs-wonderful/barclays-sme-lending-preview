// config.js (bank demo build) — demo wiring. Override at runtime with query params, e.g.
// Default / ?mode=live -> new conversational Talia in USA / Barclays
// ?mode=mock -> original scripted fallback; ?mode=legacy -> original Max
//   ?domain=student                 -> source-demo student content set
//   ?agent=<id> ?proxy=<url> ?key=  -> overrides
(function () {
  var qs = new URLSearchParams(location.search);
  window.DEMO_CONFIG = {
    mode: qs.get("mode") === "mock" ? "mock" : "live",          // "mock" | "live"
    domain: qs.get("domain") || "business",  // "business" | "student"
    live: {
      bridgeUrl: qs.get("mode") === "legacy" ? "" : "https://usa.api.demo.wonderful.ai/api/public/functions/07a1d9a6-8c73-4692-8888-f673051c5149/166dbd8c-42a9-4324-bb75-565b62bda5ba/ys-barclays-chat-preview",
      // The browser CANNOT call the Wonderful API directly: its CORS policy only allows
      // origin https://app.demo.wonderful.ai. So live mode routes through the chat proxy
      // (API Gateway + Lambda, src/ui/proxy/) which injects the admin key server-side.
      baseUrl: "https://wonderful.api.sb.wonderful.ai",
      proxyUrl: qs.get("proxy") || "https://oirxp3nd1m.execute-api.eu-central-1.amazonaws.com",
      agentId: qs.get("mode") === "legacy" ? "dc76c398-f699-49e4-b8ef-9c33e60b3bc1" : "6beb731a-f57f-49bc-8be8-bb9eacfddf48",
      apiKey: qs.get("key") || "",            // unused in proxy mode (proxy holds the key)
      fromName: "James"
    }
  };
})();

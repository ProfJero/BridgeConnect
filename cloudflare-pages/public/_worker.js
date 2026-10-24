// Pages "advanced mode" entry: forward every request to the BridgeConnect Worker via the APP service binding.
// The request keeps its dbibridgeconnect.pages.dev URL, so redirects, cookies and canonical URLs stay on Pages.
const forwarder = {
  async fetch(request, env) {
    if (!env.APP) {
      return new Response("BridgeConnect is being configured. (Service binding APP → bridgeconnect is missing.)", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "60" },
      });
    }
    return env.APP.fetch(request);
  },
};

export default forwarder;

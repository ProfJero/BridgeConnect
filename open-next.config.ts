import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * BridgeConnect renders per user (no ISR), so no incremental cache is
 * configured. Add an R2 incremental cache here if static/ISR pages are
 * introduced later (see @opennextjs/cloudflare templates).
 */
export default defineCloudflareConfig({});

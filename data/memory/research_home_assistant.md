# Research: Home Assistant MCP Integration for Clawdbot

**Date:** 2026-02-01
**Target:** Henry III (Clawdbot) -> Home Assistant (House & Boat)
**Preferred Method:** Model Context Protocol (MCP)

## 1. MCP Server Status
There is robust, near-official support for MCP in Home Assistant.

*   **Official Path:** The "Model Context Protocol" integration is currently a custom component but is **in the process of being merged into Home Assistant Core**.
    *   **Repository:** `allenporter/mcp-server-home-assistant` (Client-side proxy) and `allenporter/home-assistant-model-context-protocol` (HA Integration).
    *   **Architecture:**
        1.  **HA Side:** An integration running on Home Assistant exposes an MCP-compatible endpoint (using SSE/HTTP).
        2.  **Client Side (Clawdbot):** A local script (Python) runs as the MCP server, connecting to HA via WebSocket/HTTP and translating for the LLM host.
*   **Alternative (Node.js):** `tevonsb/homeassistant-mcp`. A standalone Node.js server that acts as a bridge.

**Recommendation:** Use the **Official/Allen Porter** implementation as it is becoming the standard standard and native part of Home Assistant.

## 2. Integration Capabilities (via MCP)
The MCP integration exposes a massive range of controls, effectively giving Henry the same power as the Home Assistant dashboard.

*   **Control:**
    *   Lights (brightness, color, temp)
    *   Climate (HVAC modes, temp, fans)
    *   Covers/Blinds
    *   Switches, Locks, Vacuums
    *   Media Players
*   **Monitor:**
    *   Sensors (temp, humidity, motion, boat systems)
    *   Device states (on/off, open/closed)
*   **Management:**
    *   Manage Automations (create, list, trigger)
    *   Manage Add-ons and HACS packages

## 3. Alternative Methods (Non-MCP)
If MCP fails or is too heavy, these are the backups:
*   **WebSocket API:** The native protocol used by the HA frontend.
    *   *Pros:* Real-time, full control, event subscriptions.
    *   *Cons:* Complex to implement raw.
    *   *Lib:* `home-assistant-js-websocket` (Official npm package).
*   **REST API:** Simple HTTP GET/POST requests.
    *   *Pros:* Easy to test, stateless.
    *   *Cons:* Polling required for updates (no real-time push without webhooks).
*   **MQTT:** Pub/Sub messaging.
    *   *Pros:* Decoupled, great for IoT devices.
    *   *Cons:* Requires an MQTT broker, less "direct" control of HA itself.

## 4. Authentication
*   **Long-Lived Access Tokens (LLAT):** The standard for bots/scripts.
    *   Generated in HA Profile > Security.
    *   Does not expire (until revoked).
    *   **Recommended for Clawdbot.**
*   **OAuth:** Supported by the MCP integration but requires an interactive flow (redirects). Less suitable for a headless/background agent unless configured once and stored.

## 5. Network Considerations
*   **Local Network:** If Clawdbot is on the same network (or VPN) as HA:
    *   Use `http://homeassistant.local:8123` or IP.
    *   Fastest, most secure.
*   **Remote Access:** If Clawdbot is remote:
    *   **Nabu Casa (Home Assistant Cloud):** Easiest and safest. Provides `https://<id>.ui.nabu.casa` URL.
    *   **Port Forwarding:** Expose port 8123 (Risky, requires SSL/TLS setup).
    *   **Tailscale/VPN:** Excellent option to make remote devices appear local.

**Boat Context:** The boat likely has a separate HA instance. Henry will need to be able to route to it (e.g., via the boat's Starlink/Cellular VPN or Nabu Casa URL).

## 6. Security Considerations
*   **Token Power:** An LLAT essentially gives "Admin" access. Treat it like a password.
*   **Granular Access:** HA is improving permissions, but often tokens have broad scope.
*   **Exposure:** Never expose the raw HA port to the open internet without SSL and strong passwords. Nabu Casa is the preferred remote path.

## 7. Draft Integration Plan

### Phase 1: Home Assistant Setup (Paul)
1.  **Install Integration:**
    *   Open HACS (Home Assistant Community Store) -> Integrations.
    *   Search for "Model Context Protocol".
    *   Install and restart HA.
    *   Go to Settings > Devices & Services > Add Integration > "Model Context Protocol".
2.  **Generate Token:**
    *   Click Profile (User Icon) > Security > Create Long-Lived Access Token.
    *   Name: `Clawdbot_MCP`.
    *   **Save this token.**

### Phase 2: Clawdbot Configuration (Henry)
1.  **Install Python Dependencies:**
    *   Ensure `uv` or `python3` is available.
2.  **Configure MCP Client:**
    *   Add the HA MCP server configuration to Clawdbot's MCP registry.
    *   **Command:** `uv run mcp-server-home-assistant` (or `python -m ...`)
    *   **Environment Variables:**
        *   `HOME_ASSISTANT_WEB_SOCKET_URL`: `ws://<ha-ip>:8123/api/websocket`
        *   `HOME_ASSISTANT_API_TOKEN`: `<the_token>`

## Requirements to Proceed
To implement this, I need the following from Paul:

1.  **Home Assistant URL(s):**
    *   House URL (e.g., `http://192.168.1.50:8123` or Nabu Casa HTTPS URL)
    *   Boat URL (if separate)
2.  **Access Token(s):**
    *   A Long-Lived Access Token for *each* instance.
3.  **Confirmation of Network Visibility:**
    *   Can Clawdbot "see" these IPs/URLs from its current network?

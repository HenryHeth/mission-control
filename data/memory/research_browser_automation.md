# Research: Successful Browser Automation

**Why "Others" Succeed where we failed:**
Most successful Clawdbot users leverage the **Browser Relay Extension**.

## The Mechanism
1.  **The Human's Role:** The user installs the Clawdbot Chrome Extension on their *daily driver* browser (not the server).
2.  **The Connection:** The extension connects to the Clawdbot Gateway (websocket).
3.  **The Bot's Role:** When the bot runs `browser action="start" profile="chrome"`, it doesn't open a new window on the server. Instead, it **hijacks a tab** in the user's browser.

## Benefits
-   **Zero Login Friction:** The bot inherits the user's active session (YouTube, Gmail, Calendar).
-   **No Headless Issues:** CAPTCHAs and "Passkey" prompts are avoided because the user is already trusted by the site.

## Our Missing Step
We were trying `profile="clawd"` (launching a fresh browser on the VM).
We need to set up the **Extension Relay** on Paul's Mac to connect to the VM (`192.168.64.2`).

## Action Plan
1.  Locate the Clawdbot Chrome Extension (likely provided in the repo or store).
2.  Configure it to point to `ws://192.168.64.2:18792` (Relay Port).
3.  Paul clicks "Connect".
4.  Henry runs `browser start profile='chrome'`.

# Research: Voice AI Platforms for Henry III

**Date:** June 14, 2025
**Objective:** Evaluate voice AI platforms to replace custom Twilio + OpenAI Realtime setup, specifically focusing on **custom function calling** (Toodledo, Calendar, Gmail) and capabilities equivalent to text-based Telegram chat.

## Executive Summary

For the specific requirement of **custom function calling** and preserving the "brain" of Henry III (User/Memory context), **Vapi.ai** and **Retell.ai** are the strongest contenders. They act as "orchestration/transport" layers that allow you to bring your own LLM (OpenAI Realtime) and simply handle the messy telephony/audio streaming parts.

**Bland.ai** and **ElevenLabs** are more "all-in-one" black boxes. While they support custom tools, they are harder to decouple from their internal logic/models, making it harder to share the exact same context/personality as your text-based bot.

## Comparison Matrix

| Feature | **Vapi.ai** | **Retell.ai** | **Bland.ai** | **ElevenLabs** |
| :--- | :--- | :--- | :--- | :--- |
| **Role** | Orchestrator (Middleware) | Orchestrator (Middleware) | Full Stack Platform | Full Stack / Voice First |
| **Custom Tools** | ✅ Excellent (Server Webhooks) | ✅ Excellent (Custom Functions) | ⚠️ Pathways/Webhooks (Complex) | ✅ Client/Server Tools |
| **BYO LLM** | ✅ Yes (Custom LLM URL) | ✅ Yes (Custom LLM URL) | ⚠️ Possible but native preferred | ✅ Yes (Custom LLM URL) |
| **System Prompts** | ✅ Fully Custom | ✅ Fully Custom | ✅ Fully Custom | ✅ Fully Custom |
| **Latency** | <600-800ms (claimed) | ~800ms (claimed) | Low (claimed) | Low (native models) |
| **Pricing** | $0.05/min (Platform only) | ~$0.07/min (Base) | ~$0.09/min (All-in) | ~$0.10/min (All-in) |
| **Telephony** | ✅ Import Twilio | ✅ Import Twilio | ✅ Import Twilio | ✅ Import Twilio |
| **Transcripts** | ✅ API Access | ✅ API Access | ✅ API Access | ✅ API Access |
| **VAD/Interrupts** | ✅ Tunable | ✅ Tunable | ✅ Native | ✅ Native |

---

## Detailed Evaluation

### 1. Vapi.ai (Strong Contender)
Vapi is a "Voice AI Platform for Developers." It abstracts away the VAD (Voice Activity Detection), interruption handling, and latency optimization, but lets you control the logic.

*   **Custom Tools**: Excellent support. You define tools in the Assistant config (JSON schema). When the LLM calls a tool, Vapi hits your server with a POST request, you run the logic (Toodledo, etc.), and return the result.
*   **System Prompts**: You can inject your full `USER.md` / `MEMORY.md` context into the `systemMessage` field of the Assistant API.
*   **Transport Layer**: **YES.** You can configure Vapi to use your own OpenAI Realtime API key or even a custom URL that streams audio/text. This allows you to keep your current "brain" logic 100%.
*   **Telephony**: Supports importing your existing Twilio number (BYOC).
*   **Pricing**: $0.05/min platform fee + you pay for your own STT/TTS/LLM usage (e.g. OpenAI/Deepgram keys). This is often cheaper if you have high volume or good rates with providers.

### 2. Retell.ai (Strong Contender)
Very similar to Vapi, positioning itself as the "infrastructure layer" for voice.

*   **Custom Tools**: Supports "Custom Functions." Similar flow: LLM triggers function -> Retell sends webhook to your backend -> You return output -> LLM speaks.
*   **System Prompts**: Fully customizable via API.
*   **Transport Layer**: **YES.** Supports "Custom LLM" via WebSocket. You can stream raw audio/text between Retell and your backend, giving you ultimate control if you want to run the OpenAI Realtime session yourself and just use Retell for telephony/VAD.
*   **Telephony**: Supports importing Twilio numbers.
*   **Pricing**: ~$0.07/min. They claim "no platform fees" in some marketing but usage rates are slightly higher than Vapi's base. Check volume discounts.

### 3. Bland.ai
Bland positions itself as a complete "Phone Calling Platform" rather than just middleware. They want you to build "Pathways" (conversation graphs) in their system.

*   **Custom Tools**: Supported via Webhooks and API integration, but often tied to their "Conversational Pathways" graph editor. Less "code-first" flexible than Vapi/Retell for a pure LLM proxy.
*   **Transport Layer**: ⚠️ They strongly prefer you use their hosted brain. While they have "Custom LLM" options for enterprise, it's less of a "plug-and-play" middleware feel than Vapi.
*   **Pricing**: ~$0.09/min. This is an "all-inclusive" price usually, which simplifies billing but might be more expensive if you already pay for OpenAI separately.

### 4. ElevenLabs Conversational AI
The leader in voice generation has entered the agent space.

*   **Custom Tools**: "Client Tools" (client-side) and "Server Tools" (webhooks). The setup is very UI-driven in their dashboard.
*   **Voice Quality**: **Best in class.** This is their home turf.
*   **Transport Layer**: They allow Custom LLMs, but the primary value prop here is using *their* end-to-end stack for latency optimization. If you use your own OpenAI Realtime brain, you lose some of their vertical integration advantages.
*   **Pricing**: ~$0.10/min. Premium pricing for premium voice quality.

### 5. CallAgentAI (and others)
*   **CallAgentAI**: Information is scarce/generic. Likely a wrapper or smaller player. Not recommended for critical infrastructure.
*   **Synthflow**: A "no-code" wrapper often used by agencies. Less suitable for a developer-heavy setup like yours where you want raw context injection.

## Privacy & Data
*   **Vapi/Retell**: If you use "Custom LLM" mode, they still process the audio (STT/TTS) and act as a relay. They generally store logs/recordings for debugging unless you opt-out (Enterprise usually).
*   **Bland/ElevenLabs**: Store everything as they own the full stack.

## Recommendation: Build vs Buy

Since you already have a sophisticated **OpenAI Realtime + Twilio** setup, the pain points you are likely trying to solve are **latency, interruption handling (VAD), and tunnel maintenance**.

**Recommendation: Use Vapi.ai or Retell.ai as the "Transport Layer".**

1.  **Keep OpenAI Realtime**: It knows your tools, your memory, and your personality best.
2.  **Offload Telephony**: Point Twilio to Vapi/Retell.
3.  **Offload VAD/Interruption**: Let Vapi/Retell handle the "user started speaking, stop audio" logic.
4.  **Connect**:
    *   **Vapi/Retell -> Your Server**: Webhooks for Tool Calling (Toodledo/Calendar).
    *   **OR**: Configure Vapi/Retell to just act as a "Voice Gateway" that streams text/audio to your existing OpenAI Realtime session (if supported by their Custom LLM WebSocket modes).

**Winner**: **Vapi.ai** seems slightly more developer-centric and transparent about the "Custom LLM" handoff, making it the easiest drop-in replacement for your custom tunnel.

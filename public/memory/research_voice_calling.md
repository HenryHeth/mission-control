# Low-Latency Voice Calling Research for Clawdbot/OpenClaw

**Research Date:** February 1, 2026  
**Current Setup:** Twilio account active, ngrok tunnel running, voice-call plugin loaded, OpenAI API key available, ElevenLabs API key available.

## Executive Summary

The current STT→LLM→TTS pipeline in Clawdbot is indeed too slow for natural conversation. Multiple viable alternatives exist, with varying levels of maturity and complexity. The most promising paths are:

1. **OpenAI Realtime API + Twilio Media Streams** (Production ready, well-documented)
2. **enzo2's voice-call-ws extension** (Community experimental, partial implementation)
3. **Grok Voice Agent API** (Production ready, OpenAI-compatible)

## Detailed Research

### 1. voice-call-ws Community Extension

**Source:** GitHub Discussion #1655 on github.com/openclaw/openclaw  
**Developer:** enzo2 (github.com/enzo2/clawdbot)  

**Description:**
- Community-developed rewrite of voice-call for realtime APIs
- Supports Gemini Live, Grok Voice Agent, and OpenAI Realtime
- Renamed to "voice-call-ws" to avoid conflicts with existing voice-call plugin
- Uses WebSocket connections directly to realtime APIs, bypassing STT/TTS pipeline

**Current Status:**
- "Sort-of-barely-working" implementation according to author
- Vibe-coded using mix of GPT-5.2-codex and Gemini-3-pro
- Available at: main...enzo2:clawdbot:main fork

**Providers & Performance:**
- **Gemini:** Has audio issues, each turn becomes choppy/slow (resampling/buffering issue suspected)
- **Grok:** "Works" but uses excessive API credits (~$3/hour for stuck-open connection)
- **OpenAI Realtime:** Not explicitly tested in this fork

**Setup Requirements:**
- Download voice-call-ws folder to ~/.clawdbot/extensions/
- Disable voice-call in config, add config for voice-call-ws
- Includes end_call tool for agent control

**Pros:**
- Direct integration with Clawdbot
- Supports multiple realtime APIs
- Community contribution, familiar codebase

**Cons:**
- Experimental/unfinished implementation
- Known audio quality issues
- Potential high API costs (Grok)
- Limited documentation
- Single developer project

**Maturity Level:** ⭐⭐☆☆☆ (Early experimental)
**Estimated Effort:** 2-3 weeks to debug and stabilize

---

### 2. OpenAI Realtime API Integration

**Sources:** 
- Official Twilio tutorials and documentation
- Multiple working GitHub repositories
- Well-established integration pattern

**Description:**
OpenAI's Realtime API provides direct Speech-to-Speech capabilities without STT/TTS conversion steps. Multiple official Twilio tutorials show complete implementation.

**Architecture:**
```
Phone Call → Twilio Media Streams → WebSocket Proxy → OpenAI Realtime API
                                 ↓
                    Bidirectional audio streaming
                    G.711 u-law format (Twilio native)
```

**Key Implementation Details:**
- Uses Twilio Media Streams for audio transport
- WebSocket connection to `wss://api.openai.com/v1/realtime`
- Audio format: G.711 u-law (native Twilio format)
- Server-side Voice Activity Detection (VAD)
- Real-time audio delta streaming

**Available Resources:**
- Official Twilio tutorials (Node.js, Python)
- Multiple working GitHub repositories
- Comprehensive documentation

**Integration Points with Clawdbot:**
- Could replace voice-call plugin's STT/TTS pipeline
- Maintain existing Twilio infrastructure
- Preserve call management and routing features
- Add realtime streaming capabilities

**Pros:**
- Production-ready solution
- Official support from both Twilio and OpenAI
- Low latency (~320ms response time)
- Extensive documentation
- Multiple working examples
- Compatible with existing Twilio setup

**Cons:**
- Requires custom integration into Clawdbot
- OpenAI Realtime API pricing ($0.06/minute input, $0.24/minute output)
- Less flexibility than multi-provider approach

**Maturity Level:** ⭐⭐⭐⭐⭐ (Production ready)
**Estimated Effort:** 1-2 weeks for clean integration

---

### 3. Clawdbot's Built-in voice-call Plugin

**Source:** /opt/homebrew/lib/node_modules/clawdbot/extensions/voice-call/

**Current Capabilities:**
- Supports Twilio, Telnyx, Plivo providers
- Traditional STT/TTS pipeline architecture
- Media streaming support with `streaming.enabled: true`
- Integration with OpenAI and ElevenLabs TTS
- Configurable streaming paths and models

**Streaming Configuration:**
```json
{
  "streaming": {
    "enabled": true,
    "streamPath": "/voice/stream",
    "openaiApiKey": "...",
    "sttModel": "whisper-1"
  }
}
```

**Current Limitations:**
- Still uses STT→LLM→TTS pipeline even with streaming enabled
- No direct realtime API integration
- Streaming appears to be for audio transport, not end-to-end realtime

**Potential for Enhancement:**
- Plugin architecture supports extensions
- Already has Twilio Media Streams integration
- Has provider abstraction layer
- TTS provider override system

**Pros:**
- Already installed and configured
- Proven integration with Clawdbot
- Extensible architecture
- Multi-provider support

**Cons:**
- No current realtime API support
- Would require significant modification
- Maintains legacy STT/TTS approach

**Maturity Level:** ⭐⭐⭐⭐☆ (Production, but not realtime)
**Estimated Effort:** 2-3 weeks to add realtime capabilities

---

### 4. Twilio + OpenAI Realtime Direct Integration

**Description:**
Direct implementation of Twilio Media Streams → OpenAI Realtime API without Clawdbot mediation.

**Available Resources:**
- Twilio official tutorials (Node.js, Python)
- GitHub repositories with working code
- Minimalist integration examples

**Key Features:**
- Sub-second latency
- Native audio format support
- Bidirectional streaming
- Function calling support
- Production-grade reliability

**Sample Implementation Pattern:**
```javascript
// Twilio WebSocket ↔ OpenAI Realtime Bridge
const twilioWs = // Media Stream WebSocket
const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime')

// Proxy audio bidirectionally
twilioWs.on('media', data => {
  openAiWs.send(JSON.stringify({
    type: 'input_audio_buffer.append',
    audio: data.media.payload
  }))
})

openAiWs.on('response.output_audio.delta', response => {
  twilioWs.send(JSON.stringify({
    event: 'media',
    media: { payload: response.delta }
  }))
})
```

**Integration Strategy:**
- Deploy as standalone service
- Connect to existing Twilio number
- Integrate with Clawdbot via webhooks/API calls
- Maintain session context through external storage

**Pros:**
- Fastest time to implementation
- Proven solution pattern
- Independent of Clawdbot internals
- Can be deployed separately

**Cons:**
- Separate system to maintain
- Reduced integration with Clawdbot features
- Additional infrastructure complexity

**Maturity Level:** ⭐⭐⭐⭐⭐ (Production ready)
**Estimated Effort:** 1 week for standalone deployment

---

### 5. Other Community Solutions

**Discord (discord.gg/clawd):**
- Limited search results found
- Community appears active but specific voice solutions not publicly documented
- Would require direct Discord exploration

**Reddit Discussions:**
- General Clawdbot discussions but no specific low-latency voice solutions
- Some mentions of TTS integration but focused on text responses

**GitHub Community:**
- enzo2's fork is the primary community effort
- No other significant community realtime voice projects found

**Maturity Level:** ⭐⭐☆☆☆ (Limited community efforts)

---

### 6. Competing Approaches

#### A. Grok Voice Agent API (xAI)

**Description:**
xAI's realtime voice API, compatible with OpenAI Realtime API specification.

**Key Features:**
- OpenAI Realtime API compatible
- Built on Grok 3 model
- $0.05/minute pricing
- LiveKit plugin available
- Real-time reasoning and live data access

**Integration Options:**
- Drop-in replacement for OpenAI Realtime API
- Already tested in enzo2's voice-call-ws
- Could use same Twilio integration pattern

**Pros:**
- Lower cost than OpenAI ($0.05/min vs $0.30/min)
- OpenAI API compatible
- Advanced reasoning capabilities
- Production ready

**Cons:**
- Newer API, less established
- Known issues with connection management (high costs if stuck open)
- Less documentation than OpenAI

**Maturity Level:** ⭐⭐⭐⭐☆ (Production, newer)

#### B. ElevenLabs Conversational AI

**Description:**
ElevenLabs' platform for building conversational AI agents with real-time voice.

**Key Features:**
- Native conversational AI platform
- Real-time voice interactions
- Integration with Salesforce, Zendesk, Stripe
- Visual workflow builder
- Database integration for knowledge bases

**Architecture:**
- Full-stack conversational AI platform
- Not just TTS/STT but complete conversation management
- Built-in integrations and workflows

**Integration Challenges:**
- Platform approach, not API-first
- Would require significant architectural changes
- Less compatible with Clawdbot's architecture

**Pros:**
- Purpose-built for conversational AI
- High-quality voice processing
- Built-in integrations
- Visual workflow tools

**Cons:**
- Platform lock-in
- Expensive compared to API-only solutions
- Complex migration from current setup
- Less flexibility

**Maturity Level:** ⭐⭐⭐⭐☆ (Production platform)
**Estimated Effort:** 4-6 weeks for platform migration

#### C. Gemini Live API

**Description:**
Google's realtime conversation API with multimodal capabilities.

**Current Status:**
- Mentioned in enzo2's implementation with audio quality issues
- Less mature than OpenAI Realtime
- Limited documentation for direct integration

**Pros:**
- Google ecosystem integration
- Multimodal capabilities
- Potentially lower cost

**Cons:**
- Audio quality issues reported
- Limited documentation
- Less established integration patterns

**Maturity Level:** ⭐⭐⭐☆☆ (Emerging)

## Recommendations

### Best Path Forward: OpenAI Realtime API + Twilio Integration

**Recommended Approach:**
1. **Phase 1 (Week 1):** Implement standalone Twilio + OpenAI Realtime service
2. **Phase 2 (Week 2-3):** Integrate with Clawdbot via webhooks and session management
3. **Phase 3 (Week 4):** Replace voice-call plugin's core with realtime implementation

**Why This Approach:**
- ✅ **Proven Technology:** Multiple working examples and official support
- ✅ **Fast Implementation:** Can be deployed independently of Clawdbot changes
- ✅ **Low Risk:** Well-documented with fallback options
- ✅ **Performance:** Sub-second latency, natural conversation flow
- ✅ **Cost Effective:** Reasonable pricing for professional use
- ✅ **Maintainable:** Standard WebSocket implementation, no experimental code

### Alternative Recommendations

**If budget is primary concern:** Grok Voice Agent API
- Same technical approach as OpenAI
- 83% cost reduction ($0.05/min vs $0.30/min)
- Slightly higher technical risk due to newer API

**If timeline is critical (< 1 week):** Deploy Twilio tutorials directly
- Use official Twilio examples as-is
- Add Clawdbot integration later
- Fastest path to working solution

**For experimentation:** Fork enzo2's voice-call-ws
- Most integrated with Clawdbot
- Highest technical risk
- Good for learning and contributing back to community

### Implementation Roadmap

**Week 1: Foundation**
- Deploy Twilio + OpenAI Realtime service using official tutorials
- Test with existing Twilio number
- Validate audio quality and latency

**Week 2-3: Integration**
- Create webhook endpoints for Clawdbot session management
- Implement context passing between systems
- Add call logging and session persistence

**Week 4: Enhancement**
- Replace voice-call plugin core with realtime implementation
- Maintain existing configuration and provider abstraction
- Add support for switching between traditional and realtime modes

**Week 5: Testing & Optimization**
- Performance testing and optimization
- Error handling and fallback scenarios
- Documentation and deployment guides

### Success Metrics

**Technical:**
- Response latency < 500ms (target: < 300ms)
- Natural conversation flow without awkward pauses
- Reliable audio quality and connection stability

**User Experience:**
- Conversations feel natural and human-like
- Reduced interruptions and improved turn-taking
- Maintained integration with existing Clawdbot features

**Operational:**
- Cost per minute < $0.50 (achievable with either OpenAI or Grok)
- System reliability > 99.5% uptime
- Easy deployment and maintenance

This approach provides the best balance of speed, reliability, and integration with your existing infrastructure while opening the door to truly natural voice conversations with your AI assistant.
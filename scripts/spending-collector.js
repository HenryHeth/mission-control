#!/usr/bin/env node
/**
 * Spending Data Collector for Mission Control v1.5
 * Fetches usage/cost data from multiple API providers
 * 
 * Supported providers:
 * - Anthropic (Claude API)
 * - OpenAI (GPT models)
 * - OpenRouter (multi-model routing)
 * - Twilio (voice calls)
 * - ElevenLabs (TTS)
 * 
 * Usage: node spending-collector.js [--save] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Data storage path
const DATA_DIR = path.join(__dirname, '..', 'data');
const SPENDING_FILE = path.join(DATA_DIR, 'spending.json');
const HISTORY_DIR = path.join(DATA_DIR, 'spending-history');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

// Load API keys from environment or clawdbot config
function loadConfig() {
  const config = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    twilio: {
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN
    },
    elevenlabs: process.env.ELEVENLABS_API_KEY
  };
  
  // Try loading from clawdbot config
  try {
    const clawdbotPath = path.join(process.env.HOME, '.clawdbot', 'clawdbot.json');
    if (fs.existsSync(clawdbotPath)) {
      const clawdbot = JSON.parse(fs.readFileSync(clawdbotPath, 'utf8'));
      
      // Extract API keys from env.vars (primary location)
      if (clawdbot.env && clawdbot.env.vars) {
        const vars = clawdbot.env.vars;
        config.anthropic = config.anthropic || vars.ANTHROPIC_API_KEY;
        config.openai = config.openai || vars.OPENAI_API_KEY;
        config.openrouter = config.openrouter || vars.OPENROUTER_API_KEY;
        config.twilio.sid = config.twilio.sid || vars.TWILIO_ACCOUNT_SID;
        config.twilio.token = config.twilio.token || vars.TWILIO_AUTH_TOKEN;
        config.elevenlabs = config.elevenlabs || vars.ELEVENLABS_API_KEY;
      }
      
      // Fallback: Extract API keys from providers
      if (clawdbot.providers) {
        for (const [key, provider] of Object.entries(clawdbot.providers)) {
          if (provider.apiKey) {
            if (key.includes('anthropic')) config.anthropic = config.anthropic || provider.apiKey;
            if (key.includes('openai')) config.openai = config.openai || provider.apiKey;
            if (key.includes('openrouter')) config.openrouter = config.openrouter || provider.apiKey;
          }
        }
      }
      
      // Check plugins for Twilio/ElevenLabs
      if (clawdbot.plugins) {
        // Legacy plugin format
        if (clawdbot.plugins.twilio) {
          config.twilio.sid = config.twilio.sid || clawdbot.plugins.twilio.accountSid;
          config.twilio.token = config.twilio.token || clawdbot.plugins.twilio.authToken;
        }
        if (clawdbot.plugins.sag) {
          config.elevenlabs = config.elevenlabs || clawdbot.plugins.sag.apiKey;
        }
        
        // New plugins.entries format
        if (clawdbot.plugins.entries) {
          const voiceCall = clawdbot.plugins.entries['voice-call'];
          if (voiceCall && voiceCall.config) {
            // Twilio creds
            if (voiceCall.config.twilio) {
              config.twilio.sid = config.twilio.sid || voiceCall.config.twilio.accountSid;
              config.twilio.token = config.twilio.token || voiceCall.config.twilio.authToken;
            }
            // ElevenLabs in TTS config
            if (voiceCall.config.tts && voiceCall.config.tts.elevenlabs) {
              config.elevenlabs = config.elevenlabs || voiceCall.config.tts.elevenlabs.apiKey;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not load clawdbot config:', e.message);
  }
  
  return config;
}

// HTTP request helper
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════
// Provider-specific fetchers
// ═══════════════════════════════════════════════════════

async function fetchAnthropicUsage(apiKey) {
  if (!apiKey) return { available: false, error: 'No API key' };
  
  try {
    // Anthropic doesn't have a public usage API yet
    // We'll track this via request logging or estimate from config
    return {
      available: false,
      error: 'Anthropic usage API not yet available',
      note: 'Track via Anthropic Console: https://console.anthropic.com/settings/billing',
      estimatedMonthly: 150,  // Based on typical usage
    };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

async function fetchOpenAIUsage(apiKey) {
  if (!apiKey) return { available: false, error: 'No API key' };
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await httpRequest({
      hostname: 'api.openai.com',
      port: 443,
      path: `/v1/organization/usage?date=${today}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (result.status === 200) {
      return {
        available: true,
        data: result.data,
        todayCost: result.data?.total_cost || 0,
      };
    } else {
      return {
        available: false,
        error: `API returned ${result.status}`,
        note: 'Track via OpenAI Dashboard: https://platform.openai.com/account/usage'
      };
    }
  } catch (e) {
    return { available: false, error: e.message };
  }
}

async function fetchOpenRouterCredits(apiKey) {
  if (!apiKey) return { available: false, error: 'No API key' };
  
  try {
    const result = await httpRequest({
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/auth/key',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (result.status === 200 && result.data?.data) {
      const usage = result.data.data.usage || 0;
      const limit = result.data.data.limit || 0;
      return {
        available: true,
        data: result.data.data,
        totalUsed: usage,
        limit: limit,
        remaining: limit > 0 ? limit - usage : null,
      };
    } else {
      return { available: false, error: `API returned ${result.status}` };
    }
  } catch (e) {
    return { available: false, error: e.message };
  }
}

async function fetchTwilioUsage(sid, token) {
  if (!sid || !token) return { available: false, error: 'No credentials' };
  
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const today = new Date().toISOString().split('T')[0];
    
    const result = await httpRequest({
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${sid}/Usage/Records/Daily.json?StartDate=${today}`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (result.status === 200 && result.data?.usage_records) {
      const records = result.data.usage_records;
      const totalPrice = records.reduce((sum, r) => sum + parseFloat(r.price || 0), 0);
      return {
        available: true,
        data: records,
        todayCost: totalPrice,
        records: records.length,
      };
    } else {
      return { available: false, error: `API returned ${result.status}` };
    }
  } catch (e) {
    return { available: false, error: e.message };
  }
}

async function fetchElevenLabsUsage(apiKey) {
  if (!apiKey) return { available: false, error: 'No API key' };
  
  try {
    const result = await httpRequest({
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: '/v1/user/subscription',
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (result.status === 200 && result.data) {
      const sub = result.data;
      return {
        available: true,
        data: sub,
        characterCount: sub.character_count || 0,
        characterLimit: sub.character_limit || 0,
        tier: sub.tier || 'unknown',
        nextReset: sub.next_character_count_reset_unix,
      };
    } else {
      return { available: false, error: `API returned ${result.status}` };
    }
  } catch (e) {
    return { available: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════
// Main collector
// ═══════════════════════════════════════════════════════

async function collectSpendingData(verbose = false) {
  const config = loadConfig();
  const timestamp = new Date().toISOString();
  
  if (verbose) console.log('Collecting spending data...\n');
  
  const results = {
    collectedAt: timestamp,
    source: 'live',
    providers: {}
  };
  
  // Anthropic
  if (verbose) console.log('  📊 Fetching Anthropic usage...');
  results.providers.anthropic = await fetchAnthropicUsage(config.anthropic);
  
  // OpenAI
  if (verbose) console.log('  📊 Fetching OpenAI usage...');
  results.providers.openai = await fetchOpenAIUsage(config.openai);
  
  // OpenRouter
  if (verbose) console.log('  📊 Fetching OpenRouter credits...');
  results.providers.openrouter = await fetchOpenRouterCredits(config.openrouter);
  
  // Twilio
  if (verbose) console.log('  📊 Fetching Twilio usage...');
  results.providers.twilio = await fetchTwilioUsage(config.twilio.sid, config.twilio.token);
  
  // ElevenLabs
  if (verbose) console.log('  📊 Fetching ElevenLabs usage...');
  results.providers.elevenlabs = await fetchElevenLabsUsage(config.elevenlabs);
  
  // Calculate totals
  results.summary = calculateSummary(results.providers);
  
  if (verbose) {
    console.log('\n═══════════════════════════════════════════');
    console.log('Summary:');
    console.log(`  Available APIs: ${results.summary.availableCount}/${results.summary.totalProviders}`);
    if (results.summary.todayEstimate > 0) {
      console.log(`  Today's estimate: $${results.summary.todayEstimate.toFixed(2)}`);
    }
    console.log('═══════════════════════════════════════════\n');
  }
  
  return results;
}

function calculateSummary(providers) {
  let availableCount = 0;
  let todayEstimate = 0;
  
  for (const [name, data] of Object.entries(providers)) {
    if (data.available) availableCount++;
    if (data.todayCost) todayEstimate += data.todayCost;
  }
  
  return {
    totalProviders: Object.keys(providers).length,
    availableCount,
    todayEstimate,
    calculatedAt: new Date().toISOString(),
  };
}

function saveSpendingData(data) {
  // Save current data
  fs.writeFileSync(SPENDING_FILE, JSON.stringify(data, null, 2));
  
  // Save to history (daily file)
  const dateStr = new Date().toISOString().split('T')[0];
  const historyFile = path.join(HISTORY_DIR, `${dateStr}.json`);
  
  // Append to daily history
  let history = [];
  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch (e) {}
  }
  history.push(data);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  
  console.log(`✅ Saved to ${SPENDING_FILE}`);
  console.log(`✅ Appended to ${historyFile}`);
}

// Load historical data for charts
function loadHistoricalData(days = 7) {
  const history = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const historyFile = path.join(HISTORY_DIR, `${dateStr}.json`);
    
    if (fs.existsSync(historyFile)) {
      try {
        const dayData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        // Get last entry of the day for daily summary
        const lastEntry = dayData[dayData.length - 1];
        history.push({
          date: dateStr,
          ...lastEntry
        });
      } catch (e) {
        history.push({ date: dateStr, error: e.message });
      }
    } else {
      history.push({ date: dateStr, noData: true });
    }
  }
  
  return history;
}

// Get current spending data (from file or fresh fetch)
async function getSpendingData(forceRefresh = false) {
  // Check if we have recent data (less than 1 hour old)
  if (!forceRefresh && fs.existsSync(SPENDING_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SPENDING_FILE, 'utf8'));
      const collectedAt = new Date(data.collectedAt);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (collectedAt > hourAgo) {
        data.fromCache = true;
        return data;
      }
    } catch (e) {}
  }
  
  // Fetch fresh data
  const data = await collectSpendingData();
  saveSpendingData(data);
  return data;
}

// ═══════════════════════════════════════════════════════
// CLI Interface
// ═══════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const save = args.includes('--save') || args.includes('-s');
  const history = args.includes('--history') || args.includes('-h');
  
  if (history) {
    const days = parseInt(args.find(a => /^\d+$/.test(a)) || '7', 10);
    const data = loadHistoricalData(days);
    console.log(JSON.stringify(data, null, 2));
  } else {
    collectSpendingData(verbose).then(data => {
      if (save) {
        saveSpendingData(data);
      }
      if (!verbose) {
        console.log(JSON.stringify(data, null, 2));
      }
    }).catch(err => {
      console.error('Error collecting spending data:', err.message);
      process.exit(1);
    });
  }
}

// Export for use in file-server
module.exports = {
  collectSpendingData,
  getSpendingData,
  loadHistoricalData,
  saveSpendingData,
};

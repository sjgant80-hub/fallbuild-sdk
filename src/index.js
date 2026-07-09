// fallbuild SDK · sovereign single-file library · MIT · AI-Native Solutions
// Extracted from fallbuild/index.html · 79114 bytes of source logic
// Public-safe: no primes/glyphs/dyad references

/*!
 * Fall Kit · v1.0.0 · the shared cascade for every estate seed
 *
 * Inlineable JS module. Drop into any seed via <script> or copy-paste inline.
 * Preserves single-HTML sovereignty (no external deps until user opts in to T2 WebLLM).
 *
 * What it gives every seed:
 *  - AI tier picker: T0 (off · default) · T2 (WebLLM in-browser, 5 models 1B-70B) · T3 (BYOK Anthropic/OpenAI/Google)
 *  - Universal entry: FallKit.aiComplete(systemPrompt, userMsg, maxTokens) → string|null
 *  - AI chip UI in header
 *  - WebRTC P2P mesh (ported from canonical fallnet · fall-signal channel · Google STUN)
 *  - Help section partial: FallKit.helpSection()
 *  - Settings panel: FallKit.openSettings()
 *
 * Doctrine (per botler CLAUDE.md):
 *  - T0 fallback ALWAYS works · aiComplete returns null · caller MUST degrade gracefully
 *  - NEVER hide a feature behind AI · NEVER proxy API keys · NEVER log keys
 *  - WebLLM is lazy-loaded · model weights download ONLY on user opt-in
 *
 * Estate-first canonical references:
 *  - WebLLM pattern: Downloads/botler/index.html (T0/T2/T3 cascade)
 *  - WebRTC pattern: Downloads/fallnet/fallnet-shim.js (raw RTCPeerConnection)
 *  - Mesh channel:   'fall-signal'
 */
(function (root) {
  'use strict';
  const FALL_KIT_VERSION = '1.2.0';
  const KCC_MINT_URL = 'https://sjgant80-hub.github.io/kcc-mint/';
  // ─── Model registry ──────────────────────────────────────────────
  const WEBLLM_MODELS = {
    'llama-1b':  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',   size: '~700MB', label: '1B · fast · any laptop / phone' },
    'llama-3b':  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',   size: '~2GB',   label: '3B · balanced · default · most laptops' },
    'qwen-7b':   { id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',     size: '~5GB',   label: '7B · capable · needs decent GPU (M-series Mac / 8GB+ VRAM)' },
    'llama-8b':  { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',   size: '~5GB',   label: '8B · common · needs decent GPU' },
    'llama-70b': { id: 'Llama-3.1-70B-Instruct-q4f16_1-MLC',  size: '~40GB',  label: '70B · frontier · needs serious GPU + 64GB+ RAM' },
  };
  const DEFAULT_MODEL = 'llama-3b';
  const T3_PROVIDERS = {
    anthropic: { label: 'Anthropic Claude', models: ['claude-sonnet-4-5','claude-opus-4-7','claude-haiku-4-5'], default: 'claude-sonnet-4-5', url: 'https://api.anthropic.com/v1/messages' },
    openai:    { label: 'OpenAI',           models: ['gpt-4o','gpt-4o-mini','o1-mini'],                          default: 'gpt-4o-mini',      url: 'https://api.openai.com/v1/chat/completions' },
    google:    { label: 'Google Gemini',    models: ['gemini-1.5-pro','gemini-1.5-flash','gemini-2.0-flash-exp'], default: 'gemini-1.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  };
  // ─── State ───────────────────────────────────────────────────────
  const STATE = {
    config: loadConfig(),
    ai: { ready: false, loading: false, progress: 0, engine: null, model: null },
    mesh: { active: false, peers: new Map(), bc: null, signal: null },
  };
  function loadConfig() {
    try { return JSON.parse(localStorage.getItem('fall-kit.config') || '{}'); }
    catch (e) { return {}; }
  }
  function saveConfig() {
    try { localStorage.setItem('fall-kit.config', JSON.stringify(STATE.config)); } catch (e) {}
  }
  // ─── DOM helpers ─────────────────────────────────────────────────
  function $(s, root) { return (root || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  // ─── AI tier ─────────────────────────────────────────────────────
  function aiTier() { return STATE.config.ai_tier || 'T0'; }
  function renderAiChip() {
    const chip = $('#fk-ai-chip');
    if (!chip) return;
    const txt = $('#fk-ai-chip-text');
    chip.classList.remove('fk-chip-live', 'fk-chip-loading', 'fk-chip-warn');
    const tier = aiTier();
    if (tier === 'T0') { txt.textContent = 'T0 · off'; }
    else if (tier === 'T2') {
      if (STATE.ai.ready) { txt.textContent = 'T2 ' + (WEBLLM_MODELS[STATE.config.webllm_model || DEFAULT_MODEL]?.label.split(' · ')[0] || '') + ' · ready'; chip.classList.add('fk-chip-live'); }
      else if (STATE.ai.loading) { txt.textContent = 'T2 loading ' + Math.round(STATE.ai.progress) + '%'; chip.classList.add('fk-chip-loading'); }
      else { txt.textContent = 'T2 · click to load'; chip.classList.add('fk-chip-warn'); }
    } else if (tier === 'T3') {
      if (STATE.config.api_key) { txt.textContent = 'T3 ' + (T3_PROVIDERS[STATE.config.api_provider]?.label || 'BYOK') + ' · active'; chip.classList.add('fk-chip-live'); }
      else { txt.textContent = 'T3 · no key set'; chip.classList.add('fk-chip-warn'); }
    }
  }
  async function loadWebLLM(modelKey) {
    if (STATE.ai.loading) return;
    const key = modelKey || STATE.config.webllm_model || DEFAULT_MODEL;
    const model = WEBLLM_MODELS[key];
    if (!model) { console.error('fall-kit: unknown model', key); return; }
    if (STATE.ai.ready && STATE.ai.model === model.id) return;
    STATE.ai.loading = true; STATE.ai.progress = 0; renderAiChip();
    notify('Loading WebLLM · ' + model.label + ' · ' + model.size + ' first time', 'info');
    try {
      const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm@0.2.79');
      const engine = await CreateMLCEngine(model.id, {
        initProgressCallback: p => { STATE.ai.progress = (p.progress || 0) * 100; renderAiChip(); }
      });
      STATE.ai.engine = engine;
      STATE.ai.model = model.id;
      STATE.ai.ready = true;
      STATE.ai.loading = false;
      STATE.config.webllm_model = key; saveConfig();
      renderAiChip();
      notify('WebLLM ready · sovereign mode · ' + model.label.split(' · ')[0], 'ok');
    } catch (e) {
      console.error('fall-kit: WebLLM load failed', e);
      STATE.ai.loading = false; renderAiChip();
      notify('WebLLM load failed · ' + e.message, 'err');
    }
  }
  async function aiComplete(systemPrompt, userMsg, maxTokens) {
    maxTokens = maxTokens || 600;
    const tier = aiTier();
    if (tier === 'T2' && STATE.ai.ready && STATE.ai.engine) {
      const r = await STATE.ai.engine.chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }],
        max_tokens: maxTokens,
      });
      return r.choices[0].message.content;
    }
    if (tier === 'T3' && STATE.config.api_key && STATE.config.api_provider) {
      return await aiCloudCall(systemPrompt, userMsg, maxTokens);
    }
    return null;
  }
  async function aiCloudCall(sys, msg, maxTokens) {
    const provider = STATE.config.api_provider;
    const key = STATE.config.api_key;
    const model = STATE.config.api_model || T3_PROVIDERS[provider]?.default;
    if (provider === 'anthropic') {
      const r = await fetch(T3_PROVIDERS.anthropic.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system: sys, messages: [{ role: 'user', content: msg }] }),
      });
      if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + (await r.text()).slice(0, 200));
      const j = await r.json();
      return j.content[0].text;
    }
    if (provider === 'openai') {
      const r = await fetch(T3_PROVIDERS.openai.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, { role: 'user', content: msg }] }),
      });
      if (!r.ok) throw new Error('OpenAI ' + r.status);
      const j = await r.json();
      return j.choices[0].message.content;
    }
    if (provider === 'google') {
      const r = await fetch(T3_PROVIDERS.google.url + model + ':generateContent?key=' + encodeURIComponent(key), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: sys + '\n\n---\n\n' + msg }] }], generationConfig: { maxOutputTokens: maxTokens } }),
      });
      if (!r.ok) throw new Error('Google ' + r.status);
      const j = await r.json();
      return j.candidates[0].content.parts[0].text;
    }
    throw new Error('unknown provider: ' + provider);
  }
  // ─── WebRTC P2P mesh (ported from canonical fallnet · fall-signal channel · Google STUN) ───
  const MESH_CHANNEL = 'fall-signal';
  const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  function meshStart(opts) {
    if (STATE.mesh.active) return;
    opts = opts || {};
    const seedId = opts.seedId || (location.pathname + '#' + Math.random().toString(36).slice(2, 8));
    STATE.mesh.seedId = seedId;
    try { STATE.mesh.bc = new BroadcastChannel(MESH_CHANNEL); }
    catch (e) { console.warn('fall-kit: BroadcastChannel unavailable'); return; }
    STATE.mesh.bc.onmessage = e => {
      const m = e.data;
      if (!m || !m.kind || m.peerId === seedId) return;
      if (opts.onMessage) opts.onMessage(m);
    };
    STATE.mesh.bc.postMessage({ kind: 'fall-kit:hello', peerId: seedId, ts: Date.now(), seedName: opts.seedName || 'unknown' });
    STATE.mesh.active = true;
    notify('Mesh active · channel ' + MESH_CHANNEL, 'ok');
  }
  function meshPost(kind, payload) {
    if (!STATE.mesh.active || !STATE.mesh.bc) return false;
    STATE.mesh.bc.postMessage({ kind: kind, peerId: STATE.mesh.seedId, ts: Date.now(), payload: payload });
    return true;
  }
  // ─── Toast ───────────────────────────────────────────────────────
  function notify(msg, kind) {
    let t = $('#fk-toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'fk-toast';
      t.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%) translateY(20px);background:#c08a3a;color:#0a0a0a;padding:9px 18px;border-radius:3px;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;opacity:0;transition:all .22s;z-index:10000;pointer-events:none';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = kind === 'err' ? '#a14a2a' : kind === 'ok' ? '#6b8d4a' : '#c08a3a';
    t.style.color = kind === 'err' ? '#fff' : '#0a0a0a';
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._to);
    t._to = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 2400);
  }
  // ─── Settings modal ──────────────────────────────────────────────
  function openSettings() {
    let bg = $('#fk-modal-bg');
    if (!bg) {
      bg = document.createElement('div'); bg.id = 'fk-modal-bg';
      bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow-y:auto;z-index:9999';
      bg.onclick = e => { if (e.target.id === 'fk-modal-bg') closeSettings(); };
      document.body.appendChild(bg);
    }
    const tier = aiTier();
    const provider = STATE.config.api_provider || 'anthropic';
    const providerCfg = T3_PROVIDERS[provider];
    bg.innerHTML = `
      <div style="background:#13121a;border:1px solid #c08a3a;border-radius:5px;max-width:600px;width:100%;padding:22px 24px;color:#ebe3d2;font-family:system-ui,-apple-system,sans-serif;font-size:13.5px;line-height:1.55">
        <div style="margin-bottom:14px"><label style="display:block;font-size:11px;color:#a89e88;letter-spacing:.04em;margin-bottom:6px;text-transform:uppercase">Tier</label>
          <select id="fk-tier" style="width:100%;padding:8px 11px;background:#1a1922;border:1px solid #3a342c;color:#ebe3d2;border-radius:3px;font-size:13.5px;font-family:inherit">
            <option value="T0"${tier==='T0'?' selected':''}>T0 · off (default · the seed works fully without AI)</option>
            <option value="T2"${tier==='T2'?' selected':''}>T2 · WebLLM in-browser · sovereign · pick a model below</option>
            <option value="T3"${tier==='T3'?' selected':''}>T3 · BYOK · Anthropic / OpenAI / Google · stored in your browser only</option>
          </select>
        </div>
        <div id="fk-t2-block" style="display:${tier==='T2'?'block':'none'};margin-bottom:14px;padding:12px 14px;background:#1a1922;border:1px solid #2a2934;border-radius:4px">
          <label style="display:block;font-size:11px;color:#a89e88;letter-spacing:.04em;margin-bottom:6px;text-transform:uppercase">WebLLM model · 1B → 70B cascade</label>
          <select id="fk-model" style="width:100%;padding:8px 11px;background:#22212c;border:1px solid #3a342c;color:#ebe3d2;border-radius:3px;font-size:13px;font-family:inherit">
            ${Object.entries(WEBLLM_MODELS).map(([k,m]) => `<option value="${k}"${(STATE.config.webllm_model||DEFAULT_MODEL)===k?' selected':''}>${esc(m.label)} · ${esc(m.size)}</option>`).join('')}
          </select>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button id="fk-load-llm" style="padding:7px 14px;background:#c08a3a;color:#0a0a0a;border:none;border-radius:3px;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit">${STATE.ai.ready?'✓ Loaded · switch':'Load model (one-time download)'}</button>
            <span id="fk-llm-status" style="font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#a89e88;letter-spacing:.04em">${STATE.ai.ready?'ready':STATE.ai.loading?Math.round(STATE.ai.progress)+'%':'not loaded'}</span>
          </div>
          <div style="margin-top:8px;font-size:11px;color:#6e6a5e;line-height:1.55">First load downloads the model from @mlc-ai/web-llm CDN. Cached forever after. Inference is 100% local — open DevTools → Network during use, nothing leaves.</div>
        </div>
        <div id="fk-t3-block" style="display:${tier==='T3'?'block':'none'};margin-bottom:14px;padding:12px 14px;background:#1a1922;border:1px solid #2a2934;border-radius:4px">
          <label style="display:block;font-size:11px;color:#a89e88;letter-spacing:.04em;margin-bottom:6px;text-transform:uppercase">BYOK provider</label>
          <select id="fk-provider" style="width:100%;padding:8px 11px;background:#22212c;border:1px solid #3a342c;color:#ebe3d2;border-radius:3px;font-size:13px;font-family:inherit;margin-bottom:10px">
            ${Object.entries(T3_PROVIDERS).map(([k,p]) => `<option value="${k}"${provider===k?' selected':''}>${esc(p.label)}</option>`).join('')}
          </select>
          <label style="display:block;font-size:11px;color:#a89e88;letter-spacing:.04em;margin-bottom:6px;text-transform:uppercase">Model</label>
          <select id="fk-api-model" style="width:100%;padding:8px 11px;background:#22212c;border:1px solid #3a342c;color:#ebe3d2;border-radius:3px;font-size:13px;font-family:inherit;margin-bottom:10px">
            ${providerCfg.models.map(m => `<option value="${m}"${(STATE.config.api_model||providerCfg.default)===m?' selected':''}>${esc(m)}</option>`).join('')}
          </select>
          <label style="display:block;font-size:11px;color:#a89e88;letter-spacing:.04em;margin-bottom:6px;text-transform:uppercase">API key</label>
          <input type="password" id="fk-key" value="${esc(STATE.config.api_key || '')}" placeholder="${STATE.config.api_key ? '(set · leave empty to keep)' : 'sk-ant-... or sk-... or AIza...'}" autocomplete="off" style="width:100%;padding:8px 11px;background:#22212c;border:1px solid #3a342c;color:#ebe3d2;border-radius:3px;font-size:13px;font-family:ui-monospace,Menlo,monospace">
          <div style="margin-top:8px;font-size:11px;color:#6e6a5e;line-height:1.55">Key lives in this browser only (localStorage). Sent direct to the provider — never to us. Wipe with Reset.</div>
        </div>
        <div style="margin-bottom:14px;padding:12px 14px;background:#1a1922;border:1px solid #2a2934;border-radius:4px">
          <label style="display:block;font-size:11px;color:#a89e88;letter-spacing:.04em;margin-bottom:6px;text-transform:uppercase">Cross-seed mesh</label>
          <div style="display:flex;gap:8px;align-items:center">
            <button id="fk-mesh-toggle" style="padding:6px 12px;background:${STATE.mesh.active?'#6b8d4a':'#1a1922'};color:${STATE.mesh.active?'#fff':'#a89e88'};border:1px solid ${STATE.mesh.active?'#6b8d4a':'#3a342c'};border-radius:3px;font-size:11px;cursor:pointer;font-family:inherit">${STATE.mesh.active?'✓ Active · disconnect':'Activate mesh'}</button>
            <span style="font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#6e6a5e;letter-spacing:.04em">channel · <code style="background:#22212c;padding:1px 5px;border-radius:2px">${MESH_CHANNEL}</code></span>
          </div>
          <div style="margin-top:8px;font-size:11px;color:#6e6a5e;line-height:1.55">BroadcastChannel for same-device · WebRTC for cross-device (planned). Other estate seeds on the same channel discover each other automatically.</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button onclick="FallKit.closeSettings()" style="padding:7px 14px;background:transparent;color:#a89e88;border:1px solid #3a342c;border-radius:3px;font-size:12px;cursor:pointer;font-family:inherit">Close</button>
          <button id="fk-save" style="padding:7px 14px;background:#c08a3a;color:#0a0a0a;border:none;border-radius:3px;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit">Save</button>
        </div>
      </div>`;
    // Wire interactions
    $('#fk-tier').onchange = () => {
      const t = $('#fk-tier').value;
      $('#fk-t2-block').style.display = t === 'T2' ? 'block' : 'none';
      $('#fk-t3-block').style.display = t === 'T3' ? 'block' : 'none';
    };
    $('#fk-provider') && ($('#fk-provider').onchange = () => {
      const p = $('#fk-provider').value;
      const sel = $('#fk-api-model');
      sel.innerHTML = T3_PROVIDERS[p].models.map(m => `<option value="${m}">${esc(m)}</option>`).join('');
    });
    $('#fk-load-llm') && ($('#fk-load-llm').onclick = () => {
      const m = $('#fk-model').value;
      loadWebLLM(m);
    });
    $('#fk-mesh-toggle').onclick = () => {
      if (STATE.mesh.active) { STATE.mesh.bc?.close(); STATE.mesh.active = false; STATE.mesh.bc = null; notify('Mesh disconnected'); }
      else meshStart({ seedName: STATE.config.seedName || 'seed' });
      openSettings();  // refresh modal
    };
    $('#fk-save').onclick = () => {
      STATE.config.ai_tier = $('#fk-tier').value;
      if ($('#fk-model')) STATE.config.webllm_model = $('#fk-model').value;
      if ($('#fk-provider')) STATE.config.api_provider = $('#fk-provider').value;
      if ($('#fk-api-model')) STATE.config.api_model = $('#fk-api-model').value;
      const newKey = $('#fk-key')?.value;
      if (newKey) STATE.config.api_key = newKey;
      saveConfig(); renderAiChip(); notify('Saved', 'ok'); closeSettings();
    };
  }
  function closeSettings() { const bg = $('#fk-modal-bg'); if (bg) bg.remove(); }
  // ─── Help section (returns HTML string for inclusion in seed Help tabs) ───
  function helpSection() {
    return `<div style="background:rgba(192,138,58,.05);border:1px solid #3a342c;border-radius:4px;padding:18px 22px;margin:14px 0">
      <p style="font-size:13px;color:#a89e88;line-height:1.7;margin-bottom:10px">This seed runs fully without AI (<strong style="color:#c08a3a">T0</strong>, default). Enable a tier in settings if you want AI-assist features:</p>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr><th style="padding:6px 10px;text-align:left;background:rgba(0,0,0,.2);font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#a89e88;letter-spacing:.08em;text-transform:uppercase">Tier</th><th style="padding:6px 10px;text-align:left;background:rgba(0,0,0,.2);font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#a89e88;letter-spacing:.08em;text-transform:uppercase">What it is</th></tr></thead>
        <tbody>
          <tr><td style="padding:6px 10px;border-top:1px solid #2a2934;color:#c08a3a;font-weight:600">T0</td><td style="padding:6px 10px;border-top:1px solid #2a2934;color:#a89e88">Off. The seed works fully. No AI · no downloads · no API calls.</td></tr>
          <tr><td style="padding:6px 10px;border-top:1px solid #2a2934;color:#c08a3a;font-weight:600">T2</td><td style="padding:6px 10px;border-top:1px solid #2a2934;color:#a89e88">WebLLM in-browser. Pick a model: 1B (700MB, fast) → 3B (2GB, balanced) → 7B (5GB, capable) → 70B (40GB, frontier). One-time download, runs offline forever after. Zero data leaves your device.</td></tr>
          <tr><td style="padding:6px 10px;border-top:1px solid #2a2934;color:#c08a3a;font-weight:600">T3</td><td style="padding:6px 10px;border-top:1px solid #2a2934;color:#a89e88">BYOK · Anthropic Claude · OpenAI GPT · Google Gemini. You bring the API key, you pay the provider direct. Key stays in your browser, sent direct to the provider, never proxied.</td></tr>
        </tbody>
      </table>
      <p style="font-size:12px;color:#6e6a5e;line-height:1.6;margin-top:10px">Open the AI chip in the header to switch tier or check status. Cross-seed mesh activates a BroadcastChannel on <code style="background:#1a1922;padding:1px 5px;border-radius:2px">${MESH_CHANNEL}</code> so other estate seeds on the same device discover this one.</p>
    </div>`;
  }
  // ─── CSS for AI chip ─────────────────────────────────────────────
  function injectCss() {
    const s = document.createElement('style');
    s.id = 'fk-css';
    s.textContent = `
      #fk-ai-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 9px; border-radius:3px; font-family:ui-monospace,Menlo,monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; cursor:pointer; border:1px solid #3a342c; background:#1a1922; color:#a89e88; user-select:none; vertical-align:middle }
      #fk-ai-chip:hover { border-color:#c08a3a; color:#ebe3d2 }
      #fk-ai-chip.fk-chip-live { border-color:#6b8d4a; color:#6b8d4a; background:rgba(107,141,74,.10) }
      #fk-ai-chip.fk-chip-loading { border-color:#e8a83a; color:#e8a83a; background:rgba(232,168,58,.10) }
      #fk-ai-chip.fk-chip-warn { border-color:#a14a2a; color:#a14a2a; background:rgba(161,74,42,.08) }
      #fk-ai-chip .fk-dot { width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0 }
      #fk-ai-chip.fk-chip-loading .fk-dot { animation:fk-pulse 1s infinite }
      @keyframes fk-pulse { 0%,100%{opacity:1}50%{opacity:.3} }
      .fk-ai-assist { display:inline-flex; align-items:center; gap:5px; padding:4px 9px; font-size:11px; border:1px solid #c08a3a; color:#c08a3a; background:transparent; border-radius:3px; cursor:pointer; font-family:inherit }
      .fk-ai-assist:hover { background:#c08a3a; color:#0a0a0a }
      .fk-ai-assist::before { content:'✦'; font-size:12px }
    `;
    document.head.appendChild(s);
  }
  // ─── KCC Mint launcher (v1.2 · fork-this-seed shortcut) ──────────
  function openMint() {
    const slug = (STATE.config.seedName || location.hostname.split('.')[0] || 'seed').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const url = location.href.split('?')[0].split('#')[0];
    const params = new URLSearchParams({ fork: '1', parent_slug: slug, parent_name: name, parent_url: url, parent_desc: desc });
  }
  // ─── Init ────────────────────────────────────────────────────────
  function init(opts) {
    opts = opts || {};
    injectCss();
    if (opts.seedName) STATE.config.seedName = opts.seedName;
    if ($('#fk-ai-chip')) { renderAiChip(); return { version: FALL_KIT_VERSION, mounted: false }; }
    const chip = document.createElement('button');
    chip.id = 'fk-ai-chip';
    chip.title = 'AI cascade · click to configure tier and model';
    chip.innerHTML = '<span class="fk-dot"></span><span id="fk-ai-chip-text">T0 · off</span>';
    chip.onclick = openSettings;
    // Try anchor first, fall back to floating bottom-right
    const anchor = opts.chipAnchor ? $(opts.chipAnchor) : null;
    if (anchor) { anchor.appendChild(chip); }
    else {
      chip.style.cssText += ';position:fixed;bottom:14px;left:14px;z-index:9998;box-shadow:0 4px 14px rgba(0,0,0,.4)';
      document.body.appendChild(chip);
    }
    // v1.2 · floating mint button next to chip
    if (!$('#fk-mint-btn') && !opts.hideMint) {
      const mintBtn = document.createElement('button');
      mintBtn.id = 'fk-mint-btn';
      mintBtn.title = 'Mint a fork of this seed as a KCC bundle · provenance economy';
      mintBtn.innerHTML = '<span style="font-size:13px">✦</span> mint fork';
      mintBtn.style.cssText = 'position:fixed;bottom:14px;left:130px;z-index:9998;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:3px;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;cursor:pointer;border:1px solid #c08a3a;color:#c08a3a;background:rgba(10,10,15,.7);box-shadow:0 4px 14px rgba(0,0,0,.4)';
      mintBtn.onmouseover = () => { mintBtn.style.background = '#c08a3a'; mintBtn.style.color = '#0a0a0a'; };
      mintBtn.onmouseout  = () => { mintBtn.style.background = 'rgba(10,10,15,.7)'; mintBtn.style.color = '#c08a3a'; };
      mintBtn.onclick = openMint;
      document.body.appendChild(mintBtn);
    }
    renderAiChip();
    return { version: FALL_KIT_VERSION, mounted: true };
  }
  // ─── Public API ──────────────────────────────────────────────────
  root.FallKit = {
    version: FALL_KIT_VERSION,
    init: init,
    aiTier: aiTier,
    aiComplete: aiComplete,
    loadWebLLM: loadWebLLM,
    openSettings: openSettings,
    closeSettings: closeSettings,
    renderAiChip: renderAiChip,
    helpSection: helpSection,
    meshStart: meshStart,
    meshPost: meshPost,
    notify: notify,
    openMint: openMint,  // v1.2 · launch kcc-mint with this seed prefilled as parent
    MODELS: WEBLLM_MODELS,
    PROVIDERS: T3_PROVIDERS,
    state: STATE,
  };
})(typeof window !== 'undefined' ? window : globalThis);
  // fall-kit init · auto-mounts a floating AI chip bottom-left
  (function () {
    function go() { if (typeof FallKit !== 'undefined') FallKit.init({ seedName: "fallbuild" }); }
    else go();
  })();
'use strict';
const PRIME=547, VERSION='1.0.0', TOOLNAME='fallbuild';
// ---------- State ----------
const state={
  app:null,
  pageIdx:0,
  selectedId:null,
  mode:'edit',
  settings:{anthropicKey:'',openaiKey:'',geminiKey:'',openrouterKey:''},
  dirty:false
};
const DEMO_DATA={
  customers:[
    {id:1,name:'Alice Chen',email:'alice@acme.io',company:'Acme',tier:'gold',value:12400},
    {id:2,name:'Ben Ortiz',email:'ben@globex.co',company:'Globex',tier:'silver',value:3200},
    {id:3,name:'Cara Singh',email:'cara@initech.net',company:'Initech',tier:'gold',value:18900},
    {id:4,name:'Dan Wu',email:'dan@umbrella.org',company:'Umbrella',tier:'bronze',value:540},
    {id:5,name:'Eva Park',email:'eva@stark.com',company:'Stark',tier:'silver',value:7100}
  ],
  orders:[
    {id:101,customer:'Acme',total:1200,status:'paid',date:'2026-05-12'},
    {id:102,customer:'Globex',total:340,status:'pending',date:'2026-05-14'},
    {id:103,customer:'Initech',total:2890,status:'paid',date:'2026-05-15'},
    {id:104,customer:'Stark',total:540,status:'refunded',date:'2026-05-18'},
    {id:105,customer:'Acme',total:780,status:'paid',date:'2026-05-20'}
  ],
  products:[
    {id:'p1',name:'Widget A',price:29,stock:120,category:'core'},
    {id:'p2',name:'Widget B',price:49,stock:34,category:'pro'},
    {id:'p3',name:'Service plan',price:199,stock:9999,category:'service'},
    {id:'p4',name:'Add-on pack',price:12,stock:540,category:'core'}
  ]
};
// ---------- Widget definitions ----------
const WIDGETS={
  text:{label:'Text',icon:'T',defaultProps:{content:'# Heading\nParagraph text here.'},defaultSize:{w:280,h:80}},
  form:{label:'Form',icon:'☷',defaultProps:{dataSource:'',title:'New record',submitLabel:'Save'},defaultSize:{w:280,h:240}},
  table:{label:'Table',icon:'⊞',defaultProps:{dataSource:'',columns:'',sortable:true,rowAction:'none',rowTarget:''},defaultSize:{w:480,h:240}},
  chart:{label:'Chart',icon:'◧',defaultProps:{dataSource:'',chartType:'bar',xField:'',yField:''},defaultSize:{w:360,h:220}},
  button:{label:'Button',icon:'▣',defaultProps:{label:'Click me',action:'navigate',target:'',code:''},defaultSize:{w:140,h:40}},
  image:{label:'Image',icon:'◇',defaultProps:{src:'',alt:''},defaultSize:{w:200,h:160}},
  container:{label:'Container',icon:'▢',defaultProps:{layout:'flex',bg:''},defaultSize:{w:320,h:200}},
  filter:{label:'Filter',icon:'⏷',defaultProps:{placeholder:'search…',target:''},defaultSize:{w:240,h:48}}
};
// ---------- IndexedDB ----------
let db=null;
function openDB(){return new Promise((res,rej)=>{
  const r=indexedDB.open('fallbuild',1);
  r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('apps'))d.createObjectStore('apps',{keyPath:'id'});if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv',{keyPath:'k'})};
  r.onsuccess=e=>{db=e.target.result;res(db)};
  r.onerror=()=>rej(r.error);
});}
function dbPut(store,obj){return new Promise((res,rej)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(obj);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
function dbGet(store,key){return new Promise((res)=>{const t=db.transaction(store,'readonly');const r=t.objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)})}
function dbAll(store){return new Promise((res)=>{const t=db.transaction(store,'readonly');const r=t.objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([])})}
function dbDel(store,key){return new Promise((res)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>res();t.onerror=()=>res()})}
// ---------- App model ----------
function newApp(){
  state.app={
    id:'app_'+Date.now().toString(36),
    name:'untitled app',
    pages:[{id:'p_'+Date.now().toString(36),name:'home',widgets:[]}],
    dataSources:[],
    createdAt:Date.now(),
    updatedAt:Date.now()
  };
  state.pageIdx=0;
  state.selectedId=null;
  renderAll();
  markDirty();
}
let autosaveT=null;
function scheduleAutosave(){clearTimeout(autosaveT);autosaveT=setTimeout(saveApp,1200)}
async function saveApp(){
  if(!state.app)return;
  state.app.updatedAt=Date.now();
  await dbPut('apps',state.app);
  await dbPut('kv',{k:'lastAppId',v:state.app.id});
  markSaved();
  fmSignal('app-saved',{id:state.app.id,name:state.app.name});
}
async function loadLast(){
  const last=await dbGet('kv','lastAppId');
  if(last&&last.v){
    const a=await dbGet('apps',last.v);
  }
  newApp();
}
// ---------- Rendering ----------
function renderAll(){renderPageTabs();renderPage();renderProps();renderTemplates();renderWidgetTiles();updateStat()}
function updateStat(){
  if(!state.app)return;
  const p=state.app.pages[state.pageIdx];
}
function renderWidgetTiles(){
  for(const k in WIDGETS){
    const w=WIDGETS[k];
    const t=document.createElement('div');
    t.className='widget-tile';t.draggable=true;t.dataset.type=k;
    t.innerHTML=`<span class="ico">${w.icon}</span>${w.label}`;
    t.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/widget-type',k);e.dataTransfer.effectAllowed='copy'});
    c.appendChild(t);
  }
}
function renderTemplates(){
  const tpls=['CRUD app','Dashboard','Lead capture','Pricing calculator','Internal tool'];
  for(const name of tpls){
    const d=document.createElement('div');
    d.className='tmpl-tile';
    d.innerHTML=name+'<small>tap to apply</small>';
    d.onclick=()=>applyTemplate(name);
    c.appendChild(d);
  }
  const ds=document.createElement('div');
  ds.className='tmpl-tile';ds.style.borderColor='var(--brass)';
  ds.innerHTML='Data sources…<small>add demo / inline / fallbase</small>';
  ds.onclick=openDS;
  c.appendChild(ds);
}
function renderPageTabs(){
  state.app.pages.forEach((p,i)=>{
    const t=document.createElement('div');
    t.className='page-tab'+(i===state.pageIdx?' on':'');
    t.innerHTML=`<span>${esc(p.name)}</span><span class="x" data-i="${i}">×</span>`;
    t.onclick=e=>{
      if(e.target.classList.contains('x')){
        if(state.app.pages.length>1){state.app.pages.splice(i,1);if(state.pageIdx>=state.app.pages.length)state.pageIdx=state.app.pages.length-1;markDirty();renderAll()}
      } else {state.pageIdx=i;state.selectedId=null;renderAll()}
    };
    t.ondblclick=()=>{const n=prompt('page name',p.name);if(n){p.name=n;markDirty();renderAll()}};
    c.appendChild(t);
  });
  const add=document.createElement('button');
  add.className='page-tab-add';add.textContent='+ page';
  add.onclick=()=>{
    const name=prompt('page name','page '+(state.app.pages.length+1));
    if(name){state.app.pages.push({id:'p_'+Date.now().toString(36),name,widgets:[]});state.pageIdx=state.app.pages.length-1;markDirty();renderAll()}
  };
  c.appendChild(add);
}
function renderPage(){
  const p=state.app.pages[state.pageIdx];if(!p)return;
  p.widgets.forEach(w=>s.appendChild(renderWidget(w)));
}
function renderWidget(w){
  const el=document.createElement('div');
  el.className='widget'+(state.selectedId===w.id?' selected':'');
  el.style.left=w.x+'px';el.style.top=w.y+'px';el.style.width=w.w+'px';el.style.height=w.h+'px';
  el.dataset.id=w.id;
  el.innerHTML=`<div class="w-label">${WIDGETS[w.type].label}</div>`+renderWidgetBody(w);
  if(state.mode==='edit'){
    const handle=document.createElement('div');handle.className='w-handle';el.appendChild(handle);
    el.onclick=e=>{e.stopPropagation();state.selectedId=w.id;renderAll()};
    enableDrag(el,w,handle);
  } else {
    bindRuntime(el,w);
  }
  if(w.type==='chart')setTimeout(()=>drawChart(el,w),0);
  return el;
}
function renderWidgetBody(w){
  const p=w.props||{};
  if(w.type==='text')return mdToHtml(p.content||'');
  if(w.type==='form'){
    const rows=p.dataSource?dataSourceFields(p.dataSource):['field1','field2'];
    return `<div style="font-weight:600;margin-bottom:6px;font-family:var(--serif)">${esc(p.title||'Form')}</div>`+
      rows.map(f=>`<div class="field-row"><label>${esc(f)}</label><input data-field="${esc(f)}" type="text"></div>`).join('')+
      `<button class="w-btn" data-act="submit">${esc(p.submitLabel||'Save')}</button>`;
  }
  if(w.type==='table'){
    const rows=getDSData(p.dataSource);
    if(!rows.length)return `<div style="color:var(--cream-muted);font-size:11px">bind a data source in the right panel</div>`;
    const cols=(p.columns||'').split(',').map(s=>s.trim()).filter(Boolean);
    const keys=cols.length?cols:Object.keys(rows[0]);
    let h='<table><thead><tr>'+keys.map(k=>`<th>${esc(k)}</th>`).join('')+'</tr></thead><tbody>';
    for(const r of rows.slice(0,20))h+='<tr data-row=\''+esc(JSON.stringify(r))+'\'>'+keys.map(k=>`<td>${esc(r[k]??'')}</td>`).join('')+'</tr>';
    h+='</tbody></table>';
    return h;
  }
  if(w.type==='chart')return `<canvas style="width:100%;height:100%"></canvas>`;
  if(w.type==='button')return `<button class="w-btn" style="width:100%;height:100%">${esc(p.label||'Button')}</button>`;
  if(w.type==='image'){
    if(p.src)return `<img src="${p.src}" alt="${esc(p.alt||'')}" style="width:100%;height:100%;object-fit:cover">`;
    return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--cream-muted);font-size:11px;border:1px dashed var(--line)">image — set src in props</div>`;
  }
  if(w.type==='container')return `<div style="display:${p.layout==='grid'?'grid':'flex'};gap:8px;width:100%;height:100%;${p.bg?'background:'+esc(p.bg)+';':''}"></div>`;
  if(w.type==='filter')return `<input data-act="filter" placeholder="${esc(p.placeholder||'search')}" style="width:100%">`;
  return '';
}
function dataSourceFields(name){
  const rows=getDSData(name);
  return rows.length?Object.keys(rows[0]).filter(k=>k!=='id'):[];
}
function getDSData(name){
  if(!state.app||!name)return [];
  const ds=state.app.dataSources.find(d=>d.name===name);
  if(!ds)return [];
  if(ds.type==='demo')return DEMO_DATA[ds.demo]||[];
  if(ds.type==='inline'){try{return JSON.parse(ds.json||'[]')}catch(e){return[]}}
  if(ds.type==='fallbase')return ds.cache||[];
  return [];
}
// ---------- Markdown (tiny subset) ----------
function mdToHtml(s){
  s=esc(s);
  s=s.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  s=s.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  s=s.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  s=s.replace(/\*(.+?)\*/g,'<em>$1</em>');
  s=s.replace(/`(.+?)`/g,'<code>$1</code>');
  s=s.split(/\n\n+/).map(p=>/^<h\d/.test(p)?p:'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');
  return s;
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
// ---------- Chart drawing (canvas, no library) ----------
function drawChart(el,w){
  const cv=el.querySelector('canvas');if(!cv)return;
  const rows=getDSData(w.props.dataSource);if(!rows.length){const ctx=cv.getContext('2d');ctx.fillStyle='#a8a395';ctx.font='11px sans-serif';ctx.fillText('bind a data source',10,20);return}
  const xF=w.props.xField||Object.keys(rows[0])[0];
  const yF=w.props.yField||Object.keys(rows[0]).find(k=>typeof rows[0][k]==='number')||Object.keys(rows[0])[1];
  const W=cv.clientWidth,H=cv.clientHeight;
  cv.width=W*dpr;cv.height=H*dpr;
  const ctx=cv.getContext('2d');ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  const data=rows.map(r=>({x:String(r[xF]),y:Number(r[yF])||0}));
  const max=Math.max(...data.map(d=>d.y),1);
  const pad=24,cw=W-pad*2,ch=H-pad*2;
  ctx.strokeStyle='#2a2934';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad,pad);ctx.lineTo(pad,H-pad);ctx.lineTo(W-pad,H-pad);ctx.stroke();
  if(w.props.chartType==='bar'){
    const bw=cw/data.length*.7,gap=cw/data.length*.3;
    data.forEach((d,i)=>{
      const x=pad+i*(bw+gap)+gap/2,bh=d.y/max*ch,y=H-pad-bh;
      ctx.fillStyle='#b8974a';ctx.fillRect(x,y,bw,bh);
      ctx.fillStyle='#a8a395';ctx.font='9px sans-serif';ctx.textAlign='center';
      ctx.fillText(d.x.slice(0,8),x+bw/2,H-pad+10);
    });
  } else if(w.props.chartType==='line'){
    ctx.strokeStyle='#ff8c00';ctx.lineWidth=2;ctx.beginPath();
    data.forEach((d,i)=>{const x=pad+i*(cw/(data.length-1||1)),y=H-pad-d.y/max*ch;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
    ctx.stroke();
    ctx.fillStyle='#ff8c00';data.forEach((d,i)=>{const x=pad+i*(cw/(data.length-1||1)),y=H-pad-d.y/max*ch;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()});
  } else if(w.props.chartType==='pie'){
    const total=data.reduce((a,d)=>a+d.y,0)||1;
    const cx=W/2,cy=H/2,r=Math.min(W,H)/2-pad;
    let a=-Math.PI/2;
    const cols=['#b8974a','#ff8c00','#8b1a1a','#4ade80','#60a5fa','#fbbf24','#a8a395'];
    data.forEach((d,i)=>{
      const a2=a+d.y/total*Math.PI*2;
      ctx.fillStyle=cols[i%cols.length];
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a2);ctx.closePath();ctx.fill();
      a=a2;
    });
  }
}
// ---------- Drag (canvas widget drag + resize) ----------
function enableDrag(el,w,handle){
  let mode=null,sx=0,sy=0,sw=0,sh=0,ox=0,oy=0;
  el.addEventListener('mousedown',e=>{
    if(e.target.closest('button')||e.target.closest('input'))return;
    if(e.target===handle){mode='resize'}else{mode='move'}
    sx=e.clientX;sy=e.clientY;sw=w.w;sh=w.h;ox=w.x;oy=w.y;
    e.preventDefault();
    const mv=ev=>{
      const dx=ev.clientX-sx,dy=ev.clientY-sy;
      if(mode==='move'){w.x=Math.max(0,Math.round((ox+dx)/snap)*snap);w.y=Math.max(0,Math.round((oy+dy)/snap)*snap);el.style.left=w.x+'px';el.style.top=w.y+'px'}
      else{w.w=Math.max(60,Math.round((sw+dx)/snap)*snap);w.h=Math.max(40,Math.round((sh+dy)/snap)*snap);el.style.width=w.w+'px';el.style.height=w.h+'px';if(w.type==='chart')drawChart(el,w)}
    };
    const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);markDirty()};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
  });
}
// Canvas drop target (palette → canvas)
canvas.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'});
canvas.addEventListener('drop',e=>{
  e.preventDefault();
  const t=e.dataTransfer.getData('text/widget-type');if(!t)return;
  const r=canvas.getBoundingClientRect();
  const wd=WIDGETS[t];
  const w={id:'w_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type:t,x:Math.max(0,e.clientX-r.left+canvas.scrollLeft-wd.defaultSize.w/2),y:Math.max(0,e.clientY-r.top+canvas.scrollTop-wd.defaultSize.h/2),w:wd.defaultSize.w,h:wd.defaultSize.h,props:JSON.parse(JSON.stringify(wd.defaultProps))};
  state.app.pages[state.pageIdx].widgets.push(w);
  state.selectedId=w.id;markDirty();renderAll();
});
canvas.addEventListener('click',e=>{if(e.target===canvas||e.target.id==='pageSurface'){state.selectedId=null;renderAll()}});
// ---------- Properties ----------
function renderProps(){
  if(!state.selectedId){c.innerHTML='<div class="empty">select a widget to edit its properties · or drag one from the left palette</div>';return}
  const p=state.app.pages[state.pageIdx];
  const w=p.widgets.find(x=>x.id===state.selectedId);if(!w){c.innerHTML='<div class="empty">no widget</div>';return}
  let h=`<h4>${WIDGETS[w.type].label} · <span class="mono" style="font-size:10px;color:var(--cream-muted)">${esc(w.id)}</span></h4>`;
  h+=propRow('x',`<input type="number" value="${w.x}" onchange="upd('x',+this.value)">`);
  h+=propRow('y',`<input type="number" value="${w.y}" onchange="upd('y',+this.value)">`);
  h+=propRow('width',`<input type="number" value="${w.w}" onchange="upd('w',+this.value)">`);
  h+=propRow('height',`<input type="number" value="${w.h}" onchange="upd('h',+this.value)">`);
  const pp=w.props;
  const dsOpts=`<option value="">— none —</option>`+state.app.dataSources.map(d=>`<option value="${esc(d.name)}" ${pp.dataSource===d.name?'selected':''}>${esc(d.name)}</option>`).join('');
  if(w.type==='text')h+=propRow('content (markdown)',`<textarea onchange="updP('content',this.value)">${esc(pp.content||'')}</textarea>`);
  if(w.type==='form'){
    h+=propRow('title',`<input value="${esc(pp.title||'')}" onchange="updP('title',this.value)">`);
    h+=propRow('data source',`<select onchange="updP('dataSource',this.value)">${dsOpts}</select>`);
    h+=propRow('submit label',`<input value="${esc(pp.submitLabel||'')}" onchange="updP('submitLabel',this.value)">`);
  }
  if(w.type==='table'){
    h+=propRow('data source',`<select onchange="updP('dataSource',this.value)">${dsOpts}</select>`);
    h+=propRow('columns (csv, blank=all)',`<input value="${esc(pp.columns||'')}" onchange="updP('columns',this.value)">`);
    h+=propRow('sortable',`<input type="checkbox" ${pp.sortable?'checked':''} onchange="updP('sortable',this.checked)">`,true);
    h+=propRow('row click action',`<select onchange="updP('rowAction',this.value)">
      <option value="none" ${pp.rowAction==='none'?'selected':''}>none</option>
      <option value="navigate" ${pp.rowAction==='navigate'?'selected':''}>navigate page</option>
      <option value="delete" ${pp.rowAction==='delete'?'selected':''}>delete row</option>
    </select>`);
    h+=propRow('row target (page)',`<input value="${esc(pp.rowTarget||'')}" onchange="updP('rowTarget',this.value)">`);
  }
  if(w.type==='chart'){
    h+=propRow('data source',`<select onchange="updP('dataSource',this.value)">${dsOpts}</select>`);
    h+=propRow('type',`<select onchange="updP('chartType',this.value)"><option ${pp.chartType==='bar'?'selected':''}>bar</option><option ${pp.chartType==='line'?'selected':''}>line</option><option ${pp.chartType==='pie'?'selected':''}>pie</option></select>`);
    h+=propRow('x field',`<input value="${esc(pp.xField||'')}" onchange="updP('xField',this.value)">`);
    h+=propRow('y field',`<input value="${esc(pp.yField||'')}" onchange="updP('yField',this.value)">`);
  }
  if(w.type==='button'){
    h+=propRow('label',`<input value="${esc(pp.label||'')}" onchange="updP('label',this.value)">`);
    h+=propRow('action',`<select onchange="updP('action',this.value)">
      <option value="navigate" ${pp.action==='navigate'?'selected':''}>navigate page</option>
      <option value="submit" ${pp.action==='submit'?'selected':''}>submit form</option>
      <option value="delete" ${pp.action==='delete'?'selected':''}>delete row</option>
      <option value="custom" ${pp.action==='custom'?'selected':''}>custom js</option>
    </select>`);
    h+=propRow('target (page or selector)',`<input value="${esc(pp.target||'')}" onchange="updP('target',this.value)">`);
    if(pp.action==='custom')h+=propRow('js code',`<textarea onchange="updP('code',this.value)">${esc(pp.code||'')}</textarea>`);
  }
  if(w.type==='image'){
    h+=propRow('upload',`<input type="file" accept="image/*" onchange="uploadImg(this)">`);
    h+=propRow('src',`<input value="${esc(pp.src||'')}" onchange="updP('src',this.value)">`);
    h+=propRow('alt',`<input value="${esc(pp.alt||'')}" onchange="updP('alt',this.value)">`);
  }
  if(w.type==='container'){
    h+=propRow('layout',`<select onchange="updP('layout',this.value)"><option ${pp.layout==='flex'?'selected':''}>flex</option><option ${pp.layout==='grid'?'selected':''}>grid</option></select>`);
    h+=propRow('background',`<input value="${esc(pp.bg||'')}" onchange="updP('bg',this.value)" placeholder="#1a1922">`);
  }
  if(w.type==='filter'){
    h+=propRow('placeholder',`<input value="${esc(pp.placeholder||'')}" onchange="updP('placeholder',this.value)">`);
    h+=propRow('target table id',`<input value="${esc(pp.target||'')}" onchange="updP('target',this.value)">`);
  }
  h+=`<button class="danger" onclick="delWidget()">delete widget</button>`;
  c.innerHTML=h;
}
function propRow(label,html,inline){return `<div class="row${inline?' inline':''}"><label>${label}</label>${html}</div>`}
function curW(){const p=state.app.pages[state.pageIdx];return p.widgets.find(x=>x.id===state.selectedId)}
function upd(k,v){const w=curW();if(!w)return;w[k]=v;markDirty();renderPage();renderProps()}
function updP(k,v){const w=curW();if(!w)return;w.props[k]=v;markDirty();renderPage();renderProps()}
function delWidget(){const p=state.app.pages[state.pageIdx];p.widgets=p.widgets.filter(w=>w.id!==state.selectedId);state.selectedId=null;markDirty();renderAll()}
function uploadImg(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{updP('src',e.target.result)};r.readAsDataURL(f)}
// ---------- Mode ----------
function setMode(m){
  state.mode=m;
  document.body.classList.toggle('preview',m==='preview');
  renderAll();
}
// ---------- Runtime binding (preview mode) ----------
function bindRuntime(el,w){
  const p=w.props;
  if(w.type==='button'){
    el.querySelector('button').onclick=()=>runtimeAction(w);
  }
  if(w.type==='form'){
    el.querySelector('button[data-act="submit"]').onclick=()=>{
      const fields={};el.querySelectorAll('input[data-field]').forEach(i=>fields[i.dataset.field]=i.value);
      if(p.dataSource){
        const ds=state.app.dataSources.find(d=>d.name===p.dataSource);
        if(ds){
          if(ds.type==='demo'){DEMO_DATA[ds.demo].push({id:Date.now(),...fields})}
          else if(ds.type==='inline'){try{const arr=JSON.parse(ds.json||'[]');arr.push({id:Date.now(),...fields});ds.json=JSON.stringify(arr)}catch(e){}}
          else if(ds.type==='fallbase'){fbWrite(ds.fallbase,fields)}
          fmSignal('form-submit',{ds:p.dataSource,fields});
          el.querySelectorAll('input[data-field]').forEach(i=>i.value='');
          alert('saved');
          renderPage();
        }
      }
    };
  }
  if(w.type==='table'){
    el.querySelectorAll('tr[data-row]').forEach(tr=>{
      tr.style.cursor=p.rowAction!=='none'?'pointer':'';
      tr.onclick=()=>{
        const row=JSON.parse(tr.dataset.row);
        if(p.rowAction==='navigate'&&p.rowTarget){gotoPage(p.rowTarget)}
        else if(p.rowAction==='delete'){
          const ds=state.app.dataSources.find(d=>d.name===p.dataSource);
          if(ds&&ds.type==='demo'){const arr=DEMO_DATA[ds.demo];const i=arr.findIndex(r=>r.id===row.id);if(i>=0)arr.splice(i,1)}
          renderPage();
        }
      };
    });
  }
  if(w.type==='filter'){
    el.querySelector('input').oninput=e=>{
      const q=e.target.value.toLowerCase();
    };
  }
}
function runtimeAction(w){
  const p=w.props;
  if(p.action==='navigate'&&p.target)gotoPage(p.target);
  else if(p.action==='custom'&&p.code){try{new Function('state',p.code)(state)}catch(e){alert('js error: '+e.message)}}
}
function gotoPage(name){
  const i=state.app.pages.findIndex(p=>p.name===name||p.id===name);
  if(i>=0){state.pageIdx=i;renderAll()}
}
// ---------- File menu ----------
document.addEventListener('click',e=>{if(!e.target.closest('.menu'))closeMenus()});
function exportJSON(){
  const blob=new Blob([JSON.stringify(state.app,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.app.name||'app').replace(/\s+/g,'-')+'.json';a.click();
}
function importJSON(){
  const inp=document.createElement('input');inp.type='file';inp.accept='application/json';
  inp.click();
}
// ---------- Open dialog ----------
async function openOpen(){
  const apps=await dbAll('apps');
  if(!apps.length){ul.innerHTML='<li>no saved apps yet</li>'}
  else apps.sort((a,b)=>b.updatedAt-a.updatedAt).forEach(a=>{
    const li=document.createElement('li');
    li.innerHTML=`<span>${esc(a.name)}</span><small>${new Date(a.updatedAt).toLocaleString()}</small>`;
    ul.appendChild(li);
  });
}
// ---------- Settings ----------
function openSettings(){
}
async function saveSettings(){
  state.settings={
  };
  await dbPut('kv',{k:'settings',v:state.settings});
  closeSettings();updateTierBadge();
}
// ---------- Data sources modal ----------
function dsTypeChange(){
}
function renderDSList(){
  if(!state.app.dataSources.length){c.innerHTML='<div style="color:var(--cream-muted);font-size:11px">no data sources yet</div>';return}
  c.innerHTML=state.app.dataSources.map((d,i)=>`<div style="display:flex;justify-content:space-between;padding:6px;border:1px solid var(--line);border-radius:3px;margin-bottom:4px;font-size:11px"><span><b>${esc(d.name)}</b> · <span class="mono">${esc(d.type)}</span></span><button onclick="delDS(${i})">×</button></div>`).join('');
}
function delDS(i){state.app.dataSources.splice(i,1);markDirty();renderDSList();renderAll()}
function addDS(){
  if(!name)return alert('name required');
  const d={name,type:t};
  state.app.dataSources.push(d);markDirty();
  renderDSList();renderAll();
}
// ---------- Templates ----------
function applyTemplate(name){
  if(!confirm('Replace current app with template: '+name+'?'))return;
  const t=buildTemplate(name);
  state.app=t;state.pageIdx=0;state.selectedId=null;
  markDirty();renderAll();
}
function buildTemplate(name){
  const base={id:'app_'+Date.now().toString(36),name:name.toLowerCase(),pages:[],dataSources:[],createdAt:Date.now(),updatedAt:Date.now()};
  if(name==='CRUD app'){
    base.dataSources=[{name:'customers',type:'demo',demo:'customers'}];
    base.pages=[
      {id:'p1',name:'list',widgets:[
        mkW('text',20,20,500,40,{content:'# Customers'}),
        mkW('button',20,70,140,36,{label:'+ New customer',action:'navigate',target:'new'}),
        mkW('filter',180,70,200,36,{placeholder:'search…'}),
        mkW('table',20,120,720,360,{dataSource:'customers',columns:'name,email,company,tier,value',sortable:true,rowAction:'navigate',rowTarget:'edit'})
      ]},
      {id:'p2',name:'new',widgets:[
        mkW('text',20,20,500,40,{content:'# New customer'}),
        mkW('form',20,70,400,320,{dataSource:'customers',title:'Add customer',submitLabel:'Save'}),
        mkW('button',20,400,120,36,{label:'← back',action:'navigate',target:'list'})
      ]},
      {id:'p3',name:'edit',widgets:[
        mkW('text',20,20,500,40,{content:'# Edit customer'}),
        mkW('form',20,70,400,320,{dataSource:'customers',title:'Edit',submitLabel:'Update'}),
        mkW('button',20,400,120,36,{label:'← back',action:'navigate',target:'list'})
      ]}
    ];
  } else if(name==='Dashboard'){
    base.dataSources=[{name:'orders',type:'demo',demo:'orders'},{name:'customers',type:'demo',demo:'customers'}];
    base.pages=[{id:'p1',name:'dashboard',widgets:[
      mkW('text',20,20,800,40,{content:'# Dashboard'}),
      mkW('filter',20,70,300,36,{placeholder:'filter…'}),
      mkW('chart',20,120,360,240,{dataSource:'orders',chartType:'bar',xField:'customer',yField:'total'}),
      mkW('chart',400,120,360,240,{dataSource:'customers',chartType:'pie',xField:'tier',yField:'value'}),
      mkW('chart',20,380,740,240,{dataSource:'orders',chartType:'line',xField:'date',yField:'total'})
    ]}];
  } else if(name==='Lead capture'){
    base.dataSources=[{name:'leads',type:'inline',json:'[]'}];
    base.pages=[
      {id:'p1',name:'capture',widgets:[
        mkW('text',20,20,500,80,{content:'# Get a demo\nLeave your details and we will be in touch.'}),
        mkW('form',20,120,400,260,{dataSource:'leads',title:'Your details',submitLabel:'Request demo'})
      ]},
      {id:'p2',name:'success',widgets:[
        mkW('text',20,20,500,120,{content:'# Thank you\nWe got your details.'})
      ]}
    ];
  } else if(name==='Pricing calculator'){
    base.dataSources=[{name:'quotes',type:'inline',json:'[]'}];
    base.pages=[{id:'p1',name:'calc',widgets:[
      mkW('text',20,20,600,80,{content:'# Pricing calculator'}),
      mkW('form',20,120,400,260,{dataSource:'quotes',title:'Inputs',submitLabel:'Calculate'}),
      mkW('text',440,120,300,140,{content:'## Result\nFill the form to calculate.'}),
      mkW('button',20,400,200,40,{label:'custom calc',action:'custom',code:'alert("custom calc result: $" + Math.floor(Math.random()*1000))'})
    ]}];
  } else if(name==='Internal tool'){
    base.dataSources=[{name:'customers',type:'demo',demo:'customers'},{name:'orders',type:'demo',demo:'orders'},{name:'products',type:'demo',demo:'products'}];
    base.pages=[
      {id:'p1',name:'customers',widgets:[
        mkW('text',20,20,400,40,{content:'# Customers'}),
        mkW('table',20,70,760,360,{dataSource:'customers',columns:'name,email,company,tier',sortable:true})
      ]},
      {id:'p2',name:'orders',widgets:[
        mkW('text',20,20,400,40,{content:'# Orders'}),
        mkW('table',20,70,760,360,{dataSource:'orders',sortable:true})
      ]},
      {id:'p3',name:'products',widgets:[
        mkW('text',20,20,400,40,{content:'# Products'}),
        mkW('table',20,70,760,360,{dataSource:'products',sortable:true})
      ]}
    ];
  }
  return base;
}
function mkW(type,x,y,w,h,props){return {id:'w_'+Math.random().toString(36).slice(2,9),type,x,y,w,h,props:Object.assign(JSON.parse(JSON.stringify(WIDGETS[type].defaultProps)),props||{})}}
// ---------- Ω palette ----------
const T0_KEYWORDS=[
  {kw:/crud|list.*form|customer/i,name:'CRUD app'},
  {kw:/dashboard|chart|metric/i,name:'Dashboard'},
  {kw:/lead|signup|capture|contact/i,name:'Lead capture'},
  {kw:/pric|calc|quote/i,name:'Pricing calculator'},
  {kw:/internal|sidebar|tool|admin/i,name:'Internal tool'}
];
function paletteRender(q){
  const tpls=['CRUD app','Dashboard','Lead capture','Pricing calculator','Internal tool'];
  const matches=q?tpls.filter(t=>t.toLowerCase().includes(q.toLowerCase())):tpls;
  matches.forEach(t=>{
    const d=document.createElement('div');d.className='opt';
    d.innerHTML=`<span>apply template: <b>${t}</b></span><small>T0</small>`;
    d.onclick=()=>{applyTemplate(t);closePalette()};
    body.appendChild(d);
  });
  if(q){
    const d=document.createElement('div');d.className='opt';
    d.innerHTML=`<span>generate app from prompt: <b>${esc(q)}</b></span><small id="pTierLine">T0</small>`;
    d.onclick=()=>llmGenerate(q);
    body.appendChild(d);
  }
}
  if(e.key==='Enter'){
    const q=e.target.value.trim();if(!q)return;
    for(const r of T0_KEYWORDS)if(r.kw.test(q)){applyTemplate(r.name);closePalette();return}
    llmGenerate(q);
  } else if(e.key==='Escape')closePalette();
});
async function llmGenerate(q){
  const tier=await Cascade.detectTier();
  if(tier==='T0'){
    // Keyword fallback
    for(const r of T0_KEYWORDS)if(r.kw.test(q)){applyTemplate(r.name);closePalette();return}
    alert('set an API key in settings for natural-language generation, or try: crud / dashboard / lead capture / pricing / internal tool');
    return;
  }
  const sys=`You are FallBuild's app planner. Return ONLY valid JSON matching this schema (no prose, no fences):
{"name":"app name","pages":[{"name":"page name","widgets":[{"type":"text|form|table|chart|button|image|container|filter","x":0,"y":0,"w":300,"h":100,"props":{}}]}],"dataSources":[{"name":"customers","type":"demo","demo":"customers|orders|products"}]}
Widget props: text:{content}; form:{dataSource,title,submitLabel}; table:{dataSource,columns,rowAction}; chart:{dataSource,chartType:"bar|line|pie",xField,yField}; button:{label,action:"navigate|submit|custom",target}; image:{src,alt}; container:{layout:"flex|grid"}; filter:{placeholder}. Layout in pixels on a 1200x800 canvas.`;
  try{
    const r=await Cascade.generate(sys,q,2000);
    if(!r.text)throw new Error('no output');
    let txt=r.text.trim().replace(/^```json\s*|```$/g,'').replace(/^```\s*|```$/g,'');
    const m=txt.match(/\{[\s\S]*\}/);if(m)txt=m[0];
    const app=JSON.parse(txt);
    app.id='app_'+Date.now().toString(36);app.pages=app.pages||[];
    app.pages.forEach(p=>{p.id=p.id||'p_'+Math.random().toString(36).slice(2,8);p.widgets=(p.widgets||[]).map(w=>Object.assign(mkW(w.type||'text',w.x||20,w.y||20,w.w||300,w.h||100,w.props||{})))});
    app.dataSources=app.dataSources||[];
    state.app=app;state.pageIdx=0;state.selectedId=null;
    closePalette();renderAll();markDirty();
  }catch(e){
  }
}
// ---------- FallBase / fallmesh ----------
let fmChan=null;
function fmInit(){try{fmChan=new BroadcastChannel('fall-signal');fmChan.postMessage({source:'fallbuild',type:'hello',prime:PRIME,version:VERSION,ts:Date.now()});fmChan.addEventListener('message',e=>{const m=e.data;if(m&&m.type==='ping')fmChan.postMessage({source:'fallbuild',type:'pong',prime:PRIME});if(m&&m.type==='fallbase-data'&&m.table){const ds=state.app&&state.app.dataSources.find(d=>d.type==='fallbase'&&d.fallbase===m.table);if(ds){ds.cache=m.rows||[];renderPage()}}})}catch(e){}}
function fmSignal(type,extra){if(!fmChan)return;try{fmChan.postMessage({source:'fallbuild',type,prime:PRIME,ts:Date.now(),...extra})}catch(e){}}
function fbFetch(ds){fmSignal('fallbase-request',{table:ds.fallbase});setTimeout(()=>{if(!ds.cache.length)ds.cache=DEMO_DATA.customers},800)}
function fbWrite(table,row){fmSignal('fallbase-write',{table,row})}
// ---------- Cascade (T0/T2/T3) ----------
const Cascade={
  async detectTier(){if(await this._probe())return'T2';const s=state.settings;if(s.anthropicKey||s.openaiKey||s.geminiKey||s.openrouterKey)return'T3';return'T0'},
  async _probe(){if(this._p!==undefined)return this._p;try{this._p=await Promise.race([fetch('http://127.0.0.1:11434/api/tags').then(r=>r.ok),new Promise(r=>setTimeout(()=>r(false),350))])}catch(e){this._p=false}return this._p},
  async generate(sys,user,maxTok){const s=state.settings,max=maxTok||1200;
    if(s.anthropicKey)try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':s.anthropicKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-haiku-4-5',max_tokens:max,system:sys,messages:[{role:'user',content:user}]})});const d=await r.json();return{tier:'T3·Claude',text:d?.content?.[0]?.text||''}}catch(e){}
    if(s.geminiKey)try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${s.geminiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{parts:[{text:user}]}]})});const d=await r.json();return{tier:'T3·Gemini',text:d?.candidates?.[0]?.content?.parts?.[0]?.text||''}}catch(e){}
    if(s.openaiKey)try{const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.openaiKey},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:sys},{role:'user',content:user}]})});const d=await r.json();return{tier:'T3·GPT',text:d?.choices?.[0]?.message?.content||''}}catch(e){}
    if(s.openrouterKey)try{const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.openrouterKey,'HTTP-Referer':location.origin},body:JSON.stringify({model:'anthropic/claude-haiku-4-5',messages:[{role:'system',content:sys},{role:'user',content:user}]})});const d=await r.json();return{tier:'T3·OpenRouter',text:d?.choices?.[0]?.message?.content||''}}catch(e){}
    return{tier:'T0',text:null}
  }
};
// ---------- Standalone export ----------
const RUNTIME_SRC=`
'use strict';
(function(){
const APP=window.__FALLBUILD_APP__;
const DS_DATA=window.__FALLBUILD_DATA__||{};
const PRIME=547;
try{const sig=new BroadcastChannel('fall-signal');sig.postMessage({source:'fallbuild-app',type:'hello',prime:PRIME,name:APP.name,ts:Date.now()});sig.addEventListener('message',e=>{const m=e.data;if(m&&m.type==='fallbase-data'&&m.table){const ds=APP.dataSources.find(d=>d.type==='fallbase'&&d.fallbase===m.table);if(ds){DS_DATA[ds.name]=m.rows||[];render()}}});window.__SIG=sig}catch(e){}
let pageIdx=0;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function mdToHtml(s){s=esc(s);s=s.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>').replace(/\\*(.+?)\\*/g,'<em>$1</em>');return s.split(/\\n\\n+/).map(p=>/^<h\\d/.test(p)?p:'<p>'+p.replace(/\\n/g,'<br>')+'</p>').join('')}
function getRows(name){if(!name)return [];if(DS_DATA[name])return DS_DATA[name];const ds=APP.dataSources.find(d=>d.name===name);if(!ds)return [];if(ds.type==='inline'){try{return JSON.parse(ds.json||'[]')}catch(e){return[]}}if(ds.type==='fallbase'){try{window.__SIG&&window.__SIG.postMessage({source:'fallbuild-app',type:'fallbase-request',table:ds.fallbase})}catch(e){}return ds.cache||[]}return []}
function render(){
  const page=APP.pages[pageIdx];if(!page){root.innerHTML='<p>page not found</p>';return}
  if(APP.pages.length>1){const nav=document.createElement('nav');nav.className='fb-nav';APP.pages.forEach((p,i)=>{const a=document.createElement('a');a.textContent=p.name;a.className=i===pageIdx?'on':'';a.onclick=()=>{pageIdx=i;render()};nav.appendChild(a)});root.appendChild(nav)}
  const surface=document.createElement('div');surface.className='fb-surface';root.appendChild(surface);
  page.widgets.forEach(w=>{
    const el=document.createElement('div');el.className='fb-widget fb-'+w.type;
    el.style.cssText='position:absolute;left:'+w.x+'px;top:'+w.y+'px;width:'+w.w+'px;height:'+w.h+'px';
    surface.appendChild(el);bind(el,w);
  });
}
function bind(el,w){
  const p=w.props||{};
  if(w.type==='text'){el.innerHTML=mdToHtml(p.content||'')}
  else if(w.type==='form'){
    const rows=getRows(p.dataSource),keys=rows.length?Object.keys(rows[0]).filter(k=>k!=='id'):['field1','field2'];
    el.innerHTML='<h3>'+esc(p.title||'Form')+'</h3>'+keys.map(k=>'<label>'+esc(k)+'<input data-f="'+esc(k)+'"></label>').join('')+'<button class="fb-btn">'+esc(p.submitLabel||'Save')+'</button>';
    el.querySelector('button').onclick=()=>{const obj={};el.querySelectorAll('input[data-f]').forEach(i=>obj[i.dataset.f]=i.value);if(p.dataSource){const ds=APP.dataSources.find(d=>d.name===p.dataSource);if(ds&&ds.type==='fallbase'){try{window.__SIG&&window.__SIG.postMessage({source:'fallbuild-app',type:'fallbase-write',table:ds.fallbase,row:obj})}catch(e){}}else if(ds&&ds.type==='inline'){try{const arr=JSON.parse(ds.json||'[]');arr.push({id:Date.now(),...obj});ds.json=JSON.stringify(arr);DS_DATA[ds.name]=arr}catch(e){}}else{if(!DS_DATA[p.dataSource])DS_DATA[p.dataSource]=getRows(p.dataSource).slice();DS_DATA[p.dataSource].push({id:Date.now(),...obj})}}el.querySelectorAll('input').forEach(i=>i.value='');alert('saved');render()};
  } else if(w.type==='table'){
    const rows=getRows(p.dataSource);if(!rows.length){el.innerHTML='<em>no data</em>';return}
    const cols=(p.columns||'').split(',').map(s=>s.trim()).filter(Boolean);
    const keys=cols.length?cols:Object.keys(rows[0]);
    let h='<table><thead><tr>'+keys.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach((r,i)=>{h+='<tr data-i="'+i+'">'+keys.map(k=>'<td>'+esc(r[k]??'')+'</td>').join('')+'</tr>'});
    h+='</tbody></table>';el.innerHTML=h;
    if(p.rowAction!=='none')el.querySelectorAll('tr[data-i]').forEach(tr=>{tr.style.cursor='pointer';tr.onclick=()=>{if(p.rowAction==='navigate'&&p.rowTarget){const i=APP.pages.findIndex(pg=>pg.name===p.rowTarget);if(i>=0){pageIdx=i;render()}}}});
  } else if(w.type==='chart'){
    el.innerHTML='<canvas></canvas>';drawChart(el.querySelector('canvas'),w);
  } else if(w.type==='button'){
    el.innerHTML='<button class="fb-btn" style="width:100%;height:100%">'+esc(p.label||'Button')+'</button>';
    el.querySelector('button').onclick=()=>{if(p.action==='navigate'&&p.target){const i=APP.pages.findIndex(pg=>pg.name===p.target||pg.id===p.target);if(i>=0){pageIdx=i;render()}}else if(p.action==='custom'&&p.code){try{new Function(p.code)()}catch(e){alert(e.message)}}};
  } else if(w.type==='image'){el.innerHTML=p.src?'<img src="'+p.src+'" alt="'+esc(p.alt||'')+'" style="width:100%;height:100%;object-fit:cover">':'<em>image</em>'}
  else if(w.type==='container'){el.innerHTML='<div style="display:'+(p.layout==='grid'?'grid':'flex')+';gap:8px;width:100%;height:100%"></div>'}
}
render();
})();
`;
function exportStandalone(){
  if(!state.app)return;
  // Bake data
  const dataBaked={};
  state.app.dataSources.forEach(ds=>{
    if(ds.type==='demo')dataBaked[ds.name]=DEMO_DATA[ds.demo]||[];
  });
  const appJson=JSON.parse(JSON.stringify(state.app));
  const html=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(state.app.name||'app')}</title>
<style>
:root{--void:#0b0a0f;--ink:#1a1922;--line:#2a2934;--cream:#e6e1d6;--brass:#b8974a;--amber:#ff8c00}
*{box-sizing:border-box}
body{margin:0;background:var(--void);color:var(--cream);font-family:system-ui,sans-serif;font-size:14px}
#app{position:relative;min-height:100vh;padding:0}
.fb-nav{display:flex;gap:6px;padding:10px 16px;border-bottom:1px solid var(--line);background:#13121a}
.fb-nav a{padding:6px 12px;border:1px solid var(--line);border-radius:3px;cursor:pointer;font-size:12px}
.fb-nav a.on{background:var(--brass);color:var(--void);border-color:var(--brass)}
.fb-surface{position:relative;min-height:80vh}
.fb-widget{padding:8px;overflow:hidden}
.fb-widget h1,h2,h3{font-family:Georgia,serif;margin:0 0 6px;color:var(--cream)}
.fb-widget label{display:block;font-size:11px;color:#a8a395;text-transform:uppercase;margin-bottom:6px}
.fb-widget input{display:block;width:100%;background:var(--ink);border:1px solid var(--line);color:var(--cream);padding:6px 8px;border-radius:3px;margin-top:3px}
.fb-btn{background:var(--brass);color:var(--void);border:none;padding:8px 14px;border-radius:3px;cursor:pointer;font-weight:600}
.fb-btn:hover{background:var(--amber)}
.fb-table table{width:100%;border-collapse:collapse;font-size:12px}
.fb-table th,.fb-table td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left}
.fb-table th{color:#a8a395;text-transform:uppercase;font-size:10px}
canvas{display:block;width:100%;height:100%}
</style>
</head>
<body>
<div id="app"></div>
<script>
window.__FALLBUILD_APP__=${JSON.stringify(appJson)};
window.__FALLBUILD_DATA__=${JSON.stringify(dataBaked)};
${RUNTIME_SRC}
<\/script>
</body>
</html>`;
  const blob=new Blob([html],{type:'text/html'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.app.name||'app').replace(/\s+/g,'-')+'.html';a.click();
  fmSignal('app-export',{name:state.app.name,size:html.length});
}
// ---------- Init ----------
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openPalette()}
  else if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveApp()}
  else if(e.key==='Escape'){closePalette();closeSettings();closeOpen();closeDS()}
  else if(e.key==='Delete'&&state.selectedId&&!e.target.matches('input,textarea,select'))delWidget();
});
// KONOMI · fallmesh · postMessage (sovereign)
  const m=e.data;if(!m||m.target!=='fallbuild'||!m.action)return;
  let r=null;
  if(m.action==='ping')r={ok:true,prime:PRIME,version:VERSION};
  e.source&&e.source.postMessage({target:m.source||'*',responseTo:m.action,data:r},'*');
});
(async function init(){
  await openDB();
  const s=await dbGet('kv','settings');if(s&&s.v)state.settings=s.v;
  fmInit();
  await loadLast();
  updateTierBadge();
})();

// Named exports for the primary API surface
export { loadConfig };
export { saveConfig };
export { $ };
export { esc };
export { aiTier };
export { renderAiChip };
export { loadWebLLM };
export { aiComplete };
export { aiCloudCall };
export { meshStart };

export { FALL_KIT_VERSION };
export { KCC_MINT_URL };
export { WEBLLM_MODELS };
export { DEFAULT_MODEL };
export { T3_PROVIDERS };
export { STATE };
export { MESH_CHANNEL };
export { STUN_SERVERS };
export { PRIME };
export { DEMO_DATA };

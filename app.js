// =============================================
// GROWW MF FAQ — APP LOGIC
// Uses Claude API for natural language + local KB for facts
// =============================================

// ── CONFIG ────────────────────────────────────────────────────────
// Set your API key here OR in a .env file (for local use only)
// NEVER commit your real API key to GitHub
// For GitHub Pages: use a backend proxy (see README)
const API_KEY = ""; // ← paste your Anthropic API key here for local testing

const MODEL = "claude-sonnet-4-20250514";

// ── STATE ─────────────────────────────────────────────────────────
let isLoading = false;
const conversationHistory = [];

// ── SYSTEM PROMPT ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a factual Mutual Fund FAQ assistant for Groww's mutual fund schemes.

STRICT RULES:
1. Answer ONLY factual questions about mutual funds: expense ratio, exit load, minimum SIP, lock-in, riskometer, benchmark, how to download statements, KYC, ELSS, TER.
2. Schemes you know: Groww Large Cap Fund, Groww Flexi Cap Fund, Groww ELSS Tax Saver Fund, Groww Liquid Fund, Groww Arbitrage Fund.
3. Every answer MUST end with: [SOURCE: <url> | <label>]
4. Keep answers to ≤3 sentences. Be concise and factual.
5. If asked for opinions, recommendations, "should I buy/sell/invest", comparisons, or return projections — respond ONLY with:
   "I only share facts, not advice. For investor education, visit AMFI's knowledge centre. [SOURCE: https://www.amfiindia.com/investor-corner/knowledge-center | AMFI — Investor Knowledge Centre]"
6. If the user shares PAN, Aadhaar, account numbers, OTPs, phone, or email — respond:
   "Please don't share personal details here. I only answer factual scheme questions. [SOURCE: https://groww.in/privacy-policy | Groww — Privacy Policy]"
7. Do NOT compute or compare returns. Do NOT make performance predictions.
8. Use only these official sources: groww.in scheme pages, amfiindia.com, sebi.gov.in, camsonline.com, kfintech.com.
9. If you don't have a fact, say: "I don't have this information. Please check the official factsheet. [SOURCE: https://groww.in/mutual-funds | Groww — Mutual Funds]"
10. Be friendly but strictly factual.

FORMAT for source in every answer:
[SOURCE: <full_url> | <source label>]`;

// ── DOM HELPERS ───────────────────────────────────────────────────
const messagesEl = document.getElementById("messages");
const inputEl    = document.getElementById("queryInput");
const sendBtn    = document.getElementById("sendBtn");
const welcomeCard = document.getElementById("welcomeCard");

function now() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function hideWelcome() {
  if (welcomeCard && !welcomeCard.classList.contains("hidden")) {
    welcomeCard.style.transition = "opacity 0.3s";
    welcomeCard.style.opacity = "0";
    setTimeout(() => { welcomeCard.style.display = "none"; }, 300);
  }
}

function appendUserMsg(text) {
  const div = document.createElement("div");
  div.className = "msg-user";
  div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(div);

  const t = document.createElement("div");
  t.className = "msg-time";
  t.textContent = now();
  messagesEl.appendChild(t);
  scrollBottom();
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "typing-indicator";
  div.id = "typingIndicator";
  div.innerHTML = `
    <div class="bot-avatar">📊</div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>`;
  messagesEl.appendChild(div);
  scrollBottom();
}

function removeTyping() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

function appendBotMsg(text, sourceUrl, sourceLabel, isRefusal = false) {
  const div = document.createElement("div");
  div.className = "msg-bot";

  const sourceHtml = sourceUrl ? `
    <a class="source-tag" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M1 6H11M11 6L7 2M11 6L7 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${escapeHtml(sourceLabel || "Official Source")}
    </a>` : "";

  div.innerHTML = `
    <div class="bot-avatar">📊</div>
    <div class="bubble ${isRefusal ? "refusal" : ""}">
      <div class="bubble-text">${formatText(text)}</div>
      ${sourceHtml}
    </div>`;
  messagesEl.appendChild(div);

  const t = document.createElement("div");
  t.className = "msg-time";
  t.textContent = `${now()} · Last updated: April 2026`;
  messagesEl.appendChild(t);
  scrollBottom();
}

function scrollBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatText(s) {
  // Bold **text** → <strong>
  return escapeHtml(s).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
  inputEl.disabled = state;
}

// ── LOCAL KB LOOKUP (fast, no API) ────────────────────────────────
function tryLocalAnswer(query) {
  if (isPIIQuestion(query)) {
    return { text: PII_RESPONSE.text, source: PII_RESPONSE.source, label: PII_RESPONSE.source_label, isRefusal: true };
  }
  if (isAdviceQuestion(query)) {
    return { text: REFUSAL_RESPONSE.text, source: REFUSAL_RESPONSE.source, label: REFUSAL_RESPONSE.source_label, isRefusal: true };
  }

  const scheme = detectScheme(query);
  const intent = detectIntent(query);
  const fact   = lookupFact(scheme, intent);

  if (fact) {
    return { text: fact.value, source: fact.source, label: fact.source_label, isRefusal: false };
  }
  return null;
}

// ── CLAUDE API CALL ───────────────────────────────────────────────
async function callClaudeAPI(userQuery) {
  conversationHistory.push({ role: "user", content: userQuery });

  const body = {
    model: MODEL,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: conversationHistory.slice(-10) // last 5 turns
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const rawText = data.content.map(b => b.text || "").join("");
  conversationHistory.push({ role: "assistant", content: rawText });
  return rawText;
}

// ── PARSE API RESPONSE → text + source ───────────────────────────
function parseAPIResponse(raw) {
  // Extract [SOURCE: url | label]
  const srcMatch = raw.match(/\[SOURCE:\s*(https?:\/\/[^\s|]+)\s*\|\s*([^\]]+)\]/i);
  let source = null, label = null, text = raw;

  if (srcMatch) {
    source = srcMatch[1].trim();
    label  = srcMatch[2].trim();
    text   = raw.replace(srcMatch[0], "").trim();
  }

  // Detect refusal
  const isRefusal = /only share facts|not (investment )?advice|please don't share personal/i.test(text);
  return { text, source, label, isRefusal };
}

// ── MAIN SEND FUNCTION ────────────────────────────────────────────
async function sendQuery() {
  const query = inputEl.value.trim();
  if (!query || isLoading) return;

  hideWelcome();
  inputEl.value = "";
  inputEl.style.height = "auto";
  setLoading(true);

  appendUserMsg(query);
  showTyping();

  try {
    // 1. Try local KB first (instant, no API cost)
    const local = tryLocalAnswer(query);
    removeTyping();

    if (local) {
      appendBotMsg(local.text, local.source, local.label, local.isRefusal);
    } else if (!API_KEY) {
      // No API key → show helpful fallback
      appendBotMsg(
        "I couldn't find that in my local knowledge base. To enable full AI-powered answers, please add your Anthropic API key to assets/app.js (see README for instructions).",
        "https://groww.in/mutual-funds",
        "Groww — Mutual Funds",
        false
      );
    } else {
      // 2. Call Claude API for complex queries
      showTyping();
      const raw = await callClaudeAPI(query);
      removeTyping();
      const parsed = parseAPIResponse(raw);
      appendBotMsg(parsed.text, parsed.source, parsed.label, parsed.isRefusal);
    }
  } catch (err) {
    removeTyping();
    appendBotMsg(
      `Something went wrong: ${err.message}. Please try again or check your API key.`,
      "https://groww.in/mutual-funds",
      "Groww — Mutual Funds",
      false
    );
    console.error("Error:", err);
  }

  setLoading(false);
  inputEl.focus();
}

// ── INJECT QUERY (from example pills / sidebar tags) ──────────────
function injectQuery(text) {
  inputEl.value = text;
  autoResize(inputEl);
  inputEl.focus();
  sendQuery();
}

// ── KEYBOARD HANDLER ──────────────────────────────────────────────
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendQuery();
  }
}

// ── AUTO RESIZE TEXTAREA ──────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

// ── SCHEME SIDEBAR CLICK ──────────────────────────────────────────
document.querySelectorAll(".scheme-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".scheme-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    const scheme = item.querySelector("strong").textContent;
    injectQuery(`Tell me about ${scheme} — expense ratio, exit load, and minimum SIP`);
  });
});

// ── INIT ──────────────────────────────────────────────────────────
inputEl.focus();

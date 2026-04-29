# 📊 Groww MF FAQ Assistant

A **RAG-style Mutual Fund FAQ chatbot** that answers factual questions about Groww's mutual fund schemes — expense ratios, exit loads, minimum SIPs, ELSS lock-in, riskometers, benchmarks, and statement downloads.

Every answer includes an official source link. No investment advice is given.

---

## 🎯 Scope

**AMC:** Groww Asset Management Ltd (Groww Mutual Fund)

**Schemes covered:**
| Scheme | Category | Benchmark |
|--------|----------|-----------|
| Groww Large Cap Fund | Large Cap Equity | Nifty 100 TRI |
| Groww Flexi Cap Fund | Flexi Cap Equity | Nifty 500 TRI |
| Groww ELSS Tax Saver Fund | ELSS (Tax Saving) | Nifty 500 TRI |
| Groww Liquid Fund | Liquid | NIFTY Liquid Index TRI |
| Groww Arbitrage Fund | Arbitrage | Nifty 50 Arbitrage Index TRI |

---

## 🚀 Setup & Running Locally

### Option A — No API Key (local knowledge base only)
Works instantly with pre-loaded facts. No Claude API needed.

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/groww-mf-faq.git
cd groww-mf-faq

# 2. Open in browser (any local server works)
# Using Python:
python -m http.server 8080
# Then open: http://localhost:8080
```

### Option B — Full AI Mode (Claude API)
For natural language understanding of complex queries.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Open `assets/app.js`
3. Set your key:
   ```javascript
   const API_KEY = "sk-ant-your-key-here";
   ```
4. Run locally with a server (required for API calls)

> ⚠️ **NEVER commit your API key to GitHub.** Use the local-only knowledge base for public deployments.

---

## 🌐 Deploying to GitHub Pages

1. Push the repo to GitHub
2. Go to **Settings → Pages**
3. Source: `main` branch, `/ (root)` folder
4. Your site will be live at `https://YOUR_USERNAME.github.io/groww-mf-faq/`

> For GitHub Pages (public), use **Option A only** (no API key). The local knowledge base answers the most common questions without any backend.

---

## 📁 Project Structure

```
groww-mf-faq/
├── index.html          ← Main HTML page
├── assets/
│   ├── style.css       ← Light UI styles (Groww-inspired)
│   ├── app.js          ← Chat logic + Claude API integration
│   └── knowledge.js    ← Local fact database + intent detection
├── data/
│   ├── sources.md      ← All 21 source URLs used
│   └── sample-qa.md    ← 10 sample Q&A pairs with answers
└── README.md           ← This file
```

---

## 💡 Architecture

```
User Query
    │
    ▼
[PII Check] → Refuse if PAN/Aadhaar/OTP detected
    │
    ▼
[Advice Check] → Politely refuse if opinion/recommendation
    │
    ▼
[Intent Detection] → expense_ratio / exit_load / lock_in / etc.
    │
    ▼
[Scheme Detection] → large_cap / flexi_cap / elss / liquid / arbitrage
    │
    ▼
[Local KB Lookup] → Instant answer + source URL
    │
    ▼ (if not found locally)
[Claude API] → System-prompted for facts-only + citation format
    │
    ▼
[Response] → ≤3 sentences + official source link
```

---

## ⚙️ Key Design Decisions

| Decision | Reason |
|----------|--------|
| Local KB first | Instant answers, no API cost for common queries |
| Claude API fallback | Handles complex/natural language queries |
| Strict system prompt | Enforces facts-only, citation in every answer |
| PII filter | Security — never store/process personal data |
| Advice refusal | Compliance — no SEBI-unlicensed advice |
| Source in every answer | Transparency and verifiability |

---

## ⚠️ Known Limits

- **TER values** are approximate from scheme pages; exact figures vary monthly. Always verify with the latest factsheet.
- **NAV is not fetched** (changes daily). The tool links to the scheme page instead.
- **Performance/returns** are not shown by design (no performance claims).
- **Only 5 Groww schemes** are covered in detail. Other Groww schemes return a general response.
- **Local KB** may not have the latest fact if Groww updates scheme details. The source link always goes to the live page.
- API calls require CORS support from the proxy if used in production.

---

## 📋 Disclaimer

> This tool provides **factual information only** from public sources (AMC/SEBI/AMFI). It does **not** constitute investment advice. Past performance is not indicative of future results. Please consult a SEBI-registered investment advisor before making any investment decisions.

---

## 🔗 Official Sources Used

See [`data/sources.md`](data/sources.md) — 21 public URLs from Groww, AMFI, SEBI, CAMS, and KFintech.

---

## 🧪 Skills Demonstrated

| Skill | How |
|-------|-----|
| **W1 — Thinking Like a Model** | Intent + scheme detection; decide answer vs. refuse |
| **W2 — LLMs & Prompting** | Strict system prompt for concise, cited, facts-only answers |
| **W3 — RAG** | Local KB with source metadata; API fallback with citation enforcement |

---

*Built for the Groww MF FAQ Assistant project. No third-party blogs used as sources.*

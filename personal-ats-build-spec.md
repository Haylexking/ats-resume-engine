# Personal ATS Resume-Matcher — Build Spec

## What this tool does
A local web app where you paste (1) a job description and (2) your resume (or select a saved version), and it:
1. Parses both into structured data
2. Scores how well the resume matches the JD the way a real ATS would
3. Shows a gap report (missing keywords, weak phrasing, formatting issues)
4. Rewrites/suggests edits to specific bullets so the resume aligns with the JD without becoming keyword-stuffed nonsense
5. Lets you accept/reject each suggestion and export the updated resume

---

## Core logic (this is the part that matters — the model needs to reason like an ATS + a recruiter, not just do string matching)

### Step 1 — Parse the Job Description
Extract into structured JSON:
- `hard_skills`: tools, languages, platforms, certifications explicitly named
- `soft_skills`: things like "stakeholder management," "cross-functional collaboration"
- `responsibilities`: what the person will actually do day-to-day
- `qualifications_required` vs `qualifications_preferred` (ATS and recruiters weight these differently — required = must-match)
- `seniority_level`: inferred from title + years-of-experience language
- `keywords_exact`: exact phrases likely to be used as ATS filters (titles, tool names, acronyms — e.g. "Figma," "A/B testing," "SQL")
- `company_context`: industry, product type, team size if mentioned (useful for tone-matching, not scoring)

### Step 2 — Parse the Resume
Extract into structured JSON:
- `contact_block`
- `summary`
- `skills_section` (as listed)
- `experience[]` — each with company, title, dates, bullets[]
- `education`
- `certifications`
- Detect **implicit skills**: skills demonstrated in bullets but not listed in the skills section (this matters — ATS keyword scanners often only check certain sections, so implicit-only skills are a gap even if you "technically" have the experience)

### Step 3 — Matching & Scoring
Run three separate scoring passes, don't collapse them into one fuzzy number:

**A. Keyword/Hard-match score (what a real ATS does)**
- Exact and near-exact match (stemming/synonyms — e.g. "user research" ≈ "UX research") between `keywords_exact` from JD and anything in the resume
- Weight `qualifications_required` matches higher than `preferred`
- Output: % matched, and a list of exactly which required keywords are missing entirely

**B. Semantic/Relevance score (what a human recruiter does)**
- Use embeddings (or the LLM directly) to judge whether each `responsibility` in the JD is evidenced by at least one resume bullet — even if wording differs
- Flag responsibilities with zero supporting evidence

**C. Structure/Formatting score (ATS parseability — this is the part people forget)**
- Check for: tables, text boxes, columns, headers/footers with contact info, non-standard section headers, images, unusual fonts — all things that break real ATS parsers (Workday, Greenhouse, Taleo, etc.)
- Check standard section headers exist ("Experience" not "Where I've Worked")
- Flag if dates are formatted inconsistently or missing

### Step 4 — Recommendation Engine (tiered — this is what protects accuracy from collapsing under real-world scrutiny)
Never auto-fabricate experience. A keyword sitting in the resume with zero supporting narrative is a known red flag to trained recruiters and second-pass AI screeners — it can pass the ATS filter and still lose you the interview. Use three tiers, not a flat suggestion list:

1. **Tier 1 — Rewrite (auto-apply candidate).** Skill is already evidenced in an existing bullet, just buried or under-phrased. Safe to auto-suggest with high confidence.
2. **Tier 2 — Add bullet (requires explicit user confirmation).** JD requires this skill, it's plausible given the role/title/timeframe, but it's not explicitly stated anywhere. Tool drafts the bullet and tags it `UNVERIFIED — confirm this is true`. It must never be included in the export until the user actively confirms it.
3. **Tier 3 — Flag only, no bullet generated.** Required skill has no evidence and isn't plausible from the resume history at all. Tool states plainly "you don't meet this requirement" rather than papering over it — this is more useful than a fake match, since it also tells the user when a JD isn't a real fit or when a genuine skill investment is needed before applying.

Each suggestion should include: the gap it addresses, the specific rewrite, its tier, and a one-line "why" (which keyword/requirement this satisfies).

### Step 5 — Parseability Harness (closes the gap between "looks good" and "actually parses")
Content accuracy means nothing if the ATS ingestion step mangles it. Real ATS platforms (Workday, Greenhouse, Taleo, iCIMS) frequently lose or garble content from tables, columns, text boxes, and non-standard headers — regardless of how good the writing is. Before final export:
- Run the generated docx through a raw-extraction pass (e.g. `docx2txt`/`textract`-style plain-text pull) that approximates what a real ATS parser would ingest
- Diff the extracted text against the intended structured content — flag any section, bullet, or skill that gets lost, reordered, or garbled in extraction
- This is usually a bigger real-world accuracy loss than keyword mismatch, so treat a failed parseability diff as blocking, not cosmetic
- Optional: log pass/fail outcomes per JD application in local SQLite, so keyword-weighting can eventually calibrate against real screening outcomes rather than theoretical ATS behavior

### Step 6 — Output
- Overall match score (weighted: 50% hard-match, 35% semantic, 15% formatting)
- List of required keywords missing, and which tier (1/2/3) each recommended fix falls into
- List of accepted/rejected/confirmed edits (interactive)
- Parseability harness result (pass/fail + diff of anything lost in extraction)
- Final exportable resume (plain text + formatted docx)

---

## Data architecture — master truth layer + industry lenses
Given you work across Fintech, EdTech, GovTech, HealthTech, Web3, AI Platforms, E-commerce, and TravelTech, don't maintain six separate resumes — they'll drift and contradict each other over time. Instead:

- **Master data layer**: one canonical, maximally-detailed structured record (JSON) of every role, every bullet, every skill, every metric you've ever produced — no formatting or trimming, just raw ground truth. This is the single source every generated resume traces back to.
- **Industry lens layer**: per target industry, the tool selects which master bullets to surface, reweights which skills to foreground, and adjusts vocabulary to the industry's register (e.g. "compliance-aware flows" for Fintech/GovTech, "learner engagement patterns" for EdTech) — but every word still traces back to the master layer, so nothing gets invented per-lens.
- Every JD-specific resume is a **render** of the master data through a lens, not an independently maintained document. This also compounds your advantage over time: each JD run that clarifies a metric or tests a phrasing improves the master layer for every future application, instead of starting fresh each time.

## Model Strategy: single model per run, explicit switch on quota
Don't cross-check across models — that's overkill for personal use and risks inconsistent reasoning within one JD run. Instead:
- Pick ONE model per JD run, set via an env var or a UI toggle (e.g. "Primary: gemini-3.7-flash").
- The entire run — JD parse, resume/lens render, match & score, tiered gap analysis, suggestions — uses that same model, so reasoning stays consistent within a run.
- If a call fails mid-run with a quota/rate-limit error, do NOT silently auto-swap. Surface it clearly ("Gemini quota hit — retry this run with DeepSeek/NVIDIA NIM?") so you always know which model actually produced a given result, and can compare model quality across runs later if you want to.
- The tiered gap-analysis (Tier 1 rewrite / Tier 2 confirm / Tier 3 flag) stays exactly as specified above — it's a confidence framework for suggestions, independent of which model or how many models you use. Keep it regardless of model choice.

> Add a `MODEL_PRIMARY` env var (default `gemini-3.7-flash`) that all four pipeline calls (JD parse, lens render, match/score, gap analysis + suggestions) read from — one variable controls the whole run. Wrap each Gemini API call in a try/catch that specifically detects quota/rate-limit errors (HTTP 429). On that error, stop the run and show a UI prompt: "Gemini quota exceeded — retry this run with [DeepSeek / NVIDIA NIM]?" with buttons for each fallback option. If I click one, rerun the ENTIRE current step (not just the failed call) using that model instead, and tag the stored result with which model produced it. Never auto-retry with a different model without my explicit click.

## Getting NVIDIA NIM and Groq API keys

**NVIDIA NIM (build.nvidia.com)**
1. Go to build.nvidia.com and sign in with a Google/GitHub/email account — no card required.
2. Pick any model from the catalog (e.g. deepseek-ai/deepseek-r1, qwen, meta/llama) — they all share one API key.
3. Click "Get API Key" on the model page — it generates a key starting with `nvapi-`.
4. Endpoint is OpenAI-compatible: base URL `https://integrate.api.nvidia.com/v1`, so it works with the standard OpenAI SDK — just swap the base URL and key, model name matches the catalog page (e.g. `deepseek-ai/deepseek-r1`).
5. Store as `NVIDIA_API_KEY` in your `.env`.

**Groq (console.groq.com)**
1. Go to console.groq.com and sign up (Google/GitHub/email) — no card required.
2. Go to "API Keys" in the left sidebar, click "Create API Key," name it, copy it immediately (shown only once).
3. Endpoint is also OpenAI-compatible: base URL `https://api.groq.com/openai/v1`.
4. Available free models include Llama and Kimi variants — check console.groq.com/docs/models for the current list, since Groq rotates which open models it hosts.
5. Store as `GROQ_API_KEY` in your `.env`.

Both integrate the same way structurally (OpenAI-compatible endpoint + key), so wiring them into the model-switcher above is just adding two more entries to a provider config object — same request/response shape as Gemini's OpenAI-compatible mode.

## Tech stack (for local hosting)

- **Frontend**: Next.js (App Router) + Tailwind — simple two-panel UI (JD input | Resume input) with a results panel below
- **Backend**: Next.js API routes or a small FastAPI service if you want Python for parsing
- **Resume parsing**: `mammoth` (docx→text) or `pdf-parse` (pdf→text) — keep it simple, plain text extraction is fine since the LLM does the structuring
- **LLM calls**: Anthropic API (Claude) via `@anthropic-ai/sdk` — use it for parsing, scoring reasoning, and rewrite generation. Structured outputs: force JSON-only responses for the parsing/scoring steps (see structured-output note below), free text for rewrite suggestions
- **Storage**: local SQLite (or even just local JSON files) to save resume versions and past JD runs — no need for a full DB for personal use
- **No auth needed** — single user, local only

## Data flow
```
[Master data layer: JSON] ──> [Industry lens select] ──┐
[JD text input] ──> Parse (LLM call #1, JSON out) ──────┼──> Match & Score (LLM call #2) ──> Gap Report (tiered) ──> Suggestion Engine (LLM call #3) ──> UI diff view (Tier 1 auto / Tier 2 confirm / Tier 3 flag) ──> Parseability Harness (docx→raw text diff) ──> Export
```

## What to tell Claude Code / Antigravity when building it

> Build a local Next.js app. Maintain a master data layer as structured JSON — every role, bullet, skill, and metric I've ever had, with no formatting or trimming. The app has two inputs: a job description (text) and a target industry selector (Fintech, EdTech, GovTech, HealthTech, Web3, AI Platforms, E-commerce, TravelTech). On submit: (1) parse the JD into structured JSON — hard_skills, soft_skills, responsibilities, qualifications_required, qualifications_preferred, keywords_exact — force JSON-only output; (2) select and reweight bullets from the master data layer through the chosen industry lens, adjusting vocabulary to that industry's register without inventing content; (3) compare the JD JSON against the lensed resume data and produce a match report — hard-match % on keywords_exact (required weighted higher than preferred), a semantic coverage check per responsibility, and a formatting/ATS-parseability check; (4) generate a tiered gap report: Tier 1 = rewrite of an already-evidenced bullet (auto-suggest), Tier 2 = a plausible new bullet for a required skill with no direct evidence, clearly tagged "UNVERIFIED — confirm this is true" and excluded from export until I confirm it, Tier 3 = flag only, state plainly that the requirement isn't met, no bullet generated. Render results in a diff-style UI where I can accept, reject, or confirm each suggestion. Before final export, run the generated docx through a raw text-extraction pass and diff it against the intended content to catch anything a real ATS parser (Workday/Greenhouse/Taleo-style) would lose from tables, columns, or non-standard formatting — block export on a failed diff. Store the master data layer, past lensed resume versions, JD runs, and pass/fail screening outcomes in local SQLite. No auth, single user, runs on localhost only.

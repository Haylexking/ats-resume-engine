# Personal ATS Resume Matcher & Optimization Engine

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)

An intelligent, multi-model AI resume matching and optimization engine designed to evaluate candidate resumes against target job descriptions with recruiter-grade precision. 

Unlike generic resume scanners that encourage robotic keyword stuffing, this engine enforces **authentic experience preservation**, **3-pass ATS evaluation**, **3-tier recommendation guards**, and **unconstrained executive recruiter strategy**.

---

## 🌟 Key Features

### 1. 🎯 3-Pass ATS Matching & Composite Scoring
- **Pass 1: Hard-Match Keywords (50% Weight)** — Normalizes exact technical tools, software, methodologies, and certifications using tokenized frequency analysis.
- **Pass 2: Semantic Narrative Coverage (35% Weight)** — Evaluates duty-level narrative alignment across core JD responsibilities, confirming whether candidate bullet points genuinely demonstrate required capabilities.
- **Pass 3: ATS Structure & Parseability (15% Weight)** — Inspects heading hierarchy, contact block completeness, and formatting hazards (tables, multiple columns, invisible glyphs).

### 2. ⚡ 3-Tier Recruiter Recommendation Engine
- **Tier 1 — Authentic Bullet Rewrites (Evidenced Skills)**:
  - Rephrases existing experience to bridge terminology gaps while strictly preserving real candidate metrics (e.g. *35% order volume growth*, *40% engagement lift*).
- **Tier 2 — Plausible Additions (Unverified)**:
  - Suggests high-probability adjacent skills with strict candidate verification guards before exporting.
- **Tier 3 — Genuine Gap Flags (No Bullet)**:
  - Flags mandatory unmet requirements transparently without ever fabricating fake experience.

### 3. 🧠 Live Model Reasoning & Chain-of-Thought Tracker
- Real-time progress monitoring showing live elapsed seconds, active model identifiers, and stage-by-stage reasoning logs.
- Post-run expandable **Chain-of-Thought Log** detailing how the AI extracted JD syntax, weighed penalties, and formulated rewrites.

### 4. 💡 Executive Recruiter Strategy & Candid Observations
Unconstrained executive commentary providing:
- **Target Role Positioning Strategy**: How to frame background and seniority to stand out.
- **High-Impact Interview Talking Points**: Specific bullet metrics to bring up in hiring manager interviews.
- **Portfolio & Artifact Focus**: Case studies, design systems, or technical repositories to spotlight.
- **Strategic Questions & Preemptive Angles**: Tough recruiter questions and how to answer them.

### 5. 🏢 8 Dynamic Industry Lenses
Automatically reweights and prioritizes resume accomplishment bullets based on target sector:
- 💳 **Fintech** (Security, compliance, high-volume transactions, KYC)
- 🛒 **E-commerce** (Conversion rates, checkout flows, order volume, A/B testing)
- 🤖 **AI Platforms** (RAG, agentic workflows, prompt engineering, latency)
- 🏥 **HealthTech** (HIPAA, EHR, patient engagement, medical workflows)
- 🏛️ **GovTech** (WCAG accessibility, public sector compliance, multi-stakeholder portals)
- 🌐 **Web3** (Decentralized protocols, smart contracts, wallet onboarding)
- 🎓 **EdTech** (Curriculum design, user retention, learning analytics)
- ✈️ **TravelTech** (Booking systems, localization, global payment gateways)

### 6. 🔬 ATS Parseability Harness & Multi-Format Exporter
- **Round-Trip Fidelity Check**: Compiles the customized resume into an ATS-compliant Word (`.docx`) file, extracts raw text via `mammoth`, and diffs it against master data to ensure zero lost metrics or garbled sections.
- **Export Options**: 1-click export to Word (`.docx`) and Plain Text (`.txt`).

---

## 🤖 Supported AI Providers & Models

Seamlessly switch between any frontier model or provider with zero code changes:

- **NVIDIA NIM (82+ Models)**: Moonshot Kimi K3, Meta Llama 3.2 (11B / 90B), DeepSeek R1 / V3, Google Gemma 4, MiniMax M3, Mistral AI, Nemotron.
- **Groq (14+ Models)**: Qwen 3.8 27B, Llama 3.3 70B Versatile, Compound Mini.
- **Google Gemini**: Gemini 2.5 Flash, Gemini 1.5 Pro.
- **OpenAI**: GPT-4o, GPT-4o Mini, o1, o3-mini.
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku.

---

## 🏗️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Document Processing**:
  - `docx` — ATS-compliant Word document generation
  - `mammoth` — DOCX raw text extraction & diff testing
  - `pdfjs-dist` — Multi-column PDF parsing & stream normalization
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ or Node.js 20+
- pnpm (recommended) or npm

### 1. Clone the Repository
```bash
git clone https://github.com/Haylexking/ats-resume-engine.git
cd ats-resume-engine
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your API keys to `.env.local` (or configure them directly in the in-app AI Settings modal):
```env
# AI Provider Keys
NVIDIA_API_KEY=your_nvidia_api_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if port 3000 is occupied) in your browser.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── analyze/          # Core 3-pass analysis & reasoning pipeline
│   │   ├── export/           # DOCX generation & Parseability Harness
│   │   ├── master-resume/    # Master data persistence
│   │   ├── parse-document/   # PDF & DOCX text extraction
│   │   └── settings/         # AI configuration & API keys
│   ├── globals.css           # Custom dark theme styles
│   ├── layout.tsx            # App root layout
│   └── page.tsx              # Main studio interface
├── components/
│   ├── AISettingsModal.tsx   # Model selection & API key manager
│   ├── Header.tsx            # Navigation header & tab switcher
│   ├── HistoryTrackerView.tsx# Application history & screening outcomes
│   ├── JDInputPanel.tsx      # Dual input studio & live progress tracker
│   ├── MasterResumeEditor.tsx# Structured master data editor
│   ├── ModelReasoningTrace.tsx# Expandable model chain-of-thought log
│   ├── ParseabilityHarnessModal.tsx # Text extraction & diff inspector
│   ├── RecruiterInsightsCard.tsx # Unconstrained executive recruiter strategy
│   ├── ScoreGauges.tsx       # 3-pass circular score gauges & breakdown
│   └── TieredSuggestionsDiff.tsx # Interactive Tier 1-3 recommendation diff
├── lib/
│   ├── db/                   # File-based persistence layer
│   ├── engine/
│   │   ├── atsScorer.ts      # 3-pass ATS matching algorithms
│   │   ├── docxExporter.ts   # Bullet replacement & DOCX builder
│   │   ├── industryLens.ts   # 8-sector dynamic bullet reweighting
│   │   ├── jdParser.ts       # LLM-powered job description extraction
│   │   ├── llmClient.ts      # Multi-provider client with JSON repair
│   │   ├── parseabilityHarness.ts # ATS extraction diff validator
│   │   ├── pdfExtractor.ts   # Text extraction from PDF uploads
│   │   ├── recommendationEngine.ts # 3-tier recruiter suggestions
│   │   └── types.ts          # Core TypeScript schemas
│   └── seed/
│       └── masterData.ts     # Default candidate profile
└── prompts/                  # Versioned prompt templates
    ├── jd-parse-v1.md
    ├── semantic-scoring-v1.md
    └── tiered-recommendations-v1.md
```

---

## 🛡️ License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Alexander Akerele**
- **Role**: Product Designer | UI/UX Design · Product Systems · Design Strategy
- **LinkedIn**: [linkedin.com/in/alexander-akerele-663612141](https://linkedin.com/in/alexander-akerele-663612141)
- **Portfolio**: [linktr.ee/thebiochemist_ux](https://linktr.ee/thebiochemist_ux)

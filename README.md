# Δ Driftt — Your Watchlist, Versioned
### Groww Code 2026 Engineering Build Challenge

> **Traditional market watchlists show you prices.** When you return after 3 days away, they show you numbers that changed — but require you to remember what each stock was doing when you left, mentally calculate percentages, check volume across tabs, and guess whether your original investment hypothesis still holds.
>
> **Driftt is an append-only, materiality-ranked event stream for your watchlist.** When you open the app, it greets you with: *"Good morning — 6 meaningful changes occurred since you last checked."* It diffs current market state against statistical baselines, detects dual-source price disagreements, enforces your stated investment theses, and filters out market noise.

---

## ⚡ Quick Start (Zero-Friction One Command)

### 1. Launch Services
Ensure Docker is running, then execute:

```bash
# Build and launch all services
docker compose up --build
```

> **Automated Orchestration**: On startup, the container automatically waits for PostgreSQL & Redis health checks, runs database migrations, and initializes the multi-day demo universe (Sep 1–Sep 5). Zero manual steps required!

### 2. Open the Application
Navigate to **`http://localhost:3000`** in your browser.
* **Instant Evaluator Access**: Click the prominent **"One-Click Demo Login"** button — zero typing or signup needed!
* Alternatively sign in using:
  * **Email**: `demo@driftt.app`
  * **Password**: `demo123`

---

## 🏛️ Architecture Overview

Changelog operates on a stream-processing paradigm built on top of relational guarantees:

```
                  ┌──────────────────────┐   ┌──────────────────────┐
                  │ Yahoo Finance API v8 │   │   NSE Public API     │
                  └──────────┬───────────┘   └──────────┬───────────┘
                             │                          │
                             ▼                          ▼
                  ┌─────────────────────────────────────────────────┐
                  │       Dual-Source Reconciler (60s tick)         │
                  │   - Calculates divergence between sources       │
                  │   - Surfaces conflict when div > 0.5%           │
                  └────────────────────────┬────────────────────────┘
                                           │
                                           ▼
                  ┌─────────────────────────────────────────────────┐
                  │             Welford Baseline Engine             │
                  │   - O(1) running mean & variance (σ)            │
                  │   - In-database M2 accumulator (no full history)│
                  └────────────────────────┬────────────────────────┘
                                           │
                                           ▼
                  ┌─────────────────────────────────────────────────┐
                  │       Materiality Scorer & Thesis Gate          │
                  │   - Composite score 0–100                       │
                  │   - Price Z-score (0-50 pts)                    │
                  │   - Volume Surge (0-30 pts, EOD)                │
                  │   - Thesis Breach Floor (FORCED ≥ 90 pts)       │
                  │   - Quality penalties (-10 stale, -5 conflict)  │
                  └────────────────────────┬────────────────────────┘
                                           │
                                           ▼
                  ┌─────────────────────────────────────────────────┐
                  │      PostgreSQL Append-Only Event Log           │
                  │   - Unique day/symbol index (anti-storm dedup)  │
                  │   - Full audit trail of price & conflict values │
                  └────────────────────────┬────────────────────────┘
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
              ┌─────────────────────┐             ┌─────────────────────┐
              │  Seen Cursor State  │             │   Timeline Replay   │
              │ "Since you left..." │             │ Chronological scrub │
              └─────────────────────┘             └─────────────────────┘
```

---

## 🧮 The Materiality Engine: Design & Formulas

### 1. Welford's Online Algorithm ($O(1)$ Space & Time)
Rather than storing hundreds of thousands of historical intraday ticks or computing rolling window standard deviations via costly batch database queries, Changelog uses **Welford's Algorithm**:

$$\bar{x}_n = \bar{x}_{n-1} + \frac{x_n - \bar{x}_{n-1}}{n}$$

$$M_{2,n} = M_{2,n-1} + (x_n - \bar{x}_{n-1})(x_n - \bar{x}_n)$$

$$s^2 = \frac{M_{2,n}}{n-1} \quad (\text{sample variance with Bessel's correction})$$

Every snapshot update executes in $O(1)$ time by persisting only `session_count`, `mean_return`, and `m2_return` in the `baselines` table.

### 2. Composite Materiality Score ($0 - 100$)
Every candidate market change is scored against empirical standard deviations:

$$\text{Price Component} = \min\left(\frac{|Z_{\text{price}}|}{5.0}, 1.0\right) \times 50$$

$$\text{Volume Component} = \max\left(0, \min\left(\frac{V_{\text{ratio}} - 1.0}{3.0}, 1.0\right) \times 30\right)$$

$$\text{Raw Score} = \text{Price} + \text{Volume} + \text{Thesis Bonus} - \text{Quality Penalties}$$

### 3. The Thesis Breach Guarantee (Floor at $\ge 90$)
When a user adds a stock to their watchlist, they can register their qualitative hypothesis:
* **Price Level**: e.g., *"Notify me if RELIANCE drops below ₹1,400"*
* **Percentage Move**: e.g., *"Notify me if IRCTC moves $\pm 4\%$ from ₹920"*

When this threshold is breached, the engine **floors the Materiality Score at $90.0$** before applying the 100 ceiling. This guarantees that thesis-crossed events **will never be hidden** by Calm ($60+$) or Balanced ($35+$) filters.

### 4. Dual-Source Disagreement Handling (System Correctness)
When Yahoo Finance and NSE quotes diverge by more than $0.5\%$:
1. The reconciler selects the fresher timestamp as the primary reference price.
2. It flags `source_conflict = True` on the snapshot.
3. It subtracts a $5\text{-point}$ quality penalty from the score to reflect data uncertainty.
4. **It writes both `yahoo_price` and `nse_price` directly onto the event record**, allowing the UI to render an explicit conflict badge with exact numbers rather than hiding the discrepancies.

---

## ⚖️ Trade-off Log

| Decision | Chosen Approach | Alternatives Rejected | Rationale |
|---|---|---|---|
| **Task Scheduling** | **APScheduler (in-process)** | Celery + RabbitMQ / Kafka | In a 72-hour competition and evaluation environment, introducing a separate message broker adds failure modes, memory overhead, and setup friction. APScheduler runs within the FastAPI process lifecycle, guaranteeing zero external dependencies. |
| **Statistical Baseline** | **Welford Online Accumulator** | Batch 30-day SQL queries | Querying 30 days of 1-minute ticks on every poll cycle wastes CPU and I/O. Welford computes exact mean and variance in $O(1)$ time using 3 numeric columns. |
| **Noise Filtering** | **Statistical Z-Scores** | ML / LLM Predictive Classifiers | Financial tick prediction with small ML models produces hallucinations and unpredictable false positive rates. Statistical z-scores are 100% deterministic, explainable, and mathematically defensible. |
| **Intraday Volume Anomaly** | **Volume Scored EOD-Only** | Intraday partial volume vs full-day median | Yahoo's intraday volume is cumulative. Comparing 10:00 AM cumulative volume against a full-day median causes false calm, while 3:20 PM volume causes false surges. Volume scoring is deferred to market close, while raw volume ratio is recorded for inspection. |
| **Event Cooldown** | **PostgreSQL Functional Unique Index** | In-memory Redis locks | Redis keys can be lost on restarts. A unique index on `(symbol, event_type, DATE(occurred_at AT TIME ZONE 'Asia/Kolkata'))` guarantees at the database storage engine layer that a single sustained 4-hour move cannot flood 240 duplicate events into the feed. |
| **Demo Resilience** | **Deterministic Fallback Seed Pipeline** | Live-only web scraping | If Yahoo Finance rate-limits an evaluator or NSE returns a 403 bot block during judging, the system seamlessly falls back to pre-recorded JSON baselines without crashing or showing blank screens. |

---

## 🧪 Engine Test Suite

The core algorithmic engine is isolated in pure functions with zero database dependencies, covered by 33 automated tests:

```bash
# Run all tests locally
cd backend
pytest tests/ -v
```

### Verified Engine Test Coverage:
* `test_sources_agree`: Verifies consensus pricing when divergence $< 0.5\%$.
* `test_sources_disagree_prefers_fresher`: Verifies timestamp-based source selection.
* `test_thesis_crossed_floors_at_90`: Asserts that thesis breach always scores $\ge 90$.
* `test_thesis_always_clears_all_sensitivity_bands`: Proves that thesis alerts show on Calm ($60+$), Balanced ($35+$), and Chattery ($15+$).
* `test_known_sequence`: Mathematically validates Welford sample standard deviation against Bessel's correction.
* `test_intraday_volume_zeroed`: Verifies that intraday ticks do not fire volume anomalies before EOD.

---

## 🖥️ Key User Interface Capabilities

1. **"Since You Left" Catchup Framing**: Summarizes unseen events since your personal cursor timestamp, with a one-click *"Mark all seen"* action.
2. **Noise Filter Sensitivity Knob**: Toggle between **Calm** ($\ge 60$), **Balanced** ($\ge 35$), and **Chattery** ($\ge 15$) to adapt to your current attention budget.
3. **Inspect Materiality Math**: Click any event card to view the exact breakdown of Z-score, volume anomaly ratio, thesis bonus, and quality penalties.
4. **Dual-Source Conflict Badge**: Visual warning displaying NSE price vs Yahoo price when third-party data sources diverge.
5. **Timeline Replay Scrubber**: Drag through past sequence numbers to visually reconstruct how market events evolved throughout the trading day.
6. **Market Hours Banner**: Live indicator showing NSE market session state (Asia/Kolkata) and ingestion scheduler status.

---

## 🛠️ Tech Stack Details

* **Backend**: Python 3.11, FastAPI, SQLAlchemy 2 (Async), Asyncpg, Alembic, Pydantic v2, APScheduler, HTTPX, Python-Jose.
* **Frontend**: React 18, Vite, Tailwind CSS, Axios, Lucide Icons.
* **Storage & Caching**: PostgreSQL 15, Redis 7.
* **Containerization**: Docker Compose (multi-stage builds with Nginx reverse proxy).

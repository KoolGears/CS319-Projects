# Agentic AI Shopping Recommender (Laptops)

**Course:** CS319 · **Due:** 11/29

An agentic AI shopping assistant that helps users find and compare **laptops**. Users describe what they want in plain English, for example: *"I'm a college student looking for a laptop under $800 with at least 16 GB RAM, good battery life, and low weight."* The agent reads the request and calls Python tools to search, filter, rank and compare products from a local catalog. It then recommends products and explains each pick using only catalog data.

---

## 1. Project Goals

The system must:

1. **Interpret** natural-language requests and separate **hard constraints** (price ceiling, minimum RAM) from **soft preferences** (lightweight, long battery life).
2. **Search** the product catalog and **enforce hard constraints** with program logic, not the LLM.
3. **Rank and compare** qualifying products using an explicit algorithm computed in Python.
4. **Recommend at least 3 products** when available, showing name, price, relevant specs, reasons and tradeoffs. It must never invent specifications.
5. **Handle conflicts.** If nothing meets every hard constraint, explain why and ask the user before relaxing any of them.
6. **Support follow-ups** such as *"Which has the best battery life?"* or *"Increase my budget to $1,000"* without the user repeating earlier context.
7. **Log tool calls** to produce real execution traces for the report and demo.

---

## 2. Dataset (Section 3.1)

**Domain:** Laptops

**Primary dataset:** [Laptop Specs, by Aditya Mishra (Kaggle)](https://www.kaggle.com/datasets/adityamishraml/laptops)

| Property | Value |
|---|---|
| File | `laptops.csv` (~170 kB) |
| Rows | ~1,272 laptops (requirement is ≥ 100) |
| Columns | 23, already partly cleaned. Includes company, type, screen size, touchscreen/IPS flags, resolution, CPU, RAM, storage, GPU, OS, weight and price |
| License | Open Database License (ODbL), so it is permission-compliant |

**Reference / raw source:** [Laptop Price, by Muhammet Varlı (Kaggle)](https://www.kaggle.com/datasets/muhammetvarl/laptop-price), with 1,303 rows and 12 columns: `Company, Product, TypeName, Inches, ScreenResolution, Cpu, Ram, Memory, Gpu, OpSys, Weight, Price_euros`. The primary dataset is a cleaned version of this one. Use this one instead if product **model names** (`Product`) are needed for display.

### Known data gaps and planned cleaning (document in report)
- **Battery life is not in either dataset.** The spec says *"never invent unavailable specifications"*, so **`battery_hours` is kept as a column but every value is missing (`NaN`)**. This means:
  - `filter_products` cannot satisfy a hard battery constraint (e.g. "at least 10 h"). The agent explains that battery data is unavailable and asks whether to drop or relax that constraint.
  - `rank_products` skips battery as a scoring feature. Its weight is redistributed across the other soft preferences, and the explanation says so.
  - Recommendation cards show battery life as "Not available" and never estimate it.
  - This is the basis for the *missing data* evaluation test case (Section 6).
- **Price is in euros.** Convert to USD with a fixed, documented exchange rate.
- **Units.** Parse `"8GB"` → `8`, `"1.37kg"` → lb, and `"128GB SSD + 1TB HDD"` → total GB plus storage type.
- **Bad values.** Drop or fix screen sizes that cannot be real (> 20 in) and any duplicate rows.
- **IDs.** Assign product IDs such as `L0001`.
- **Output.** Save the cleaned catalog to `data/processed/laptops_clean.csv`, plus a SQLite database if used.

Download the dataset (requires a Kaggle account and API token):

```bash
kaggle datasets download -d adityamishraml/laptops -p project/data/raw --unzip
```

---

## 3. Required Tools & Technologies

| Component | Choice | Notes |
|---|---|---|
| Language | Python 3.11+ | |
| Web interface | **Streamlit** (or Flask) | Chat UI, recommendation cards, comparison table |
| Agent framework | Claude Agent SDK / Anthropic Python SDK tool use (or OpenAI Agents SDK, Google ADK) | Must perform **real** tool calls |
| LLM | API-accessible model (e.g. Claude Sonnet) | API key stored in `.env`, never committed |
| Data | pandas + CSV and/or SQLite | |
| Algorithms | NumPy, scikit-learn | Weighted feature scoring + cosine-similarity baseline |
| Testing | pytest | ≥ 10 evaluation test cases |
| Config | python-dotenv | Loads `ANTHROPIC_API_KEY` (or equivalent) |
| Dataset access | Kaggle CLI (`pip install kaggle`) | |

Expected `requirements.txt` contents: `streamlit`, `anthropic` (or `claude-agent-sdk`), `pandas`, `numpy`, `scikit-learn`, `python-dotenv`, `pytest`, `kaggle`.

---

## 4. Architecture

```
User (Streamlit UI)
      │  natural-language request / follow-up
      ▼
AI Agent (LLM + system prompt + conversation state)
      │  selects & calls tools (logged to traces/)
      ▼
Python Tools (deterministic)
  ├─ search_products(category, keywords)
  ├─ filter_products(criteria)          ← enforces hard constraints
  ├─ rank_products(product_ids, prefs)  ← weighted scoring in NumPy
  └─ compare_products(product_ids)      ← side-by-side attributes
      │
      ▼
Product Database (cleaned CSV / SQLite)
```

**Conversation state** holds the current hard constraints, soft preferences and the last candidate list. Follow-ups update this state instead of starting over.

### Recommendation algorithm (Section 3.4)
1. **Rule-based filtering:** remove every product that breaks a hard constraint.
2. **Weighted feature scoring:** min-max normalize each available attribute (price inverted, weight inverted, RAM, storage and so on; features that are all `NaN`, such as battery, are excluded), then compute `score = Σ wᵢ · xᵢ`, where the weights `wᵢ` come from the user's soft preferences.
3. **Baseline comparison:** a cosine-similarity recommender between the user's preference vector and the product feature vectors, for the evaluation section.

All numbers are computed in Python. The LLM only explains results that the tools return.

---

## 5. Planned Folder Structure (not yet created)

```
project/
├── README.md
├── requirements.txt
├── .env.example              # ANTHROPIC_API_KEY=...
├── data/
│   ├── raw/                  # original Kaggle CSV (git-ignored)
│   └── processed/            # laptops_clean.csv / laptops.db
├── notebooks/
│   └── data_cleaning.ipynb   # documented cleaning steps
├── src/
│   ├── data_loader.py        # load/clean catalog, unit parsing
│   ├── tools.py              # search / filter / rank / compare
│   ├── recommender.py        # weighted scoring + cosine baseline
│   ├── agent.py              # LLM agent, tool schemas, state, trace logging
│   └── app.py                # Streamlit UI
├── tests/
│   ├── test_tools.py         # unit tests for deterministic tools
│   └── test_agent_eval.py    # ≥10 end-to-end evaluation cases
├── traces/                   # JSON logs of real tool executions
└── report/
    └── report.md             # final project report
```

---

## 6. Evaluation Plan (Section 3.8)

There will be at least 10 test cases, covering:

- a simple request
- multiple constraints
- budget limits
- conflicting or impossible constraints
- missing data (e.g. "good battery life" or "at least 10 h battery", where battery is `NaN` for every product)
- follow-up questions and budget changes
- multi-tool workflows

Report on these metrics:
- **Constraint satisfaction:** % of recommendations that meet every hard constraint.
- **Recommendation relevance:** how well the results fit the soft preferences (weighted scoring vs. the cosine baseline).
- **Tool-call correctness:** whether the agent picked the right tools in the right order.
- **Explanation quality:** whether every claim is backed by catalog data.
- **Reliability:** how the agent behaves with incomplete data and empty search results.

---

## 7. Milestones

| # | Milestone | Evidence |
|---|---|---|
| 1 | Proposal | Domain, audience, dataset, tool plan, algorithm, tech stack, roles |
| 2 | Data + recommender | Clean catalog, search/filter, basic ranking, initial UI |
| 3 | Agent integration | Working agent, tool calls, multistep workflow, follow-ups, traces |
| 4 | Final + evaluation | Complete app, tests, report, live demo |

---

## 8. Final Deliverables

- **Source code:** complete implementation, dataset, `requirements.txt`, and reproducible setup and run steps in this README.
- **Report:** introduction, architecture, dataset and preprocessing, agent design, tools, algorithm, interface and sample interactions, testing results, limitations, member contributions, and an **AI-assistance disclosure**. It must include **at least 2 full agent traces**.
- **Demo / presentation:** every member presents their own contribution.

### Grading Weights
| Category | Points |
|---|---|
| Dataset and database functionality | 10 |
| Interface and conversational interaction | 10 |
| Agent design and actual tool calling | 25 |
| Recommendation method and personalization | 15 |
| Testing and evaluation | 15 |
| Presentation and live demonstration | 15 |
| Report and documentation | 10 |

---

## 9. Setup & Run (to be finalized)

```bash
pip install -r requirements.txt
```

```bash
kaggle datasets download -d adityamishraml/laptops -p data/raw --unzip
```

```bash
python src/data_loader.py
```

```bash
streamlit run src/app.py
```

```bash
pytest tests/
```

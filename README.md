![Auto Analyst Logo](/auto-analyst-backend/images/auto-analyst%20logo.png)

# Auto-Analyst — Your Open-Source AI Data Scientist

![Auto-Analyst Platform](/auto-analyst-backend/images/Auto-analyst-poster.png)

**By [Firebird Technologies](https://www.firebird-technologies.com)**

Auto-Analyst is a fully open-sourced, modular AI system designed to automate data science workflows — from data cleaning and statistical analysis to machine learning and visualization.

You can try it live at: [https://www.autoanalyst.ai/chat](https://www.autoanalyst.ai/chat)

---

## 🚀 Highlights

* ✅ **Open Source**: Licensed under a highly MIT permissive license.
* 🔄 **LLM Agnostic**: Compatible with any LLM API – OpenAI, Anthropic, Deepseek (groq), etc.
* 💸 **Bring Your Own API Key**: No vendor lock-in; use your own keys, pay only what you use.
* 🖥️ **User-Centric UI**: Built with data scientists in mind.
* 🛡️ **Reliable Outputs**: Guardrails for robust and interpretable responses.
* ⚙️ **Modular Agent Architecture**: Add or customize agents using [DSPy](https://github.com/stanfordnlp/dspy).

---

## Live App

Start analyzing here:
👉 **[https://www.autoanalyst.ai/chat](https://www.autoanalyst.ai/chat)**

---

##  How It Works

### 🪜 Step-by-Step Walkthrough

#### 1️⃣ Upload Your Dataset

* Click the 📎 icon near the chat input.
* Upload `.csv` or `.xlsx` files. More connectors (APIs, SQL, etc.) available upon request.

#### 2️⃣ Describe Your Dataset

* Enter a short text description of what your dataset is about.
* Auto-Analyst will generate a cleaned, structured metadata summary optimized for LLM workflows.
* ✍️ Tip: Rename generic columns like `var_1` to `price`, `category`, etc., for better analysis.

#### 3️⃣ Ask a Question

Use either:

* **@agent\_name** to specify which agent to use (e.g. `@preprocessing_agent`)
* Or **no agent tag** to let the **planner** route your query automatically.

---

##  Built-in Agents

| Agent                          | Description                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `@preprocessing_agent`         | Cleans data using `pandas` and `numpy`. Fixes types, handles nulls, computes aggregates.             |
| `@statistical_analytics_agent` | Performs regression, correlation, ANOVA, and other statistical tests with `statsmodels`.             |
| `@sk_learn_agent`              | Trains machine learning models like Random Forest, KMeans, Logistic Regression using `scikit-learn`. |
| `@data_viz_agent`              | Generates visualizations using `plotly`. Includes a retriever to pick optimal chart formats.         |

🌟 Modular and extensible! You can add custom agents for:

* Marketing
* Quantitative Finance
* Web APIs (Slack, Notion, etc.)

---

## 💬 Planner Mode

Want to delegate the query routing?

Just type your question without specifying an agent. The **planner** will:

* Select the right agent(s)
* Generate plan instructions
* Coordinate inter-agent workflows
* Collect and display results (including plots & summaries)

---

## 🧑‍💻 Developer Features

### 📁 Modular Agent System (DSPy)

Agents are implemented as `dspy.Signature` classes. Example:

```python
class google_ads_analyzer_agent(dspy.Signature):
    goal = dspy.InputField(desc="User goal")
    dataset = dspy.InputField(desc="DataFrame")
    plan_instructions = dspy.InputField(desc="Instructions")
    code = dspy.OutputField(desc="Python code")
    summary = dspy.OutputField(desc="Analysis summary")
```

Add your own agent in minutes.

### 🔌 Built-in Dataset Connectors

* **Ads**: Google Ads, Meta, LinkedIn Ads
* **CRM**: HubSpot, Salesforce
* **SQL**: Postgres, MySQL, Oracle, DuckDB

Want more? Submit a request: [Contact Us](https://www.autoanalyst.ai/contact)

---

## 🖼️ UI Feature Overview

| Feature                               | Description                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 💬 Chat Interface                     | Ask questions and receive answers like a regular chat.                                          |
| 🧑‍💻 Code Editor                     | Inspect and edit generated code. Features include: AI-assisted edits, auto-fix for broken code. |
| 📊 Analytics Dashboard *(Enterprise)* | Monitor usage, set limits, allocate credits, enforce roles & permissions.                       |

---

## 🛠 Backend Highlights

* 🔧 Agent orchestration via DSPy
* 🧠 Model-agnostic LLM support
* 📈 Built-in chart formatter for best-guess visualization types
* 📂 Multi-agent workflows powered by centralized planner
* 🔄 Daily scheduled reports & auto-regeneration (enterprise-ready)

---

## 📅 Roadmap

### 🔜 Short-Term Goals

* [ ] Deep Analysis Mode (LLM equivalent of longform research)
* [ ] Multi-CSV / multi-sheet Excel analysis
* [ ] User-defined analytics agents via UI
* [ ] Improved code-editing and auto-debugging

### 🔭 Long-Term Vision

* **Usability-First**: Optimize UX through iteration and user feedback
* **Community-Driven**: Shaped by the global analyst community (follow us on [Substack](https://firebirdtech.substack.com), LinkedIn)
* **Open Collaboration**: Build and share new agents, retrievers, and datasets

---

## 🧩 Contributing

We welcome contributions! You can:

* Add new agents
* Suggest UX improvements
* Contribute templates or datasets
* Submit bug reports or pull requests

📬 For collaboration or enterprise inquiries: [https://www.autoanalyst.ai/contact](https://www.autoanalyst.ai/contact)

---

## 📄 License

Auto-Analyst is released under the **MIT License** — feel free to use, remix, and build on it.


## 🐦 Follow Us

* 🌐 [Website](https://www.autoanalyst.ai)
* 📰 [Substack](https://firebirdtech.substack.com)
* 💼 [LinkedIn](https://www.linkedin.com/company/firebird-technologies-singapore)

---

Built with ❤️ by Firebird Technologies
*AI. Tech. Fire.*


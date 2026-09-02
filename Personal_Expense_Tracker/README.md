# Personal Expense Tracker

A modern, browser-based expense tracker built with HTML, CSS, and vanilla JavaScript. The tracker uses Chart.js for spending visualizations and saves expenses in the browser's local storage.

## How to run

No installation or build step is required.

### Option 1: Open directly

1. Open the `index.html` file in a modern web browser.
2. The tracker will load automatically.

### Option 2: Use a local development server

From the `Personal_Expense_Tracker` folder, run a local server such as:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

Using a local server is recommended for the most consistent browser behavior.

## How to use the tracker

### Add an expense

1. Select **Add expense**.
2. Enter a description, amount, date, and category.
3. Select **Save expense**.

### Edit or delete an expense

1. Find the expense in the transaction list.
2. Select the three-dot actions button.
3. Choose **Edit** or **Delete**.

### Search, filter, and sort

- Use the search box to search descriptions or categories.
- Use the category dropdown to show a specific category.
- Use the sort dropdown to sort by newest date, oldest date, highest amount, or lowest amount.

## Charts and time ranges

The top summary cards and chart visualizations update to match the selected chart timeframe:

- **1Y**: Previous calendar year from the same date
- **6M**: Previous six months from the same date
- **1M**: Previous month from the same date
- **1W**: Rolling seven days
- **1D**: A selected individual day

The **1D** view includes a date picker. Choose any date to view that day's expenses in a category-separated bar chart. The category Breakdown chart and summary cards update to match the selected day.

For the other time ranges, the overview uses a spending-over-time line chart, while the Breakdown chart shows category totals for that range.

## Data storage

Expenses are saved in the browser's `localStorage`, so they remain available when the tracker is reopened in the same browser and on the same device.

Clearing browser site data will remove saved expenses. The tracker does not currently sync data between browsers or devices.

## Project files

- `index.html` - Page structure and form markup
- `styles.css` - Layout, responsive design, and visual styling
- `script.js` - Expense management, filtering, summaries, charts, and local storage
- `README.md` - Usage and setup instructions

## AI use in development

AI tools were used as development assistance for this project. Their use was limited to supporting the implementation process; the finished application was reviewed, edited, tested, and organized for this project by the developer.

AI assistance included:

- Brainstorming the tracker layout, visual hierarchy, and user experience
- Suggesting HTML structure, CSS styling patterns, and vanilla JavaScript approaches
- Helping implement expense creation, editing, deletion, filtering, sorting, local storage, summary cards, and Chart.js visualizations
- Assisting with accessible labels, responsive layout ideas, inline SVG category icons, and documentation wording
- Reviewing code for errors and helping identify targeted browser checks

The developer made the final decisions about the application's requirements, design, code structure, feature behavior, and content. AI-generated suggestions were not copied into the project without review. Code was adapted to fit this application's needs, checked for consistency with the rest of the project, and validated through browser testing and editor diagnostics.

The project does not intentionally reproduce source code, text, branding, or other protected material from an existing application. Visual and functional decisions were created for this tracker. Third-party resources are identified where applicable: Chart.js is loaded from jsDelivr, Google Fonts are loaded from Google Fonts, and the project uses standard web platform APIs such as `localStorage`. Any future third-party code or assets should be reviewed for its license and credited in this document.

AI assistance does not replace the developer's responsibility for verifying correctness, originality, accessibility, security, licensing, and compliance with course or institutional policies. Users of this project should disclose AI assistance when required by their instructor, organization, or submission guidelines.

const INCOME_STORAGE_KEY = "ledgerly-income";
const EXPENSE_STORAGE_KEY = "ledgerly-expenses";
let incomes = loadEntries(INCOME_STORAGE_KEY);
let comparisonChart;

const $ = (id) => document.getElementById(id);
const currency = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
const formatDate = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));

function loadEntries(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn(`Unable to load saved entries from ${key}.`, error);
    return [];
  }
}

function saveIncomes() {
  localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(incomes));
}

function renderList() {
  const list = $("incomeList");
  const sorted = [...incomes].sort((a, b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.map((income) => `<div class="table-row" role="row">
    <div class="description-cell"><span class="category-icon income-icon">↗</span><span class="description-text" title="${escapeHtml(income.description)}">${escapeHtml(income.description)}</span></div>
    <span class="category-pill income-pill">${escapeHtml(income.source)}</span><span class="date-cell">${formatDate(income.date)}</span><span class="amount-cell">${currency(income.amount)}</span>
    <div class="row-actions"><button class="more-button" type="button" aria-label="Actions for ${escapeHtml(income.description)}" data-id="${income.id}">•••</button></div>
  </div>`).join("");
  $("emptyState").hidden = sorted.length > 0;
  $("visibleCount").textContent = `${sorted.length} ${sorted.length === 1 ? "item" : "items"}`;
  list.querySelectorAll(".more-button").forEach((button) => button.addEventListener("click", () => showActions(button)));
}

function showActions(button) {
  document.querySelector(".action-menu")?.remove();
  const menu = document.createElement("div");
  menu.className = "action-menu";
  menu.innerHTML = '<button type="button">Edit</button><button type="button" class="delete-action">Delete</button>';
  button.parentElement.appendChild(menu);
  menu.firstElementChild.addEventListener("click", () => openModal(incomes.find((item) => item.id === button.dataset.id)));
  menu.lastElementChild.addEventListener("click", () => { incomes = incomes.filter((item) => item.id !== button.dataset.id); saveIncomes(); render(); });
  setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
}

function render() {
  const expenses = loadEntries(EXPENSE_STORAGE_KEY);
  const incomeTotal = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const net = incomeTotal - expenseTotal;
  $("totalIncome").textContent = currency(incomeTotal);
  $("totalExpenses").textContent = currency(expenseTotal);
  $("netCashFlow").textContent = currency(net);
  $("netCashFlow").style.color = net < 0 ? "#b25e5e" : "";
  $("incomeCount").textContent = `${incomes.length} ${incomes.length === 1 ? "income entry" : "income entries"}`;
  $("cashFlowHeading").textContent = !incomes.length && !expenses.length ? "Add income to get started" : net >= 0 ? "You are cash-flow positive" : "Expenses are ahead of income";
  $("cashFlowMessage").textContent = incomes.length || expenses.length ? `${currency(Math.abs(net))} ${net >= 0 ? "remaining after expenses." : "more in expenses than income."}` : "Your net cash flow will appear here once you record income.";
  if (typeof Chart !== "undefined") {
    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart($("comparisonChart"), { type: "bar", data: { labels: ["Cash flow"], datasets: [{ label: "Income", data: [incomeTotal], backgroundColor: "#9bc4a5", borderRadius: 6 }, { label: "Expenses", data: [expenseTotal], backgroundColor: "#d88d76", borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#77807A", boxWidth: 10, font: { size: 10 } } } }, scales: { y: { beginAtZero: true, ticks: { color: "#9AA39C", callback: (value) => `$${value}` }, grid: { color: "#EEF1ED" } }, x: { grid: { display: false } } } } });
  }
  renderList();
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
function openModal(income = null) {
  $("incomeForm").reset(); $("incomeId").value = income ? income.id : ""; $("date").value = income ? income.date : new Date().toISOString().slice(0, 10);
  $("modalTitle").textContent = income ? "Edit income" : "Add income"; $("modalEyebrow").textContent = income ? "UPDATE INCOME" : "NEW INCOME";
  if (income) { $("description").value = income.description; $("amount").value = income.amount; $("source").value = income.source; }
  $("incomeModal").hidden = false; $("description").focus();
}
function closeModal() { $("incomeModal").hidden = true; }

$("todayLabel").textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
$("addIncomeButton").addEventListener("click", () => openModal());
$("emptyAddButton").addEventListener("click", () => openModal());
$("closeModalButton").addEventListener("click", closeModal);
$("cancelModalButton").addEventListener("click", closeModal);
$("incomeModal").addEventListener("click", (event) => { if (event.target === $("incomeModal")) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("incomeModal").hidden) closeModal(); });
$("incomeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("incomeId").value || crypto.randomUUID();
  const income = { id, description: $("description").value.trim(), amount: Number($("amount").value), source: $("source").value, date: $("date").value };
  const index = incomes.findIndex((item) => item.id === id);
  if (index >= 0) incomes[index] = income; else incomes.push(income);
  saveIncomes(); closeModal(); render();
});
render();

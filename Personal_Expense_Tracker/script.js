const STORAGE_KEY = "ledgerly-expenses";
const categoryColors = {
  Food: { color: "#D88D76", background: "#F9E8E1", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v7M4 3v4a2 2 0 0 0 4 0V3M6 10v11M16 3v18M16 3c2 2 3 4 3 7h-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  Transport: { color: "#7FA6B8", background: "#E6F0F4", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 11 1.5-5h11L19 11M4 11h16v7H4zM7 18v2M17 18v2M7 14h.01M17 14h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  Home: { color: "#A99A7E", background: "#F0ECE3", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7M5 10v10h14V10M9 20v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  Shopping: { color: "#B394C6", background: "#F1E9F5", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8ZM9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  Entertainment: { color: "#D19E64", background: "#F8EDDD", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 21h8M12 18v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
  Health: { color: "#79A98B", background: "#E6F1E9", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20S4 15.5 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  Other: { color: "#98A19A", background: "#EEF1EE", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v.01M12 11v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' }
};

let expenses = loadExpenses();
let spendingChart;
let categoryChart;
let chartRange = "1W";
let chartDate = new Date().toISOString().slice(0, 10);

const $ = (id) => document.getElementById(id);
const currency = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
const formatDate = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));

function loadExpenses() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn("Unable to load saved expenses.", error);
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function getFilteredExpenses() {
  const query = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const sort = $("sortSelect").value;
  const visible = expenses.filter((expense) => {
    const matchesQuery = !query || `${expense.description} ${expense.category}`.toLowerCase().includes(query);
    return matchesQuery && (category === "all" || expense.category === category);
  });
  return visible.sort((a, b) => {
    if (sort.startsWith("date")) return sort.endsWith("desc") ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    return sort.endsWith("desc") ? b.amount - a.amount : a.amount - b.amount;
  });
}

function renderList() {
  const list = $("expenseList");
  const visible = getFilteredExpenses();
  list.innerHTML = visible.map((expense) => {
    const style = categoryColors[expense.category] || categoryColors.Other;
    return `<div class="table-row" role="row">
      <div class="description-cell"><span class="category-icon" style="background:${style.background};color:${style.color}">${style.icon}</span><span class="description-text" title="${escapeHtml(expense.description)}">${escapeHtml(expense.description)}</span></div>
      <span class="category-pill" style="background:${style.background};color:${style.color}">${escapeHtml(expense.category)}</span>
      <span class="date-cell">${formatDate(expense.date)}</span>
      <span class="amount-cell">${currency(expense.amount)}</span>
      <div class="row-actions"><button class="more-button" type="button" aria-label="Actions for ${escapeHtml(expense.description)}" data-action="toggle" data-id="${expense.id}">•••</button></div>
    </div>`;
  }).join("");
  $("emptyState").hidden = visible.length > 0;
  $("visibleCount").textContent = `${visible.length} ${visible.length === 1 ? "item" : "items"}`;
  list.querySelectorAll("[data-action='toggle']").forEach((button) => button.addEventListener("click", () => showActions(button)));
}

function showActions(button) {
  const existing = document.querySelector(".action-menu");
  if (existing) existing.remove();
  const menu = document.createElement("div");
  menu.className = "action-menu";
  menu.innerHTML = `<button type="button" data-menu="edit">Edit</button><button type="button" class="delete-action" data-menu="delete">Delete</button>`;
  button.parentElement.appendChild(menu);
  menu.querySelector("[data-menu='edit']").addEventListener("click", () => openModal(expenses.find((item) => item.id === button.dataset.id)));
  menu.querySelector("[data-menu='delete']").addEventListener("click", () => {
    expenses = expenses.filter((item) => item.id !== button.dataset.id);
    saveExpenses(); render();
  });
  setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
}

function renderSummary() {
  const summaryExpenses = getChartExpenses();
  const total = summaryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = summaryExpenses.reduce((totals, expense) => ({ ...totals, [expense.category]: (totals[expense.category] || 0) + expense.amount }), {});
  const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  $("totalSpent").textContent = currency(total);
  $("averageSpent").textContent = currency(summaryExpenses.length ? total / summaryExpenses.length : 0);
  $("expenseCount").textContent = `${summaryExpenses.length} ${summaryExpenses.length === 1 ? "expense" : "expenses"} in timeframe`;
  $("topCategory").textContent = top ? top[0] : "—";
  $("topCategoryAmount").textContent = top ? `${currency(top[1])} total` : "Add an expense to begin";
  renderCharts();
}

function getChartExpenses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const cutoff = new Date(today);
  if (chartRange === "1D") {
    return expenses.filter((expense) => expense.date === chartDate || (!chartDate && expense.date === todayKey));
  } else if (chartRange === "1M") {
    cutoff.setMonth(today.getMonth() - 1);
  } else if (chartRange === "6M") {
    cutoff.setMonth(today.getMonth() - 6);
  } else if (chartRange === "1Y") {
    cutoff.setFullYear(today.getFullYear() - 1);
  } else {
    cutoff.setDate(today.getDate() - 6);
  }
  return expenses.filter((expense) => new Date(`${expense.date}T00:00:00`) >= cutoff);
}

function renderCharts() {
  if (typeof Chart === "undefined") return;
  const chartExpenses = getChartExpenses();
  const sorted = [...chartExpenses].sort((a, b) => a.date.localeCompare(b.date));
  const dateTotals = sorted.reduce((totals, expense) => ({ ...totals, [expense.date]: (totals[expense.date] || 0) + expense.amount }), {});
  const labels = Object.keys(dateTotals);
  const categoryTotals = chartExpenses.reduce((totals, expense) => ({ ...totals, [expense.category]: (totals[expense.category] || 0) + expense.amount }), {});
  if (spendingChart) spendingChart.destroy();
  const isDayView = chartRange === "1D";
  const chartData = isDayView
    ? { labels: ["Today"], datasets: Object.keys(categoryTotals).map((category) => ({ label: category, data: [categoryTotals[category]], backgroundColor: categoryColors[category].color, borderRadius: 5, barPercentage: .7 })) }
    : { labels: labels.map(formatDate), datasets: [{ data: labels.map((date) => dateTotals[date]), borderColor: "#73917B", backgroundColor: "rgba(190, 216, 197, .33)", fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: "#73917B" }] };
  spendingChart = new Chart($("spendingChart"), { type: isDayView ? "bar" : "line", data: chartData, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: isDayView, position: "bottom", labels: { color: "#77807A", boxWidth: 10, font: { size: 10 } } } }, scales: { x: { stacked: false, grid: { display: false }, ticks: { color: "#9AA39C", font: { size: 10 }, maxTicksLimit: 5 } }, y: { beginAtZero: true, grid: { color: "#EEF1ED" }, ticks: { color: "#9AA39C", font: { size: 10 }, callback: (value) => `$${value}` } } } } });
  const categories = Object.keys(categoryTotals);
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart($("categoryChart"), { type: "doughnut", data: { labels: categories, datasets: [{ data: categories.map((category) => categoryTotals[category]), backgroundColor: categories.map((category) => categoryColors[category].color), borderWidth: 0 }] }, options: { cutout: "72%", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  $("categoryLegend").innerHTML = categories.length ? categories.map((category) => `<div class="legend-item"><span class="legend-name"><i class="legend-dot" style="background:${categoryColors[category].color}"></i>${category}</span><span class="legend-value">${currency(categoryTotals[category])}</span></div>`).join("") : `<span class="card-note">No category data yet</span>`;
}

function render() { renderSummary(); renderList(); }

function openModal(expense = null) {
  $("expenseForm").reset();
  $("expenseId").value = expense ? expense.id : "";
  $("date").value = expense ? expense.date : new Date().toISOString().slice(0, 10);
  $("modalTitle").textContent = expense ? "Edit expense" : "Add expense";
  $("modalEyebrow").textContent = expense ? "UPDATE TRANSACTION" : "NEW TRANSACTION";
  if (expense) { $("description").value = expense.description; $("amount").value = expense.amount; $("category").value = expense.category; }
  $("expenseModal").hidden = false;
  $("description").focus();
}

function closeModal() { $("expenseModal").hidden = true; }

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

$("todayLabel").textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
$("addExpenseButton").addEventListener("click", () => openModal());
$("emptyAddButton").addEventListener("click", () => openModal());
$("closeModalButton").addEventListener("click", closeModal);
$("cancelModalButton").addEventListener("click", closeModal);
$("expenseModal").addEventListener("click", (event) => { if (event.target === $("expenseModal")) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("expenseModal").hidden) closeModal(); });
["searchInput", "categoryFilter", "sortSelect"].forEach((id) => $(id).addEventListener("input", renderList));
document.querySelectorAll(".chart-filter").forEach((button) => button.addEventListener("click", () => {
  chartRange = button.dataset.range;
  document.querySelectorAll(".chart-filter").forEach((filter) => filter.classList.toggle("active", filter === button));
  $("chartDatePicker").hidden = chartRange !== "1D";
  renderSummary();
}));
$("chartDate").value = chartDate;
$("chartDatePicker").hidden = chartRange !== "1D";
$("chartDate").addEventListener("change", (event) => {
  chartDate = event.target.value;
  renderSummary();
});
$("expenseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("expenseId").value || crypto.randomUUID();
  const expense = { id, description: $("description").value.trim(), amount: Number($("amount").value), category: $("category").value, date: $("date").value };
  const index = expenses.findIndex((item) => item.id === id);
  if (index >= 0) expenses[index] = expense; else expenses.push(expense);
  saveExpenses(); closeModal(); render();
});
render();

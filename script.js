"use strict";

const STORAGE_KEYS = {
  transactions: "student-expense-tracker.transactions.v1",
  budget: "student-expense-tracker.budget.v1"
};
const DEFAULT_BUDGET = 2000000;
const INITIAL_BALANCE = 350000;
const CATEGORIES = [
  { name: "Food & Drinks", icon: "utensils", color: "food", budget: 700000 },
  { name: "Transportation", icon: "bus", color: "transport", budget: 300000 },
  { name: "Education", icon: "book-open", color: "education", budget: 400000 },
  { name: "Entertainment", icon: "clapperboard", color: "entertainment", budget: 250000 },
  { name: "Personal Needs", icon: "shopping-bag", color: "personal", budget: 350000 },
  { name: "Income", icon: "wallet", color: "income", budget: 0 }
];
const CATEGORY_ICONS = Object.fromEntries(CATEGORIES.map((category) => [category.name, category.icon]));
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
// Memilih elemen HTML menggunakan selector CSS.
const $ = (selector) => document.querySelector(selector);
const today = new Date();
// Mengubah tanggal menjadi format YYYY-MM-DD sesuai input tanggal HTML.
const toISODate = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};
let expenseChart = null;
let toastTimer = null;
// Menghasilkan tanggal contoh dengan jarak hari tertentu dari hari ini.
const shiftDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

// Membuat data transaksi contoh agar dashboard langsung terisi saat pertama dibuka.
function createStarterTransactions() {
  return [
    { id: "sample-1", name: "Uang saku bulanan", category: "Income", type: "income", amount: 1500000, date: shiftDate(-1) },
    { id: "sample-2", name: "Makan siang kampus", category: "Food & Drinks", type: "expense", amount: 28000, date: shiftDate(0) },
    { id: "sample-3", name: "Kopi sebelum kelas", category: "Food & Drinks", type: "expense", amount: 18000, date: shiftDate(-1) },
    { id: "sample-4", name: "Ojek ke kampus", category: "Transportation", type: "expense", amount: 22000, date: shiftDate(-2) },
    { id: "sample-5", name: "Fotokopi materi kuliah", category: "Education", type: "expense", amount: 15000, date: shiftDate(-3) },
    { id: "sample-6", name: "Paket internet", category: "Personal Needs", type: "expense", amount: 85000, date: shiftDate(-4) },
    { id: "sample-7", name: "Nonton bareng teman", category: "Entertainment", type: "expense", amount: 50000, date: shiftDate(-5) },
    { id: "sample-8", name: "Beasiswa kampus", category: "Income", type: "income", amount: 750000, date: shiftDate(-8) },
    { id: "sample-9", name: "Buku referensi", category: "Education", type: "expense", amount: 95000, date: shiftDate(-10) },
    { id: "sample-10", name: "Sarapan roti & susu", category: "Food & Drinks", type: "expense", amount: 24000, date: shiftDate(-12) },
    { id: "sample-11", name: "Bus kota", category: "Transportation", type: "expense", amount: 10000, date: shiftDate(-15) },
    { id: "sample-12", name: "Alat tulis", category: "Education", type: "expense", amount: 32000, date: shiftDate(-18) }
  ];
}

// Membaca dan memeriksa data transaksi yang tersimpan di localStorage.
function readTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.transactions);
    if (saved === null) {
      const starter = createStarterTransactions();
      localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(starter));
      return starter;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved transactions must be a list.");
    return parsed.filter((item) =>
      item && typeof item.id === "string" && typeof item.name === "string" &&
      Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
      (item.type === "income" || item.type === "expense") &&
      typeof item.category === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    ).map((item) => ({ ...item, amount: Number(item.amount) }));
  } catch (error) {
    console.error("Could not read saved transactions.", error);
    showToast("Saved transactions could not be loaded.");
    return createStarterTransactions();
  }
}

// Membaca anggaran bulanan dari localStorage atau memakai nilai awal.
function readBudget() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.budget);
    if (saved === null) {
      localStorage.setItem(STORAGE_KEYS.budget, String(DEFAULT_BUDGET));
      return DEFAULT_BUDGET;
    }
    const budget = Number(saved);
    if (!Number.isFinite(budget) || budget <= 0) throw new Error("Saved budget must be greater than zero.");
    return budget;
  } catch (error) {
    console.error("Could not read saved budget.", error);
    showToast("Saved budget could not be loaded.");
    return DEFAULT_BUDGET;
  }
}

let transactions = readTransactions();
let monthlyBudget = readBudget();
const dateFormatter = new Intl.DateTimeFormat("en-ID", { day: "numeric", month: "short", year: "numeric" });

// Menampilkan pesan singkat di bagian bawah layar.
function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

// Menyimpan daftar transaksi ke localStorage.
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error("Could not save transactions.", error);
    showToast("Could not save changes. Check your browser storage.");
    return false;
  }
}

// Menyimpan anggaran bulanan ke localStorage.
function saveBudget() {
  try {
    localStorage.setItem(STORAGE_KEYS.budget, String(monthlyBudget));
    return true;
  } catch (error) {
    console.error("Could not save budget.", error);
    showToast("Could not save your budget. Check your browser storage.");
    return false;
  }
}

// Mengubah tanggal transaksi agar mudah dibaca.
function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateString : dateFormatter.format(date);
}

// Memeriksa apakah tanggal termasuk bulan dan tahun saat ini.
function isCurrentMonth(dateString) {
  return dateString.slice(0, 7) === toISODate(today).slice(0, 7);
}

// Memeriksa apakah tanggal transaksi sesuai rentang waktu yang dipilih.
function isInSelectedPeriod(dateString) {
  const period = $("#periodFilter").value;
  if (period === "all") return true;
  if (period === "month") return isCurrentMonth(dateString);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);
  const date = new Date(`${dateString}T00:00:00`);
  return date >= cutoff && date <= new Date(`${toISODate(today)}T23:59:59`);
}

// Menjumlahkan pengeluaran pada bulan ini untuk perhitungan anggaran.
function getCurrentMonthExpenses() {
  return transactions
    .filter((item) => item.type === "expense" && isCurrentMonth(item.date))
    .reduce((total, item) => total + item.amount, 0);
}

// Menghitung ulang saldo, pemasukan, pengeluaran, dan indikator anggaran.
function updateSummary() {
  const periodTransactions = transactions.filter((item) => isInSelectedPeriod(item.date));
  const income = periodTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = periodTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const allIncome = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const allExpenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const monthExpenses = getCurrentMonthExpenses();
  const balance = INITIAL_BALANCE + allIncome - allExpenses;
  const remaining = monthlyBudget - monthExpenses;
  const usagePercent = Math.min(100, (monthExpenses / monthlyBudget) * 100);

  $("#totalBalance").textContent = rupiah.format(balance);
  $("#totalIncome").textContent = rupiah.format(income);
  $("#totalExpenses").textContent = rupiah.format(expenses);
  $("#monthlyBudget").textContent = rupiah.format(monthlyBudget);
  $("#budgetSummaryFoot").textContent = `${rupiah.format(Math.max(0, remaining))} left`;
  $("#miniBudgetProgress").style.width = `${usagePercent}%`;
  const selectedPeriod = $("#periodFilter").value;
  const periodLabel = selectedPeriod === "all" ? "Across all records" : selectedPeriod === "7days" ? "For the last 7 days" : "For this month";
  $("#incomeFoot").textContent = periodLabel;
  $("#expenseFoot").textContent = periodLabel;

  $("#budgetSpent").textContent = rupiah.format(monthExpenses);
  $("#budgetLimit").textContent = rupiah.format(monthlyBudget);
  $("#budgetPercent").textContent = `${Math.round((monthExpenses / monthlyBudget) * 100)}% used`;
  $("#budgetRemaining").textContent = remaining >= 0 ? `${rupiah.format(remaining)} remaining` : `${rupiah.format(Math.abs(remaining))} over budget`;
  const progress = $("#budgetProgress");
  progress.style.width = `${usagePercent}%`;
  progress.classList.toggle("warning", usagePercent >= 75 && usagePercent < 100);
  progress.classList.toggle("over", usagePercent >= 100);
  const message = $("#budgetMessage");
  if (usagePercent >= 100) {
    message.textContent = "You’ve reached your budget. Review your spending to get back on track.";
  } else if (usagePercent >= 75) {
    message.textContent = "You’re getting close to your limit. Keep an eye on the little things.";
  } else {
    message.textContent = "You’re doing great. Keep it up!";
  }
}

// Memilih transaksi yang cocok dengan periode, pencarian, kategori, dan jenis.
function getVisibleTransactions() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("id-ID");
  const category = $("#categoryFilter").value;
  const type = $("#typeFilter").value;
  return transactions
    .filter((item) => isInSelectedPeriod(item.date))
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => type === "all" || item.type === type)
    .filter((item) => !query || `${item.name} ${item.category} ${item.type}`.toLocaleLowerCase("id-ID").includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

// Menggambar ulang tabel transaksi berdasarkan hasil pencarian dan filter.
function renderTransactions() {
  const rows = $("#transactionRows");
  const visible = getVisibleTransactions();
  const iconFor = (item) => CATEGORY_ICONS[item.category] || (item.type === "income" ? "wallet" : "receipt");
  rows.innerHTML = visible.map((item) => `
    <tr>
      <td class="transaction-name-cell"><span class="transaction-icon ${item.type}"><i data-lucide="${iconFor(item)}"></i></span>${escapeHTML(item.name)}</td>
      <td>${escapeHTML(item.category)}</td>
      <td>${formatDate(item.date)}</td>
      <td><span class="type-pill ${item.type}">${item.type === "income" ? "Income" : "Expense"}</span></td>
      <td class="amount-cell ${item.type}">${item.type === "income" ? "+" : "−"}${rupiah.format(item.amount)}</td>
      <td><button class="delete-button" type="button" data-delete-id="${escapeHTML(item.id)}" aria-label="Delete ${escapeHTML(item.name)}"><i data-lucide="trash-2"></i></button></td>
    </tr>
  `).join("");
  $("#emptyState").classList.toggle("hidden", visible.length > 0);
  $("#transactionCount").textContent = `Showing ${visible.length} transaction${visible.length === 1 ? "" : "s"}`;
  renderIcons();
}

// Mengamankan teks sebelum dimasukkan ke dalam HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Menghitung dan menampilkan pengeluaran untuk setiap kategori bulan ini.
function renderCategories() {
  const monthExpenses = transactions.filter((item) => item.type === "expense" && isCurrentMonth(item.date));
  const total = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  $("#categoryTotal").textContent = rupiah.format(total);
  $("#categoryList").innerHTML = CATEGORIES.filter((category) => category.name !== "Income").map((category) => {
    const amount = monthExpenses.filter((item) => item.category === category.name).reduce((sum, item) => sum + item.amount, 0);
    const percent = category.budget ? Math.round((amount / category.budget) * 100) : 0;
    const progress = Math.min(100, percent);
    return `
      <div class="category-item">
        <div class="category-item-top">
          <span class="category-name"><span class="category-icon"><i data-lucide="${category.icon}"></i></span>${category.name}</span>
          <span class="category-amount">${rupiah.format(amount)}</span>
        </div>
        <div class="category-meter">
          <div class="progress-track"><span style="width:${progress}%"></span></div>
          <span class="category-percent">${percent}%</span>
        </div>
      </div>`;
  }).join("");
  renderIcons();
}

// Membuat grafik batang pengeluaran untuk tujuh hari terakhir dengan Chart.js.
function renderChart() {
  const canvas = $("#expenseChart");
  if (!canvas || typeof Chart === "undefined") return;
  const labels = [];
  const values = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const isoDate = toISODate(date);
    labels.push(new Intl.DateTimeFormat("en", { weekday: "short" }).format(date));
    values.push(transactions
      .filter((item) => item.type === "expense" && item.date === isoDate)
      .reduce((sum, item) => sum + item.amount, 0));
  }
  if (expenseChart) expenseChart.destroy();
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 190);
  gradient.addColorStop(0, "rgba(56, 189, 248, .9)");
  gradient.addColorStop(1, "rgba(56, 189, 248, .58)");
  expenseChart = new Chart(context, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: gradient, hoverBackgroundColor: "#0ea5e9", borderRadius: 6, borderSkipped: false, maxBarThickness: 25 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: "#17344e",
          titleFont: { family: "DM Sans", size: 10, weight: "600" },
          bodyFont: { family: "DM Sans", size: 10 },
          padding: 10,
          callbacks: { label: (context) => rupiah.format(context.parsed.y) }
        }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: "#9aa9b6", font: { family: "DM Sans", size: 9 } } },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(228, 237, 243, .75)", drawTicks: false },
          border: { display: false },
          ticks: {
            color: "#a1afbb",
            padding: 9,
            maxTicksLimit: 4,
            font: { family: "DM Sans", size: 8 },
            callback: (value) => value >= 1000000 ? `${value / 1000000} jt` : value >= 1000 ? `${value / 1000} rb` : value
          }
        }
      }
    }
  });
}

// Mengisi pilihan kategori pada filter tabel dan formulir transaksi.
function populateCategoryOptions() {
  const expenseCategories = CATEGORIES.filter((category) => category.name !== "Income").map((category) => category.name);
  $("#categoryFilter").insertAdjacentHTML("beforeend", expenseCategories.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join(""));
  updateTransactionCategoryOptions();
}

// Menyesuaikan kategori formulir: pemasukan atau kategori pengeluaran.
function updateTransactionCategoryOptions() {
  const type = $("#transactionType").value;
  const categories = type === "income" ? ["Income"] : CATEGORIES.filter((category) => category.name !== "Income").map((category) => category.name);
  const categorySelect = $("#transactionCategory");
  categorySelect.innerHTML = categories.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join("");
}

// Mengubah atribut ikon Lucide di HTML menjadi gambar ikon.
function renderIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// Memperbarui seluruh bagian dashboard setelah data berubah.
function refreshDashboard() {
  updateSummary();
  renderTransactions();
  renderCategories();
  renderChart();
}

// Membuka formulir untuk menambahkan transaksi baru.
function openTransactionModal() {
  $("#transactionModal").classList.remove("hidden");
  $("#transactionDate").value = toISODate(new Date());
  $("#formError").classList.add("hidden");
  document.body.classList.add("modal-open");
  window.setTimeout(() => $("#transactionName").focus(), 30);
}

// Menutup formulir transaksi dan mengosongkan isinya.
function closeTransactionModal() {
  $("#transactionModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  $("#transactionForm").reset();
  $("#formError").classList.add("hidden");
}

// Membuka formulir untuk mengubah batas anggaran bulanan.
function openBudgetModal() {
  $("#budgetInput").value = String(monthlyBudget);
  $("#budgetError").classList.add("hidden");
  $("#budgetModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  window.setTimeout(() => $("#budgetInput").focus(), 30);
}

// Menutup formulir anggaran bulanan.
function closeBudgetModal() {
  $("#budgetModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

// Memvalidasi formulir, menyimpan transaksi baru, lalu memperbarui dashboard.
function handleAddTransaction(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "").trim();
  const amount = Number(form.get("amount"));
  const category = String(form.get("category") || "");
  const type = String(form.get("type") || "");
  const date = String(form.get("date") || "");
  const error = $("#formError");
  if (!name || !Number.isFinite(amount) || amount <= 0 || !category || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["income", "expense"].includes(type)) {
    error.textContent = "Please complete all fields and enter an amount greater than zero.";
    error.classList.remove("hidden");
    return;
  }
  const transaction = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, amount, category, type, date };
  transactions.unshift(transaction);
  if (!saveTransactions()) {
    transactions = transactions.filter((item) => item.id !== transaction.id);
    return;
  }
  closeTransactionModal();
  refreshDashboard();
  showToast("Transaction added successfully.");
}

// Meminta konfirmasi sebelum menghapus transaksi dan menyimpan perubahan.
function handleDeleteTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;
  if (!window.confirm(`Delete "${transaction.name}"? This cannot be undone.`)) return;
  const previous = transactions;
  transactions = transactions.filter((item) => item.id !== id);
  if (!saveTransactions()) {
    transactions = previous;
    return;
  }
  refreshDashboard();
  showToast("Transaction deleted.");
}

// Memvalidasi lalu menyimpan anggaran bulanan yang baru.
function handleSaveBudget(event) {
  event.preventDefault();
  const amount = Number($("#budgetInput").value);
  if (!Number.isFinite(amount) || amount <= 0) {
    $("#budgetError").textContent = "Enter a monthly budget greater than zero.";
    $("#budgetError").classList.remove("hidden");
    return;
  }
  const previous = monthlyBudget;
  monthlyBudget = amount;
  if (!saveBudget()) {
    monthlyBudget = previous;
    return;
  }
  closeBudgetModal();
  refreshDashboard();
  showToast("Monthly budget updated.");
}

// Menandai menu sidebar yang sesuai dengan bagian yang dipilih.
function setActiveSection(section) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.section === section);
  });
}

// Menutup sidebar mobile dan memperbarui status tombol menu.
function closeMobileNavigation() {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.remove("visible");
  $("#menuButton").setAttribute("aria-expanded", "false");
}

// Menghubungkan tombol, formulir, filter, navigasi, dan shortcut keyboard.
function attachEvents() {
  $("#todayDate").textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(today).toUpperCase();
  $("#addTransactionButton").addEventListener("click", openTransactionModal);
  $("#addTransactionButtonSecondary").addEventListener("click", openTransactionModal);
  $("#closeModalButton").addEventListener("click", closeTransactionModal);
  $("#cancelModalButton").addEventListener("click", closeTransactionModal);
  $("#transactionModal").addEventListener("click", (event) => {
    if (event.target === $("#transactionModal")) closeTransactionModal();
  });
  $("#transactionForm").addEventListener("submit", handleAddTransaction);
  $("#transactionType").addEventListener("change", updateTransactionCategoryOptions);
  $("#transactionRows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (button) handleDeleteTransaction(button.dataset.deleteId);
  });
  $("#searchInput").addEventListener("input", renderTransactions);
  $("#categoryFilter").addEventListener("change", renderTransactions);
  $("#typeFilter").addEventListener("change", renderTransactions);
  $("#periodFilter").addEventListener("change", () => {
    updateSummary();
    renderTransactions();
  });
  $("#categoryClearButton").addEventListener("click", () => {
    $("#categoryFilter").value = "all";
    $("#searchInput").value = "";
    $("#typeFilter").value = "all";
    renderTransactions();
  });
  $("#editBudgetButton").addEventListener("click", openBudgetModal);
  $(".budget-modal-close").addEventListener("click", closeBudgetModal);
  $(".budget-cancel-button").addEventListener("click", closeBudgetModal);
  $("#budgetModal").addEventListener("click", (event) => {
    if (event.target === $("#budgetModal")) closeBudgetModal();
  });
  $("#budgetForm").addEventListener("submit", handleSaveBudget);
  $("#menuButton").addEventListener("click", () => {
    const isOpen = $("#sidebar").classList.toggle("open");
    $("#sidebarOverlay").classList.toggle("visible", isOpen);
    $("#menuButton").setAttribute("aria-expanded", String(isOpen));
  });
  $("#sidebarOverlay").addEventListener("click", closeMobileNavigation);
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      setActiveSection(link.dataset.section);
      closeMobileNavigation();
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeTransactionModal();
      closeBudgetModal();
      closeMobileNavigation();
    }
  });
}

// Menyiapkan pilihan kategori, event, dan tampilan awal saat halaman dimuat.
function initialize() {
  populateCategoryOptions();
  attachEvents();
  refreshDashboard();
  renderIcons();
}

initialize();

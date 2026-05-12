const defaults = {
  principal: 1200000,
  rate: 10.5,
  years: 7,
  insuranceEnabled: true,
  insuranceRate: 1.8,
  financePremium: true,
  processingFee: 0.8,
};

const form = document.querySelector("#emiForm");
const fields = {
  principal: document.querySelector("#principal"),
  principalRange: document.querySelector("#principalRange"),
  rate: document.querySelector("#rate"),
  rateRange: document.querySelector("#rateRange"),
  years: document.querySelector("#years"),
  yearsRange: document.querySelector("#yearsRange"),
  insuranceEnabled: document.querySelector("#insuranceEnabled"),
  insuranceRate: document.querySelector("#insuranceRate"),
  insuranceRateRange: document.querySelector("#insuranceRateRange"),
  financePremium: document.querySelector("#financePremium"),
  processingFee: document.querySelector("#processingFee"),
};

const outputs = {
  monthlyEmi: document.querySelector("#monthlyEmi"),
  effectivePrincipal: document.querySelector("#effectivePrincipal"),
  totalInterest: document.querySelector("#totalInterest"),
  insurancePremium: document.querySelector("#insurancePremium"),
  processingAmount: document.querySelector("#processingAmount"),
  totalPaid: document.querySelector("#totalPaid"),
  upfrontCost: document.querySelector("#upfrontCost"),
  firstInterest: document.querySelector("#firstInterest"),
  firstPrincipal: document.querySelector("#firstPrincipal"),
  burdenRatio: document.querySelector("#burdenRatio"),
  emiCaption: document.querySelector("#emiCaption"),
  scheduleRows: document.querySelector("#scheduleRows"),
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function numericValue(input, fallback) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeInputs() {
  const principal = clamp(numericValue(fields.principal, defaults.principal), 50000, 10000000);
  const annualRate = clamp(numericValue(fields.rate, defaults.rate), 1, 30);
  const years = clamp(numericValue(fields.years, defaults.years), 1, 30);
  const insuranceRate = clamp(numericValue(fields.insuranceRate, defaults.insuranceRate), 0, 10);
  const processingFee = clamp(numericValue(fields.processingFee, defaults.processingFee), 0, 5);

  fields.principal.value = principal;
  fields.principalRange.value = principal;
  fields.rate.value = annualRate;
  fields.rateRange.value = annualRate;
  fields.years.value = years;
  fields.yearsRange.value = years;
  fields.insuranceRate.value = insuranceRate;
  fields.insuranceRateRange.value = insuranceRate;
  fields.processingFee.value = processingFee;

  return {
    principal,
    annualRate,
    years,
    months: years * 12,
    insuranceEnabled: fields.insuranceEnabled.checked,
    insuranceRate,
    financePremium: fields.financePremium.checked,
    processingFee,
  };
}

function calculatePayment(principal, monthlyRate, months) {
  if (monthlyRate === 0) {
    return principal / months;
  }

  const factor = (1 + monthlyRate) ** months;
  return principal * monthlyRate * factor / (factor - 1);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function buildSchedule(principal, emi, monthlyRate) {
  let balance = principal;
  const rows = [];

  for (let month = 1; month <= 12; month += 1) {
    const opening = balance;
    const interest = opening * monthlyRate;
    const principalPaid = Math.min(emi - interest, opening);
    balance = Math.max(opening - principalPaid, 0);

    rows.push({
      month,
      opening,
      principalPaid,
      interest,
      balance,
    });
  }

  return rows;
}

function renderSchedule(rows) {
  outputs.scheduleRows.innerHTML = rows.map((row) => `
    <tr>
      <td>Month ${row.month}</td>
      <td>${currency.format(row.opening)}</td>
      <td>${currency.format(row.principalPaid)}</td>
      <td>${currency.format(row.interest)}</td>
      <td>${currency.format(row.balance)}</td>
    </tr>
  `).join("");
}

function updateCalculator() {
  const values = normalizeInputs();
  const insurancePremium = values.insuranceEnabled
    ? values.principal * values.insuranceRate / 100
    : 0;
  const processingAmount = values.principal * values.processingFee / 100;
  const effectivePrincipal = values.financePremium
    ? values.principal + insurancePremium
    : values.principal;
  const upfrontCost = processingAmount + (values.financePremium ? 0 : insurancePremium);
  const monthlyRate = values.annualRate / 12 / 100;
  const emi = calculatePayment(effectivePrincipal, monthlyRate, values.months);
  const totalPaid = emi * values.months + upfrontCost;
  const totalInterest = emi * values.months - effectivePrincipal;
  const firstInterest = effectivePrincipal * monthlyRate;
  const firstPrincipal = emi - firstInterest;
  const burdenRatio = effectivePrincipal > 0
    ? totalInterest / effectivePrincipal * 100
    : 0;

  outputs.monthlyEmi.textContent = currency.format(emi);
  outputs.effectivePrincipal.textContent = currency.format(effectivePrincipal);
  outputs.totalInterest.textContent = currency.format(totalInterest);
  outputs.insurancePremium.textContent = currency.format(insurancePremium);
  outputs.processingAmount.textContent = currency.format(processingAmount);
  outputs.totalPaid.textContent = currency.format(totalPaid);
  outputs.upfrontCost.textContent = currency.format(upfrontCost);
  outputs.firstInterest.textContent = currency.format(firstInterest);
  outputs.firstPrincipal.textContent = currency.format(firstPrincipal);
  outputs.burdenRatio.textContent = formatPercent(burdenRatio);
  outputs.emiCaption.textContent = values.insuranceEnabled && values.financePremium
    ? "Calculated with financed protection premium."
    : values.insuranceEnabled
      ? "Insurance stays upfront and outside the EMI."
      : "Calculated without loan protection premium.";

  renderSchedule(buildSchedule(effectivePrincipal, emi, monthlyRate));
}

function syncPair(primary, secondary) {
  primary.addEventListener("input", () => {
    secondary.value = primary.value;
    updateCalculator();
  });
  secondary.addEventListener("input", () => {
    primary.value = secondary.value;
    updateCalculator();
  });
}

syncPair(fields.principal, fields.principalRange);
syncPair(fields.rate, fields.rateRange);
syncPair(fields.years, fields.yearsRange);
syncPair(fields.insuranceRate, fields.insuranceRateRange);

[
  fields.insuranceEnabled,
  fields.financePremium,
  fields.processingFee,
].forEach((field) => field.addEventListener("input", updateCalculator));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateCalculator();
});

document.querySelector("#resetButton").addEventListener("click", () => {
  fields.principal.value = defaults.principal;
  fields.principalRange.value = defaults.principal;
  fields.rate.value = defaults.rate;
  fields.rateRange.value = defaults.rate;
  fields.years.value = defaults.years;
  fields.yearsRange.value = defaults.years;
  fields.insuranceEnabled.checked = defaults.insuranceEnabled;
  fields.insuranceRate.value = defaults.insuranceRate;
  fields.insuranceRateRange.value = defaults.insuranceRate;
  fields.financePremium.checked = defaults.financePremium;
  fields.processingFee.value = defaults.processingFee;
  updateCalculator();
});

updateCalculator();

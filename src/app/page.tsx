"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Inputs = {
  frnBalance: number;
  equitiesBalance: number;
  marginLoan: number;
  abnBalance: number;
  frnRate: number;
  dividendYield: number;
  equityGrowthRate: number;
  marginRate: number;
  abnReturnRate: number;
  kelly401k: number;
  karl401k: number;
  k401kGrowthRate: number;
  karlSsiMonthly: number;
  kellySsiMonthly: number;
  ssiHaircut: number;
  jpmWithdrawalShare: number;
  moveYear: number | null;
  usdChf: number;
  zurichMultiplier: number;
};

type YearRow = {
  age: number;
  year: number;
  karlSsi: number;
  kellySsi: number;
  kelly401kBal: number;
  kelly401kIncome: number;
  karl401kBal: number;
  karl401kIncome: number;
  frnBal: number;
  frnInterest: number;
  equityBal: number;
  dividends: number;
  eqGrowth: number;
  marginBal: number;
  marginInt: number;
  abnBal: number;
  nlDeemedOrActual: number;
  nlMarginDeduction: number;
  nlAllowance: number;
  nlTaxable: number;
  nlTaxRate: number;
  nlBox3Tax: number;
  nlFtcCredit: number;
  chNetWealthUsd: number;
  chNetWealthChf: number;
  chCantonalBasicTax: number;
  chMunicipalTax: number;
  chTotalWealthTaxChf: number;
  chTotalWealthTaxUsd: number;
  chInvestmentIncome: number;
  chIncomeTax: number;
  chTotalTax: number;
  totalIncome: number;
  withdrawal: number;
  endingBalanceNL: number;
  endingBalanceCH: number;
};

const START_YEAR = 2026;
const END_YEAR = 2058;
const START_AGE = 58;
const END_AGE = 90;
const NL_ALLOWANCE = 3600;
const NL_TAX_RATE = 0.36;
const CH_INVESTMENT_TAX_RATE = 0.22;
const WITHDRAWAL_CURVE = [
  { minAge: 58, maxAge: 69, multiplier: 1 },
  { minAge: 70, maxAge: 79, multiplier: 0.9 },
  { minAge: 80, maxAge: 90, multiplier: 1.026 },
];

const initialInputs: Inputs = {
  frnBalance: 4_100_069,
  equitiesBalance: 7_731_381,
  marginLoan: 6_451_994,
  abnBalance: 1_206_187,
  frnRate: 4.34,
  dividendYield: 2.65,
  equityGrowthRate: 2.65,
  marginRate: 5.678,
  abnReturnRate: 5,
  kelly401k: 398_054,
  karl401k: 194_528,
  k401kGrowthRate: 5.3,
  karlSsiMonthly: 3_750,
  kellySsiMonthly: 3_750,
  ssiHaircut: 80,
  jpmWithdrawalShare: 70,
  moveYear: 2028,
  usdChf: 0.9,
  zurichMultiplier: 1.19,
};

const CHF_WEALTH_BRACKETS = [
  { upTo: 161_000, rate: 0 },
  { upTo: 403_000, rate: 0.0005 },
  { upTo: 805_000, rate: 0.001 },
  { upTo: 1_451_000, rate: 0.0015 },
  { upTo: 2_418_000, rate: 0.002 },
  { upTo: 3_385_000, rate: 0.0025 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.003 },
];

function getCurveMultiplier(age: number) {
  return WITHDRAWAL_CURVE.find((b) => age >= b.minAge && age <= b.maxAge)?.multiplier ?? 1;
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function safe(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function calcZurichWealthTax(chfWealth: number, municipalMultiplier: number) {
  let basic = 0;
  let prev = 0;
  for (const bracket of CHF_WEALTH_BRACKETS) {
    const taxableSlice = Math.max(0, Math.min(chfWealth, bracket.upTo) - prev);
    basic += taxableSlice * bracket.rate;
    prev = bracket.upTo;
    if (chfWealth <= bracket.upTo) break;
  }
  const municipal = basic * (municipalMultiplier - 1);
  const total = basic + municipal;
  return { basic, municipal, total };
}

function runOneScenario(inputs: Inputs, baseWithdrawal: number, scenario: 'NL' | 'CH') {
  const results: { tax: number; frnBal: number; eqBal: number; marginBal: number; abnBal: number; kelly401k: number; karl401k: number; kelly401kWithdrawal: number; karl401kWithdrawal: number; endingBalance: number; frnInterest: number; dividends: number; eqGrowth: number; marginInt: number; abnEarnings: number; karlSsi: number; kellySsi: number; totalIncome: number; withdrawal: number; nlDeemedOrActual: number; nlMarginDeduction: number; nlTaxable: number; chNetWealthUsd: number; chNetWealthChf: number; chCantonalBasicTax: number; chMunicipalTax: number; chTotalWealthTaxChf: number; chWealthTaxUsd: number; chInvestmentIncome: number; chIncomeTax: number }[] = [];

  let frn = inputs.frnBalance;
  let eq = inputs.equitiesBalance;
  let margin = inputs.marginLoan;
  let abn = inputs.abnBalance;
  let kelly401k = inputs.kelly401k;
  let karl401k = inputs.karl401k;
  let nlLossCarryforward = 0;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const age = year - 1967;

    const frnInterest = frn * (inputs.frnRate / 100);
    const dividends = eq * (inputs.dividendYield / 100);
    const eqGrowth = eq * (inputs.equityGrowthRate / 100);
    const marginInt = margin * (inputs.marginRate / 100);
    const abnRate = (inputs.dividendYield + inputs.equityGrowthRate) / 100;
    const abnEarnings = abn * abnRate;
    const kelly401kEarn = kelly401k * (inputs.k401kGrowthRate / 100);
    const karl401kEarn = karl401k * (inputs.k401kGrowthRate / 100);

    // 401k withdrawals: draw down to $0 by end of 2037, starting in 2030 (8 years)
    // PMT to deplete: balance * rate / (1 - (1+rate)^-n) but we need amount that
    // with continued growth, zeros out. Use: withdrawal = balance * r*(1+r)^n / ((1+r)^n - 1)
    let kelly401kWithdrawal = 0;
    let karl401kWithdrawal = 0;
    if (year >= 2030 && year <= 2037) {
      const r = inputs.k401kGrowthRate / 100;
      const remainingYears = 2037 - year + 1; // years left including this one
      if (r > 0 && remainingYears > 0) {
        const factor = r * Math.pow(1 + r, remainingYears) / (Math.pow(1 + r, remainingYears) - 1);
        kelly401kWithdrawal = kelly401k * factor;
        karl401kWithdrawal = karl401k * factor;
      } else {
        kelly401kWithdrawal = kelly401k / Math.max(1, remainingYears);
        karl401kWithdrawal = karl401k / Math.max(1, remainingYears);
      }
    }

    const karlSsi = age >= 70 ? inputs.karlSsiMonthly * 12 * (inputs.ssiHaircut / 100) : 0;
    const kellySsi = age >= 70 ? inputs.kellySsiMonthly * 12 * (inputs.ssiHaircut / 100) : 0;

    // Determine which tax applies this year
    const chTaxApplies = scenario === 'CH' && inputs.moveYear !== null && year >= inputs.moveYear;
    const useNLTax = scenario === 'NL' || !chTaxApplies;

    let tax = 0;
    let nlDeemedOrActual = 0, nlMarginDeduction = 0, nlTaxable = 0;
    let chNetWealthUsd = 0, chNetWealthChf = 0, chCantonalBasicTax = 0, chMunicipalTax = 0, chTotalWealthTaxChf = 0, chWealthTaxUsd = 0, chInvestmentIncome = 0, chIncomeTax = 0;

    if (useNLTax) {
      const nlPre2028 = year < 2028;
      nlDeemedOrActual = nlPre2028 ? (frn + eq) * 0.0604 : frnInterest + dividends + eqGrowth;
      nlMarginDeduction = nlPre2028 ? margin * 0.0247 : marginInt;
      const taxableBeforeAllowance = nlDeemedOrActual - nlMarginDeduction;
      const taxableWithAllowance = taxableBeforeAllowance - NL_ALLOWANCE;
      const netTaxableAfterLoss = taxableWithAllowance - nlLossCarryforward;
      nlTaxable = Math.max(0, netTaxableAfterLoss);
      nlLossCarryforward = Math.max(0, -netTaxableAfterLoss);
      tax = nlTaxable * NL_TAX_RATE;
    } else {
      // CH tax
      const totalAssets = frn + eq + abn + kelly401k + karl401k;
      chNetWealthUsd = Math.max(0, totalAssets - margin);
      chNetWealthChf = chNetWealthUsd * inputs.usdChf;
      const wealth = calcZurichWealthTax(chNetWealthChf, inputs.zurichMultiplier);
      chCantonalBasicTax = wealth.basic;
      chMunicipalTax = wealth.municipal;
      chTotalWealthTaxChf = wealth.total;
      chWealthTaxUsd = wealth.total / Math.max(inputs.usdChf, 0.0001);
      chInvestmentIncome = Math.max(0, frnInterest + dividends - marginInt); // margin interest deductible against investment income
      chIncomeTax = chInvestmentIncome * CH_INVESTMENT_TAX_RATE;
      tax = chWealthTaxUsd + chIncomeTax;
    }

    const withdrawal = baseWithdrawal * getCurveMultiplier(age);

    // === CASH FLOW WATERFALL ===
    // 1. Total cash income (generated without reducing any balances)
    // 401k earnings compound internally — withdrawals (2030-2037) ARE cash income
    const totalCashIncome = karlSsi + kellySsi + frnInterest + dividends + kelly401kWithdrawal + karl401kWithdrawal;

    // 2. Subtract tax and withdrawal
    const netCashFlow = totalCashIncome - tax - withdrawal;

    // 3. If negative: fund the shortfall 70% from margin, 30% from ABN
    //    If positive: use surplus to reduce margin balance
    const jpmShare = inputs.jpmWithdrawalShare / 100;
    if (netCashFlow < 0) {
      const shortfall = -netCashFlow;
      let jpmDraw = shortfall * jpmShare;
      let abnDraw = shortfall * (1 - jpmShare);

      // Margin cap: can't exceed 90% FRN + 50% equities
      const marginCap = frn * 0.9 + eq * 0.5;
      if (margin + jpmDraw > marginCap) {
        const maxAdd = Math.max(0, marginCap - margin);
        jpmDraw = maxAdd;
        abnDraw = shortfall - jpmDraw;
      }
      // ABN can't go negative
      if (abnDraw > abn) {
        abnDraw = Math.max(0, abn);
        const remaining = shortfall - jpmDraw - abnDraw;
        const room = Math.max(0, (frn * 0.9 + eq * 0.5) - margin - jpmDraw);
        jpmDraw += Math.min(remaining, room);
      }

      margin += jpmDraw;
      abn = Math.max(0, abn - abnDraw);
    } else {
      // Surplus: pay down margin
      margin = Math.max(0, margin - netCashFlow);
    }

    // === BALANCE GROWTH (independent of cash flows) ===
    // Margin interest capitalizes
    margin += marginInt;
    // Equity grows by growth rate
    eq += eqGrowth;
    // ABN grows by dividend yield + equity growth rate combined
    abn += abnEarnings;
    // 401k: compound earnings then deduct withdrawals
    kelly401k += kelly401kEarn - kelly401kWithdrawal;
    karl401k += karl401kEarn - karl401kWithdrawal;
    kelly401k = Math.max(0, kelly401k);
    karl401k = Math.max(0, karl401k);
    // FRN balance stays constant (interest was cash, already counted above)

    frn = Math.max(0, frn);
    eq = Math.max(0, eq);

    // === MARGIN CAP ENFORCEMENT ===
    // After all flows, ensure margin doesn't exceed 90% FRN + 50% equity
    const finalMarginCap = frn * 0.9 + eq * 0.5;
    if (margin > finalMarginCap) {
      const excess = margin - finalMarginCap;
      // Must pay down excess — take from ABN first
      const abnPaydown = Math.min(excess, abn);
      abn -= abnPaydown;
      margin -= abnPaydown;
      // If still over cap and have equity, forced liquidation of equity
      if (margin > finalMarginCap) {
        const stillOver = margin - finalMarginCap;
        // Selling equity reduces both equity and margin
        // But selling $X of equity also reduces the cap by 0.5*X
        // So we need to sell enough that: margin - sold = 0.9*frn + 0.5*(eq - sold)
        // margin - sold = 0.9*frn + 0.5*eq - 0.5*sold
        // margin - 0.5*sold = 0.9*frn + 0.5*eq
        // 0.5*sold = margin - 0.9*frn - 0.5*eq
        // sold = 2 * (margin - 0.9*frn - 0.5*eq)
        const eqToSell = Math.min(eq, 2 * stillOver);
        eq -= eqToSell;
        margin -= eqToSell; // proceeds pay down margin
      }
    }

    const endingBalance = frn + eq + abn + kelly401k + karl401k - margin;
    const totalIncome = frnInterest + dividends - marginInt + karlSsi + kellySsi + kelly401kWithdrawal + karl401kWithdrawal;

    results.push({ tax, frnBal: frn, eqBal: eq, marginBal: margin, abnBal: abn, kelly401k, karl401k, kelly401kWithdrawal, karl401kWithdrawal, endingBalance, frnInterest, dividends, eqGrowth, marginInt, abnEarnings, karlSsi, kellySsi, totalIncome, withdrawal, nlDeemedOrActual, nlMarginDeduction, nlTaxable, chNetWealthUsd, chNetWealthChf, chCantonalBasicTax, chMunicipalTax, chTotalWealthTaxChf, chWealthTaxUsd, chInvestmentIncome, chIncomeTax });
  }
  return results;
}

function runProjection(inputs: Inputs, baseWithdrawal: number): YearRow[] {
  const nlResults = runOneScenario(inputs, baseWithdrawal, 'NL');
  const chResults = runOneScenario(inputs, baseWithdrawal, 'CH');
  const rows: YearRow[] = [];

  for (let i = 0; i < nlResults.length; i++) {
    const nl = nlResults[i];
    const ch = chResults[i];
    const year = START_YEAR + i;
    const age = year - 1967;

    rows.push({
      age, year,
      karlSsi: nl.karlSsi, kellySsi: nl.kellySsi,
      kelly401kBal: nl.kelly401k, kelly401kIncome: nl.kelly401kWithdrawal,
      karl401kBal: nl.karl401k, karl401kIncome: nl.karl401kWithdrawal,
      frnBal: nl.frnBal, frnInterest: nl.frnInterest,
      equityBal: nl.eqBal, dividends: nl.dividends, eqGrowth: nl.eqGrowth,
      marginBal: nl.marginBal, marginInt: nl.marginInt,
      abnBal: nl.abnBal,
      nlDeemedOrActual: nl.nlDeemedOrActual, nlMarginDeduction: nl.nlMarginDeduction,
      nlAllowance: NL_ALLOWANCE, nlTaxable: nl.nlTaxable,
      nlTaxRate: NL_TAX_RATE, nlBox3Tax: nl.tax, nlFtcCredit: nl.tax,
      chNetWealthUsd: ch.chNetWealthUsd, chNetWealthChf: ch.chNetWealthChf,
      chCantonalBasicTax: ch.chCantonalBasicTax, chMunicipalTax: ch.chMunicipalTax,
      chTotalWealthTaxChf: ch.chTotalWealthTaxChf,
      chTotalWealthTaxUsd: ch.chWealthTaxUsd,
      chInvestmentIncome: ch.chInvestmentIncome, chIncomeTax: ch.chIncomeTax,
      chTotalTax: ch.tax,
      totalIncome: nl.totalIncome, withdrawal: nl.withdrawal,
      endingBalanceNL: nl.endingBalance, endingBalanceCH: ch.endingBalance,
    });
  }
  return rows;
}

function solveBaseWithdrawal(inputs: Inputs, target: 'NL' | 'CH') {
  let low = 0;
  let high = 2_000_000;
  let best = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const rows = runProjection(inputs, mid);
    const end = target === 'NL' ? (rows.at(-1)?.endingBalanceNL ?? 0) : (rows.at(-1)?.endingBalanceCH ?? 0);
    best = mid;
    if (Math.abs(end) < 10) return mid;
    if (end > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

function InputField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="grid gap-1 text-[13px]">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded border border-slate-300 px-2 py-1.5"
          type="number"
          value={safe(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          min={min}
          max={max}
        />
        {suffix ? <span className="text-xs text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function rowStyle(row: YearRow) {
  if (row.endingBalanceNL > row.endingBalanceCH ? row.endingBalanceCH > 0 : row.endingBalanceNL > 0) {
    const worstEnding = Math.min(row.endingBalanceNL, row.endingBalanceCH);
    if (worstEnding < row.withdrawal * 2) return "bg-red-50";
    const previous = Math.max(0, worstEnding + row.withdrawal);
    if (worstEnding < previous) return "bg-amber-50";
    return "bg-emerald-50";
  }
  return "bg-red-50";
}

export default function Home() {
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [baseWithdrawal, setBaseWithdrawal] = useState(0);
  const [tab, setTab] = useState<"summary" | "detail">("summary");
  const [inputsOpen, setInputsOpen] = useState(true);
  const [manualWithdrawal, setManualWithdrawal] = useState<number | null>(null);
  const [autoSolve, setAutoSolve] = useState(true);
  const [solveTarget, setSolveTarget] = useState<'NL' | 'CH'>('NL');

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setTab(isMobile ? "summary" : "detail");
  }, []);

  useEffect(() => {
    if (!autoSolve) return;
    const t = setTimeout(() => {
      const solved = solveBaseWithdrawal(inputs, solveTarget);
      setBaseWithdrawal(solved);
      setManualWithdrawal(null);
    }, 300);
    return () => clearTimeout(t);
  }, [inputs, autoSolve, solveTarget]);

  const effectiveWithdrawal = manualWithdrawal ?? baseWithdrawal;
  const rows = useMemo(() => runProjection(inputs, effectiveWithdrawal), [inputs, effectiveWithdrawal]);

  const bands = useMemo(() => {
    const defs = [
      { key: "pre", label: "2026–2037 (Pre-SSI)", start: 2026, end: 2037 },
      { key: "mid", label: "2038–2047 (SSI + reduced withdrawal)", start: 2038, end: 2047 },
      { key: "late", label: "2048–2058 (higher withdrawal phase)", start: 2048, end: 2058 },
    ];

    return defs.map((d) => {
      const r = rows.filter((row) => row.year >= d.start && row.year <= d.end);
      const years = r.length || 1;
      return {
        label: d.label,
        totalIncome: r.reduce((a, x) => a + x.totalIncome, 0),
        totalTaxNL: r.reduce((a, x) => a + x.nlBox3Tax, 0),
        totalTaxCH: r.reduce((a, x) => a + x.chTotalTax, 0),
        totalWithdrawal: r.reduce((a, x) => a + x.withdrawal, 0),
        avgWithdrawal: r.reduce((a, x) => a + x.withdrawal, 0) / years,
        endingNL: r.at(-1)?.endingBalanceNL ?? 0,
        endingCH: r.at(-1)?.endingBalanceCH ?? 0,
      };
    });
  }, [rows]);

  const totals = useMemo(() => ({
    totalIncome: rows.reduce((a, x) => a + x.totalIncome, 0),
    totalTaxNL: rows.reduce((a, x) => a + x.nlBox3Tax, 0),
    totalTaxCH: rows.reduce((a, x) => a + x.chTotalTax, 0),
    totalWithdrawal: rows.reduce((a, x) => a + x.withdrawal, 0),
    avgWithdrawal: rows.reduce((a, x) => a + x.withdrawal, 0) / Math.max(1, rows.length),
    endingNL: rows.at(-1)?.endingBalanceNL ?? 0,
    endingCH: rows.at(-1)?.endingBalanceCH ?? 0,
  }), [rows]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-6 md:py-6">
        <header className="mb-4 rounded-lg border border-slate-300 bg-white p-4 print:border-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Retirement Drawdown Calculator (CH vs NL)</h1>
              <p className="mt-1 text-sm text-slate-600">Age 58 (2026) through age 90 (2058), complete side-by-side scenario modeling.</p>
            </div>
            <button onClick={() => window.print()} className="no-print rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white">Print</button>
          </div>
          <div className="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            US income tax excluded — margin interest deduction offsets dividend/interest/401k income (large carryover from prior years). Move modeled at end of calendar year (no split-year). European taxes shown in detail.
            <br/>NL Box 3 (2026-2027): Deemed-return system — taxes a fictional 6.04% return regardless of actual income. From 2028+, actual-return regime (much more favorable with margin deduction).
            <br/>401k withdrawals: 2030-2037 (8-year PMT annuity depleting both accounts to $0). No US tax modeled on withdrawals.
          </div>
        </header>

        <section className="no-print mb-4 rounded-lg border border-slate-300 bg-white">
          <button
            onClick={() => setInputsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold"
          >
            <span>Inputs</span>
            <span>{inputsOpen ? "Hide" : "Show"}</span>
          </button>

          {inputsOpen ? (
            <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2 lg:grid-cols-4">
              <InputField label="JPM FRN Balance" value={inputs.frnBalance} onChange={(v) => setInputs({ ...inputs, frnBalance: v })} />
              <InputField label="JPM Equities Balance" value={inputs.equitiesBalance} onChange={(v) => setInputs({ ...inputs, equitiesBalance: v })} />
              <InputField label="JPM Margin Loan" value={inputs.marginLoan} onChange={(v) => setInputs({ ...inputs, marginLoan: v })} />
              <InputField label="ABN AMRO Balance" value={inputs.abnBalance} onChange={(v) => setInputs({ ...inputs, abnBalance: v })} />

              <InputField label="FRN Interest Rate" value={inputs.frnRate} suffix="%" step={0.01} onChange={(v) => setInputs({ ...inputs, frnRate: v })} />
              <InputField label="Dividend Yield" value={inputs.dividendYield} suffix="%" step={0.01} onChange={(v) => setInputs({ ...inputs, dividendYield: v })} />
              <InputField label="Equity Growth Rate" value={inputs.equityGrowthRate} suffix="%" step={0.01} onChange={(v) => setInputs({ ...inputs, equityGrowthRate: v })} />
              <InputField label="Margin Interest Rate" value={inputs.marginRate} suffix="%" step={0.001} onChange={(v) => setInputs({ ...inputs, marginRate: v })} />

              <div className="grid gap-1 text-[13px]">
                <span className="font-medium text-slate-700">ABN AMRO Return Rate</span>
                <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600">{(inputs.dividendYield + inputs.equityGrowthRate).toFixed(2)}% (div + growth)</div>
              </div>
              <InputField label="Kelly 401k Balance" value={inputs.kelly401k} onChange={(v) => setInputs({ ...inputs, kelly401k: v })} />
              <InputField label="Karl 401k Balance" value={inputs.karl401k} onChange={(v) => setInputs({ ...inputs, karl401k: v })} />
              <InputField label="401k Growth Rate" value={inputs.k401kGrowthRate} suffix="%" step={0.01} onChange={(v) => setInputs({ ...inputs, k401kGrowthRate: v })} />

              <InputField label="Karl Monthly SSI @70" value={inputs.karlSsiMonthly} onChange={(v) => setInputs({ ...inputs, karlSsiMonthly: v })} />
              <InputField label="Kelly Monthly SSI @70" value={inputs.kellySsiMonthly} onChange={(v) => setInputs({ ...inputs, kellySsiMonthly: v })} />
              <label className="grid gap-1 text-[13px]">
                <span className="font-medium text-slate-700">SSI Solvency Haircut: {inputs.ssiHaircut}%</span>
                <input type="range" min={50} max={100} value={inputs.ssiHaircut} onChange={(e) => setInputs({ ...inputs, ssiHaircut: Number(e.target.value) })} />
              </label>
              <label className="grid gap-1 text-[13px]">
                <span className="font-medium text-slate-700">Liquidation JPM/ABN: {inputs.jpmWithdrawalShare}% / {100 - inputs.jpmWithdrawalShare}%</span>
                <input type="range" min={0} max={100} value={inputs.jpmWithdrawalShare} onChange={(e) => setInputs({ ...inputs, jpmWithdrawalShare: Number(e.target.value) })} />
              </label>

              <label className="grid gap-1 text-[13px]">
                <span className="font-medium text-slate-700">Year of move to Switzerland</span>
                <select
                  className="rounded border border-slate-300 px-2 py-1.5"
                  value={inputs.moveYear ?? "never"}
                  onChange={(e) => setInputs({ ...inputs, moveYear: e.target.value === "never" ? null : Number(e.target.value) })}
                >
                  <option value="never">Never</option>
                  {Array.from({ length: 15 }).map((_, i) => {
                    const y = 2026 + i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </label>
              <InputField label="USD/CHF" value={inputs.usdChf} step={0.01} onChange={(v) => setInputs({ ...inputs, usdChf: v })} />
              <InputField label="Zurich municipal multiplier" value={inputs.zurichMultiplier} step={0.01} onChange={(v) => setInputs({ ...inputs, zurichMultiplier: v })} />
            </div>
          ) : null}
        </section>

        <section className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-300 bg-white p-3">
            <div className="text-xs text-slate-500">Annual After-Tax Income (base amount)</div>
            <div className="flex items-center gap-2 mt-1">
              <input
                className="w-40 rounded border border-slate-300 px-2 py-1.5 text-lg font-semibold"
                type="number"
                value={Math.round(effectiveWithdrawal)}
                onChange={(e) => {
                  setAutoSolve(false);
                  setManualWithdrawal(Number(e.target.value));
                }}
              />
              <button
                onClick={() => { setAutoSolve(true); setManualWithdrawal(null); }}
                className={`rounded px-2 py-1.5 text-xs font-medium ${autoSolve ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700 hover:bg-green-50'}`}
              >
                {autoSolve ? '✓ Auto-solving' : 'Auto-solve to $0 @90'}
              </button>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => { setSolveTarget('NL'); setAutoSolve(true); setManualWithdrawal(null); }}
                  className={`rounded px-2 py-1.5 text-xs font-medium ${solveTarget === 'NL' && autoSolve ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}
                >NL</button>
                <button
                  onClick={() => { setSolveTarget('CH'); setAutoSolve(true); setManualWithdrawal(null); }}
                  className={`rounded px-2 py-1.5 text-xs font-medium ${solveTarget === 'CH' && autoSolve ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'}`}
                >CH</button>
              </div>
            </div>
            <div className="text-sm text-slate-600 mt-1">{usd(effectiveWithdrawal / 12)}/mo</div>
            <div className="text-xs text-slate-500">Curve: 100% → 90% @70 → 102.6% @80</div>
          </div>
          <div className="rounded-lg border border-slate-300 bg-white p-3">
            <div className="text-xs text-slate-500">Ending balance at age 90 (NL)</div>
            <div className="text-lg font-semibold">{usd(totals.endingNL)}</div>
          </div>
          <div className="rounded-lg border border-slate-300 bg-white p-3">
            <div className="text-xs text-slate-500">Ending balance at age 90 (CH)</div>
            <div className="text-lg font-semibold">{usd(totals.endingCH)}</div>
          </div>
        </section>

        <section className="no-print mb-4 flex gap-2">
          <button onClick={() => setTab("summary")} className={`rounded px-3 py-1.5 text-sm ${tab === "summary" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`}>Summary</button>
          <button onClick={() => setTab("detail")} className={`rounded px-3 py-1.5 text-sm ${tab === "detail" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`}>Detail</button>
        </section>

        {(tab === "summary" || typeof window === "undefined") && (
          <section className="mb-6 space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
              <table className="min-w-full text-[13px]">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {["Age", "Year", "Dividend Income", "Interest Income", "401k Income", "Margin Int Paid", "SSI Income", "Net Income", "Tax (NL)", "Tax (CH)", "Withdrawal", "Ending Bal (NL)", "Ending Bal (CH)"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.year} className={`${rowStyle(r)} border-t border-slate-200`}>
                      <td className="px-3 py-2">{r.age}</td>
                      <td className="px-3 py-2">{r.year}</td>
                      <td className="px-3 py-2">{usd(r.dividends)}</td>
                      <td className="px-3 py-2">{usd(r.frnInterest)}</td>
                      <td className="px-3 py-2">{r.kelly401kIncome + r.karl401kIncome > 0 ? usd(r.kelly401kIncome + r.karl401kIncome) : '—'}</td>
                      <td className="px-3 py-2">{usd(-r.marginInt)}</td>
                      <td className="px-3 py-2">{usd(r.karlSsi + r.kellySsi)}</td>
                      <td className="px-3 py-2 font-medium">{usd(r.totalIncome)}</td>
                      <td className="px-3 py-2">{usd(r.nlBox3Tax)}</td>
                      <td className="px-3 py-2">{usd(r.chTotalTax)}</td>
                      <td className="px-3 py-2">{usd(r.withdrawal)}</td>
                      <td className="px-3 py-2 font-semibold">{usd(r.endingBalanceNL)}</td>
                      <td className="px-3 py-2 font-semibold">{usd(r.endingBalanceCH)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-900 bg-slate-50 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>Lifetime Total</td>
                    <td className="px-3 py-2">{usd(rows.reduce((a, r) => a + r.dividends, 0))}</td>
                    <td className="px-3 py-2">{usd(rows.reduce((a, r) => a + r.frnInterest, 0))}</td>
                    <td className="px-3 py-2">{usd(rows.reduce((a, r) => a + r.kelly401kIncome + r.karl401kIncome, 0))}</td>
                    <td className="px-3 py-2">{usd(-rows.reduce((a, r) => a + r.marginInt, 0))}</td>
                    <td className="px-3 py-2">{usd(rows.reduce((a, r) => a + r.karlSsi + r.kellySsi, 0))}</td>
                    <td className="px-3 py-2">{usd(rows.reduce((a, r) => a + r.totalIncome, 0))}</td>
                    <td className="px-3 py-2">{usd(totals.totalTaxNL)}</td>
                    <td className="px-3 py-2">{usd(totals.totalTaxCH)}</td>
                    <td className="px-3 py-2">{usd(totals.totalWithdrawal)}</td>
                    <td className="px-3 py-2">{usd(totals.endingNL)}</td>
                    <td className="px-3 py-2">{usd(totals.endingCH)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="h-80 rounded-lg border border-slate-300 bg-white p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows.map((r) => ({ year: r.year, NL: r.endingBalanceNL, CH: r.endingBalanceCH }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                  <Tooltip formatter={(v: number | string | undefined) => usd(Number(v ?? 0))} />
                  <Legend />
                  <Line dataKey="NL" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                  <Line dataKey="CH" stroke="#0f766e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {tab === "detail" && (
          <section className="overflow-auto rounded-lg border border-slate-300 bg-white" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <table className="min-w-[2500px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-900 text-white">
                  {[
                    "Age", "Year", "Karl SSI Income", "Kelly SSI Income", "Kelly 401k Bal", "Kelly 401k Inc", "Karl 401k Bal", "Karl 401k Inc", "FRN Bal", "FRN Interest", "JPM Equity Bal", "JPM Dividends", "JPM Equity Growth", "JPM Margin Loan Bal", "Margin %", "Margin Int", "ABN Bal", "NL: Deemed/Actual", "NL: Margin Deduction", "NL: Allowance", "NL: Box3 Taxable", "NL: Tax Rate", "NL: Box3 Tax", "NL: FTC Credit", "CH: Net Wealth USD", "CH: Wealth Tax USD", "CH: Net Inv Income", "CH: Income Tax", "CH: Total Tax", "Total Income", "Withdrawal", "Ending Balance (NL)", "Ending Balance (CH)",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`border-b border-slate-700 px-2 py-2 text-left font-medium ${i === 0 ? "sticky left-0 z-20 bg-slate-900" : ""} ${i === 1 ? "sticky left-[56px] z-20 bg-slate-900" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year} className={`${rowStyle(r)} border-t border-slate-200`}>
                    <td className="sticky left-0 z-10 w-14 bg-inherit px-2 py-1">{r.age}</td>
                    <td className="sticky left-[56px] z-10 w-20 bg-inherit px-2 py-1">{r.year}</td>
                    <td className="px-2 py-1">{usd(r.karlSsi)}</td>
                    <td className="px-2 py-1">{usd(r.kellySsi)}</td>
                    <td className="px-2 py-1">{usd(r.kelly401kBal)}</td>
                    <td className="px-2 py-1">{r.kelly401kIncome > 0 ? usd(r.kelly401kIncome) : '—'}</td>
                    <td className="px-2 py-1">{usd(r.karl401kBal)}</td>
                    <td className="px-2 py-1">{r.karl401kIncome > 0 ? usd(r.karl401kIncome) : '—'}</td>
                    <td className="px-2 py-1">{usd(r.frnBal)}</td>
                    <td className="px-2 py-1">{usd(r.frnInterest)}</td>
                    <td className="px-2 py-1">{usd(r.equityBal)}</td>
                    <td className="px-2 py-1">{usd(r.dividends)}</td>
                    <td className="px-2 py-1">{usd(r.eqGrowth)}</td>
                    <td className="px-2 py-1">{usd(-r.marginBal)}</td>
                    <td className="px-2 py-1">{((r.marginBal / (r.frnBal + r.equityBal)) * 100).toFixed(1)}%</td>
                    <td className="px-2 py-1">{usd(-r.marginInt)}</td>
                    <td className="px-2 py-1">{usd(r.abnBal)}</td>
                    <td className="px-2 py-1">{usd(r.nlDeemedOrActual)}</td>
                    <td className="px-2 py-1">{usd(r.nlMarginDeduction)}</td>
                    <td className="px-2 py-1">{usd(r.nlAllowance)}</td>
                    <td className="px-2 py-1">{usd(r.nlTaxable)}</td>
                    <td className="px-2 py-1">{pct(r.nlTaxRate)}</td>
                    <td className="px-2 py-1">{usd(r.nlBox3Tax)}</td>
                    <td className="px-2 py-1">{usd(r.nlFtcCredit)}</td>
                    <td className="px-2 py-1">{usd(r.chNetWealthUsd)}</td>
                    <td className="px-2 py-1">{usd(r.chTotalWealthTaxUsd)}</td>
                    <td className="px-2 py-1">{usd(r.chInvestmentIncome)}</td>
                    <td className="px-2 py-1">{usd(r.chIncomeTax)}</td>
                    <td className="px-2 py-1">{usd(r.chTotalTax)}</td>
                    <td className="px-2 py-1">{usd(r.totalIncome)}</td>
                    <td className="px-2 py-1">{usd(r.withdrawal)}</td>
                    <td className="px-2 py-1 font-semibold">{usd(r.endingBalanceNL)}</td>
                    <td className="px-2 py-1 font-semibold">{usd(r.endingBalanceCH)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}

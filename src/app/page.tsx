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
  karl401kBal: number;
  frnBal: number;
  frnInterest: number;
  equityBal: number;
  dividends: number;
  eqGrowth: number;
  marginBal: number;
  marginInt: number;
  abnBal: number;
  abnEarnings: number;
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

function runProjection(inputs: Inputs, baseWithdrawal: number): YearRow[] {
  const rows: YearRow[] = [];

  let frn = inputs.frnBalance;
  let eq = inputs.equitiesBalance;
  let margin = inputs.marginLoan;
  let abn = inputs.abnBalance;
  let kelly401k = inputs.kelly401k;
  let karl401k = inputs.karl401k;
  let nlLossCarryforward = 0;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const age = year - 1967;

    const frnInterest = frn * (inputs.frnRate / 100); // Cash income, NOT reinvested into FRN
    const dividends = eq * (inputs.dividendYield / 100); // Cash income, NOT added to equity balance
    const eqGrowth = eq * (inputs.equityGrowthRate / 100); // Growth IS added to equity balance
    const marginInt = margin * (inputs.marginRate / 100); // Capitalizes onto margin loan
    const abnRate = (inputs.dividendYield + inputs.equityGrowthRate) / 100; // ABN earns at combined div + growth rate
    const abnEarnings = abn * abnRate; // Reinvested into ABN balance

    const kelly401kEarn = kelly401k * (inputs.k401kGrowthRate / 100);
    const karl401kEarn = karl401k * (inputs.k401kGrowthRate / 100);

    const karlSsi = age >= 70 ? inputs.karlSsiMonthly * 12 * (inputs.ssiHaircut / 100) : 0;
    const kellySsi = age >= 70 ? inputs.kellySsiMonthly * 12 * (inputs.ssiHaircut / 100) : 0;

    const nlPre2028 = year < 2028;
    const deemedOrActual = nlPre2028
      ? (frn + eq) * 0.0604
      : frnInterest + dividends + eqGrowth;
    const marginDeduction = nlPre2028 ? margin * 0.0247 : marginInt;
    const taxableBeforeAllowance = deemedOrActual - marginDeduction;
    const taxableWithAllowance = taxableBeforeAllowance - NL_ALLOWANCE;
    const netTaxableAfterLoss = taxableWithAllowance - nlLossCarryforward;
    const nlTaxable = Math.max(0, netTaxableAfterLoss);
    nlLossCarryforward = Math.max(0, -netTaxableAfterLoss);
    const nlBox3Tax = nlTaxable * NL_TAX_RATE;
    const nlFtcCredit = nlBox3Tax;

    const totalAssetsBeforeWithdrawal = frn + eq + abn + kelly401k + karl401k;
    const netWealthUsd = Math.max(0, totalAssetsBeforeWithdrawal - margin);
    const netWealthChf = netWealthUsd * inputs.usdChf;
    const wealth = calcZurichWealthTax(netWealthChf, inputs.zurichMultiplier);
    const totalWealthTaxUsd = wealth.total / Math.max(inputs.usdChf, 0.0001);

    const chInvestmentIncome = frnInterest + dividends;
    const chIncomeTax = Math.max(0, chInvestmentIncome * CH_INVESTMENT_TAX_RATE);
    const chTaxIfInCH = totalWealthTaxUsd + chIncomeTax;
    const chTaxApplies = inputs.moveYear !== null && year >= inputs.moveYear;
    const chTotalTax = chTaxApplies ? chTaxIfInCH : nlBox3Tax;

    const withdrawal = baseWithdrawal * getCurveMultiplier(age);

    // Apply growth to balances
    // FRN: balance stays CONSTANT (interest is cash, not reinvested)
    // Equity: grows by growth rate (dividends are cash, not reinvested)
    eq += eqGrowth;
    // ABN: earnings reinvested into balance
    abn += abnEarnings;
    // 401k: earnings compound
    kelly401k += kelly401kEarn;
    karl401k += karl401kEarn;
    // Margin: interest capitalizes (increases the loan)
    margin += marginInt;

    // Liquidation: withdrawals come from JPM margin (increasing it) and ABN
    // But margin can't exceed: 90% of FRN + 50% of equities
    const jpmShare = inputs.jpmWithdrawalShare / 100;
    const abnShare = 1 - jpmShare;
    let jpmDraw = withdrawal * jpmShare;
    let abnDraw = withdrawal * abnShare;

    // Check margin cap: 90% FRN + 50% equities
    const marginCap = frn * 0.9 + eq * 0.5;
    const proposedMargin = margin + jpmDraw;
    if (proposedMargin > marginCap) {
      // Can't borrow this much — cap the JPM draw, take rest from ABN
      const maxAdditionalMargin = Math.max(0, marginCap - margin);
      jpmDraw = maxAdditionalMargin;
      abnDraw = withdrawal - jpmDraw;
    }

    // ABN can't go negative — if it would, reduce the draw
    if (abnDraw > abn) {
      abnDraw = Math.max(0, abn);
      // Remaining shortfall — try to take from margin if cap allows
      const shortfall = withdrawal - jpmDraw - abnDraw;
      const additionalMarginRoom = Math.max(0, marginCap - margin - jpmDraw);
      jpmDraw += Math.min(shortfall, additionalMarginRoom);
    }

    margin += jpmDraw;
    abn = Math.max(0, abn - abnDraw);

    // Floor: FRN and equities can never go negative
    frn = Math.max(0, frn);
    eq = Math.max(0, eq);

    const endingBalanceCore = frn + eq + abn - margin;
    const endingBalanceNL = endingBalanceCore + kelly401k + karl401k - nlBox3Tax;
    const endingBalanceCH = endingBalanceCore + kelly401k + karl401k - chTotalTax;

    const totalIncome =
      frnInterest +
      dividends -
      marginInt +
      karlSsi +
      kellySsi;

    rows.push({
      age,
      year,
      karlSsi,
      kellySsi,
      kelly401kBal: kelly401k,
      karl401kBal: karl401k,
      frnBal: frn,
      frnInterest,
      equityBal: eq,
      dividends,
      eqGrowth,
      marginBal: margin,
      marginInt,
      abnBal: abn,
      abnEarnings,
      nlDeemedOrActual: deemedOrActual,
      nlMarginDeduction: marginDeduction,
      nlAllowance: NL_ALLOWANCE,
      nlTaxable,
      nlTaxRate: NL_TAX_RATE,
      nlBox3Tax,
      nlFtcCredit,
      chNetWealthUsd: netWealthUsd,
      chNetWealthChf: netWealthChf,
      chCantonalBasicTax: wealth.basic,
      chMunicipalTax: wealth.municipal,
      chTotalWealthTaxChf: wealth.total,
      chTotalWealthTaxUsd: chTaxApplies ? totalWealthTaxUsd : 0,
      chInvestmentIncome,
      chIncomeTax: chTaxApplies ? chIncomeTax : 0,
      chTotalTax,
      totalIncome,
      withdrawal,
      endingBalanceNL,
      endingBalanceCH,
    });
  }

  return rows;
}

function solveBaseWithdrawal(inputs: Inputs) {
  let low = 0;
  let high = 2_000_000;
  let best = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const rows = runProjection(inputs, mid);
    const end = rows.at(-1)?.endingBalanceNL ?? 0;
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

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setTab(isMobile ? "summary" : "detail");
  }, []);

  useEffect(() => {
    if (!autoSolve) return;
    const t = setTimeout(() => {
      const solved = solveBaseWithdrawal(inputs);
      setBaseWithdrawal(solved);
      setManualWithdrawal(null);
    }, 300);
    return () => clearTimeout(t);
  }, [inputs, autoSolve]);

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
            US income tax is modeled as ~0 because margin interest deduction offsets dividend/interest income. European taxes are shown in detail.
            <br/>NL Box 3 (2026-2027): Uses deemed-return system — taxes a fictional 6.04% return on investments regardless of actual income. This makes the tax appear high relative to net cash income. From 2028+, the new regime taxes actual returns (much more favorable with margin deduction).
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
                    {["Age", "Year", "Dividend Income", "Interest Income", "Margin Int Paid", "SSI Income", "Net Income", "Tax (NL)", "Tax (CH)", "Withdrawal", "Ending Bal (NL)", "Ending Bal (CH)"].map((h) => (
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
          <section className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
            <table className="min-w-[2500px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {[
                    "Age", "Year", "Karl SSI", "Kelly SSI", "Kelly 401k Bal", "Karl 401k Bal", "FRN Bal", "FRN Interest", "Equity Bal", "Dividends", "Eq Growth", "Margin Bal", "Margin Int", "ABN Bal", "ABN Earnings", "NL: Deemed/Actual", "NL: Margin Deduction", "NL: Allowance", "NL: Box3 Taxable", "NL: Tax Rate", "NL: Box3 Tax", "NL: FTC Credit", "CH: Net Wealth USD", "CH: Net Wealth CHF", "CH: Cantonal Basic Tax", "CH: Municipal Tax", "CH: Total Wealth Tax CHF", "CH: Wealth Tax USD", "CH: Investment Income", "CH: Income Tax", "CH: Total Tax", "Total Income", "Withdrawal", "Ending Balance (NL)", "Ending Balance (CH)",
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
                    <td className="px-2 py-1">{usd(r.karl401kBal)}</td>
                    <td className="px-2 py-1">{usd(r.frnBal)}</td>
                    <td className="px-2 py-1">{usd(r.frnInterest)}</td>
                    <td className="px-2 py-1">{usd(r.equityBal)}</td>
                    <td className="px-2 py-1">{usd(r.dividends)}</td>
                    <td className="px-2 py-1">{usd(r.eqGrowth)}</td>
                    <td className="px-2 py-1">{usd(-r.marginBal)}</td>
                    <td className="px-2 py-1">{usd(-r.marginInt)}</td>
                    <td className="px-2 py-1">{usd(r.abnBal)}</td>
                    <td className="px-2 py-1">{usd(r.abnEarnings)}</td>
                    <td className="px-2 py-1">{usd(r.nlDeemedOrActual)}</td>
                    <td className="px-2 py-1">{usd(r.nlMarginDeduction)}</td>
                    <td className="px-2 py-1">{usd(r.nlAllowance)}</td>
                    <td className="px-2 py-1">{usd(r.nlTaxable)}</td>
                    <td className="px-2 py-1">{pct(r.nlTaxRate)}</td>
                    <td className="px-2 py-1">{usd(r.nlBox3Tax)}</td>
                    <td className="px-2 py-1">{usd(r.nlFtcCredit)}</td>
                    <td className="px-2 py-1">{usd(r.chNetWealthUsd)}</td>
                    <td className="px-2 py-1">{Math.round(r.chNetWealthChf).toLocaleString("en-US")}</td>
                    <td className="px-2 py-1">{Math.round(r.chCantonalBasicTax).toLocaleString("en-US")}</td>
                    <td className="px-2 py-1">{Math.round(r.chMunicipalTax).toLocaleString("en-US")}</td>
                    <td className="px-2 py-1">{Math.round(r.chTotalWealthTaxChf).toLocaleString("en-US")}</td>
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

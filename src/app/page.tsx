"use client";

import { useMemo, useState } from "react";
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
  startYear: number;
  currentAge: number;
  horizonAge: number;
  annualWithdrawal: number;
  jpmFrn: number;
  jpmEquities: number;
  jpmMargin: number;
  abnBalance: number;
  frnRate: number;
  dividendRate: number;
  equityGrowthRate: number;
  marginRate: number;
  abnReturnRate: number;
  annualKcaIncome: number;
  kcaIncomeEndAge: number;
  karlSsiMonthly: number;
  kellySsiMonthly: number;
  ssiHaircutPct: number;
  kelly401k: number;
  karl401k: number;
  k401kGrowthRate: number;
  moveToChYear: number;
  usdChf: number;
  zurichMultiplier: number;
  nlBox3InvestmentRate: number;
  nlBox3DebtRate: number;
  nlBox3TransitionYear: number;
};

type Row = {
  age: number;
  year: number;
  beginningBalance: number;
  frnInterest: number;
  dividends: number;
  equityGrowth: number;
  marginInterest: number;
  kcaIncome: number;
  ssi: number;
  k401kWithdrawal: number;
  tax: number;
  taxBreakdown: string;
  withdrawals: number;
  endingBalance: number;
};

const initialInputs: Inputs = {
  startYear: 2026,
  currentAge: 58,
  horizonAge: 92,
  annualWithdrawal: 300000,
  jpmFrn: 4_100_069,
  jpmEquities: 7_731_381,
  jpmMargin: -6_451_994,
  abnBalance: 1_206_187,
  frnRate: 4.34,
  dividendRate: 2.65,
  equityGrowthRate: 2.65,
  marginRate: 5.678,
  abnReturnRate: 0,
  annualKcaIncome: 0,
  kcaIncomeEndAge: 65,
  karlSsiMonthly: 3750,
  kellySsiMonthly: 3000,
  ssiHaircutPct: 80,
  kelly401k: 0,
  karl401k: 0,
  k401kGrowthRate: 5.3,
  moveToChYear: 2028,
  usdChf: 0.9,
  zurichMultiplier: 1.19,
  nlBox3InvestmentRate: 6.04,
  nlBox3DebtRate: 2.47,
  nlBox3TransitionYear: 2028,
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function dutchBox1TaxCost(income: number): number {
  if (income <= 0) return 0;
  const taxable = income * 0.7;
  if (income > 114_285.72) {
    return Math.max(0, ((taxable - 80_000) * 0.495) + 30_000);
  }
  return Math.max(0, taxable * 0.3697);
}

function zurichWealthTaxCostUsd(
  usdNetWealth: number,
  usdChf: number,
  multiplier: number
): number {
  const chf = Math.max(0, usdNetWealth * usdChf);
  const brackets = [
    { upTo: 161_000, rate: 0 },
    { upTo: 403_000, rate: 0.0005 },
    { upTo: 805_000, rate: 0.001 },
    { upTo: 1_451_000, rate: 0.0015 },
    { upTo: 2_418_000, rate: 0.002 },
    { upTo: 3_385_000, rate: 0.0025 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.003 },
  ];

  let prev = 0;
  let tax = 0;
  for (const b of brackets) {
    const taxable = Math.max(0, Math.min(chf, b.upTo) - prev);
    tax += taxable * b.rate;
    prev = b.upTo;
    if (chf <= b.upTo) break;
  }
  return (tax * multiplier) / Math.max(usdChf, 0.0001);
}

function simulate(inputs: Inputs, scenario: "CH" | "NL"): Row[] {
  const years = inputs.horizonAge - inputs.currentAge + 1;
  let frn = inputs.jpmFrn;
  let eq = inputs.jpmEquities;
  let margin = inputs.jpmMargin;
  let abn = inputs.abnBalance;
  let k401k = inputs.kelly401k + inputs.karl401k;

  const rows: Row[] = [];

  for (let i = 0; i < years; i++) {
    const age = inputs.currentAge + i;
    const year = inputs.startYear + i;

    const beginningBalance = frn + eq + margin + abn;
    const frnInterest = frn * (inputs.frnRate / 100);
    const dividends = eq * (inputs.dividendRate / 100);
    const equityGrowth = eq * (inputs.equityGrowthRate / 100);
    const marginInterestCost = Math.abs(margin) * (inputs.marginRate / 100);
    const marginInterest = -marginInterestCost;
    const abnReturn = abn * (inputs.abnReturnRate / 100);

    const kcaIncome = age <= inputs.kcaIncomeEndAge ? inputs.annualKcaIncome : 0;
    const ssi =
      age >= 70
        ? (inputs.karlSsiMonthly + inputs.kellySsiMonthly) * 12 * (inputs.ssiHaircutPct / 100)
        : 0;

    k401k = age < 70 ? k401k * (1 + inputs.k401kGrowthRate / 100) : k401k;
    const k401kWithdrawal = age >= 70 ? Math.min(k401k, inputs.annualWithdrawal * 0.2) : 0;
    k401k -= k401kWithdrawal;

    let taxCost = 0;
    let taxBreakdown = "";
    const box1 = dutchBox1TaxCost(kcaIncome);

    if (scenario === "CH") {
      if (year < inputs.moveToChYear) {
        taxCost = box1;
        taxBreakdown = `NL Box 1 on KCA: ${fmtCurrency(box1)}`;
      } else {
        const wealth = zurichWealthTaxCostUsd(
          beginningBalance,
          inputs.usdChf,
          inputs.zurichMultiplier
        );
        taxCost = box1 + wealth;
        taxBreakdown = `CH Wealth Tax: ${fmtCurrency(wealth)} + NL Box 1: ${fmtCurrency(box1)}`;
      }
    } else {
      let box3 = 0;
      if (year < inputs.nlBox3TransitionYear) {
        const deemed =
          (Math.max(0, frn + eq + abn) * (inputs.nlBox3InvestmentRate / 100)) -
          (Math.abs(margin) * (inputs.nlBox3DebtRate / 100)) -
          3600;
        box3 = Math.max(0, deemed * 0.36);
        taxBreakdown = `NL Box 3 deemed: ${fmtCurrency(box3)} + NL Box 1: ${fmtCurrency(box1)}`;
      } else {
        const actual = frnInterest + dividends + equityGrowth - marginInterestCost - 3600;
        box3 = Math.max(0, actual * 0.36);
        taxBreakdown = `NL Box 3 actual: ${fmtCurrency(box3)} + NL Box 1: ${fmtCurrency(box1)}`;
      }
      taxCost = box1 + box3;
    }

    const withdrawals = inputs.annualWithdrawal;

    const endingBalance =
      beginningBalance +
      frnInterest +
      dividends +
      equityGrowth +
      marginInterest +
      abnReturn +
      kcaIncome +
      ssi +
      k401kWithdrawal -
      taxCost -
      withdrawals;

    frn += frnInterest;
    eq += dividends + equityGrowth;
    margin -= marginInterestCost;
    abn += abnReturn;

    const portfolioWithdrawal = withdrawals * 0.7;
    const abnWithdrawal = withdrawals * 0.3;

    const investTotal = Math.max(1, frn + eq);
    frn -= portfolioWithdrawal * (frn / investTotal);
    eq -= portfolioWithdrawal * (eq / investTotal);
    abn -= abnWithdrawal;

    rows.push({
      age,
      year,
      beginningBalance,
      frnInterest,
      dividends,
      equityGrowth,
      marginInterest,
      kcaIncome,
      ssi,
      k401kWithdrawal,
      tax: -taxCost,
      taxBreakdown,
      withdrawals: -withdrawals,
      endingBalance,
    });
  }

  return rows;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-slate-200">{label}</span>
      <div className="grid grid-cols-3 items-center gap-2">
        <input
          className="col-span-2"
          type="range"
          value={value}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-100"
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </label>
  );
}

function getStatusClass(row: Row, annualWithdrawal: number) {
  if (row.endingBalance < annualWithdrawal * 2) return "bg-red-50";
  if (row.endingBalance < row.beginningBalance) return "bg-amber-50";
  return "bg-emerald-50";
}

export default function Home() {
  const [inputs, setInputs] = useState<Inputs>(initialInputs);

  const chRows = useMemo(() => simulate(inputs, "CH"), [inputs]);
  const nlRows = useMemo(() => simulate(inputs, "NL"), [inputs]);

  const metrics = useMemo(() => {
    const chTotalTax = chRows.reduce((a, r) => a + Math.abs(r.tax), 0);
    const nlTotalTax = nlRows.reduce((a, r) => a + Math.abs(r.tax), 0);
    const chRunOut = chRows.find((r) => r.endingBalance <= 0)?.year ?? null;
    const nlRunOut = nlRows.find((r) => r.endingBalance <= 0)?.year ?? null;
    const avgCh = chTotalTax / chRows.length;
    const avgNl = nlTotalTax / nlRows.length;
    let breakEven: number | null = null;
    let running = 0;
    for (let i = 0; i < chRows.length; i++) {
      running += Math.abs(chRows[i].tax) - Math.abs(nlRows[i].tax);
      if (running > 0) {
        breakEven = chRows[i].year;
        break;
      }
    }
    return { chTotalTax, nlTotalTax, chRunOut, nlRunOut, avgCh, avgNl, breakEven };
  }, [chRows, nlRows]);

  const chartData = chRows.map((r, idx) => ({
    year: r.year,
    CH: Math.round(r.endingBalance),
    NL: Math.round(nlRows[idx].endingBalance),
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1500px] p-4 md:p-8">
        <header className="mb-6 rounded-xl border border-amber-400/30 bg-slate-900 p-6">
          <h1 className="text-2xl font-semibold text-amber-300">KCA Retirement Projection Calculator</h1>
          <p className="mt-1 text-sm text-slate-300">
            Switzerland (Zurich) vs Netherlands drawdown and tax scenario modeling.
          </p>
          <button
            className="no-print mt-3 rounded bg-amber-400 px-3 py-1 text-sm font-semibold text-slate-900"
            onClick={() => window.print()}
          >
            Print-Friendly Table
          </button>
        </header>

        <section className="no-print mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-slate-900 p-4">CH Total Taxes: <b>{fmtCurrency(metrics.chTotalTax)}</b></div>
          <div className="rounded-lg bg-slate-900 p-4">NL Total Taxes: <b>{fmtCurrency(metrics.nlTotalTax)}</b></div>
          <div className="rounded-lg bg-slate-900 p-4">Year Money Runs Out (CH/NL): <b>{metrics.chRunOut ?? "N/A"} / {metrics.nlRunOut ?? "N/A"}</b></div>
          <div className="rounded-lg bg-slate-900 p-4">Avg Annual Tax (CH/NL): <b>{fmtCurrency(metrics.avgCh)} / {fmtCurrency(metrics.avgNl)}</b></div>
          <div className="rounded-lg bg-slate-900 p-4 md:col-span-2 xl:col-span-4">Break-even year (NL cumulative taxes lower): <b>{metrics.breakEven ?? "No break-even"}</b></div>
        </section>

        <section className="no-print mb-6 rounded-xl bg-slate-900 p-4">
          <h2 className="mb-4 text-lg font-semibold text-amber-300">Inputs</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberInput label="Current Age" value={inputs.currentAge} min={40} max={80} onChange={(v) => setInputs({ ...inputs, currentAge: v })} />
            <NumberInput label="Planning Horizon Age" value={inputs.horizonAge} min={70} max={100} onChange={(v) => setInputs({ ...inputs, horizonAge: v })} />
            <NumberInput label="Annual Withdrawal" value={inputs.annualWithdrawal} min={0} max={800000} step={1000} onChange={(v) => setInputs({ ...inputs, annualWithdrawal: v })} />
            <NumberInput label="JPM FRN" value={inputs.jpmFrn} min={0} max={10000000} step={1000} onChange={(v) => setInputs({ ...inputs, jpmFrn: v })} />
            <NumberInput label="JPM Equities" value={inputs.jpmEquities} min={0} max={15000000} step={1000} onChange={(v) => setInputs({ ...inputs, jpmEquities: v })} />
            <NumberInput label="JPM Margin Loan (negative)" value={inputs.jpmMargin} min={-12000000} max={0} step={1000} onChange={(v) => setInputs({ ...inputs, jpmMargin: v })} />
            <NumberInput label="ABN AMRO Balance" value={inputs.abnBalance} min={0} max={5000000} step={1000} onChange={(v) => setInputs({ ...inputs, abnBalance: v })} />
            <NumberInput label="FRN Interest Rate %" value={inputs.frnRate} min={0} max={12} step={0.01} onChange={(v) => setInputs({ ...inputs, frnRate: v })} />
            <NumberInput label="Dividend Yield %" value={inputs.dividendRate} min={0} max={12} step={0.01} onChange={(v) => setInputs({ ...inputs, dividendRate: v })} />
            <NumberInput label="Equity Growth Rate %" value={inputs.equityGrowthRate} min={-10} max={15} step={0.01} onChange={(v) => setInputs({ ...inputs, equityGrowthRate: v })} />
            <NumberInput label="Margin Interest Rate %" value={inputs.marginRate} min={0} max={15} step={0.001} onChange={(v) => setInputs({ ...inputs, marginRate: v })} />
            <NumberInput label="ABN Return Rate %" value={inputs.abnReturnRate} min={-5} max={10} step={0.01} onChange={(v) => setInputs({ ...inputs, abnReturnRate: v })} />
            <NumberInput label="Annual KCA Income" value={inputs.annualKcaIncome} min={0} max={1000000} step={1000} onChange={(v) => setInputs({ ...inputs, annualKcaIncome: v })} />
            <NumberInput label="KCA Income End Age" value={inputs.kcaIncomeEndAge} min={58} max={90} onChange={(v) => setInputs({ ...inputs, kcaIncomeEndAge: v })} />
            <NumberInput label="Karl SSI Monthly @70" value={inputs.karlSsiMonthly} min={0} max={8000} step={50} onChange={(v) => setInputs({ ...inputs, karlSsiMonthly: v })} />
            <NumberInput label="Kelly SSI Monthly @70" value={inputs.kellySsiMonthly} min={0} max={8000} step={50} onChange={(v) => setInputs({ ...inputs, kellySsiMonthly: v })} />
            <NumberInput label="SSI Solvency Haircut %" value={inputs.ssiHaircutPct} min={50} max={100} step={1} onChange={(v) => setInputs({ ...inputs, ssiHaircutPct: v })} />
            <NumberInput label="Kelly 401k" value={inputs.kelly401k} min={0} max={4000000} step={1000} onChange={(v) => setInputs({ ...inputs, kelly401k: v })} />
            <NumberInput label="Karl 401k" value={inputs.karl401k} min={0} max={4000000} step={1000} onChange={(v) => setInputs({ ...inputs, karl401k: v })} />
            <NumberInput label="401k Growth Rate %" value={inputs.k401kGrowthRate} min={0} max={12} step={0.01} onChange={(v) => setInputs({ ...inputs, k401kGrowthRate: v })} />
            <NumberInput label="Move to CH Year" value={inputs.moveToChYear} min={2026} max={2050} onChange={(v) => setInputs({ ...inputs, moveToChYear: v })} />
            <NumberInput label="USD/CHF" value={inputs.usdChf} min={0.5} max={1.2} step={0.01} onChange={(v) => setInputs({ ...inputs, usdChf: v })} />
            <NumberInput label="Zurich Municipal Multiplier" value={inputs.zurichMultiplier} min={1} max={1.5} step={0.01} onChange={(v) => setInputs({ ...inputs, zurichMultiplier: v })} />
            <NumberInput label="NL Box 3 Deemed Return Investments %" value={inputs.nlBox3InvestmentRate} min={0} max={12} step={0.01} onChange={(v) => setInputs({ ...inputs, nlBox3InvestmentRate: v })} />
            <NumberInput label="NL Box 3 Deemed Return Debts %" value={inputs.nlBox3DebtRate} min={0} max={10} step={0.01} onChange={(v) => setInputs({ ...inputs, nlBox3DebtRate: v })} />
            <NumberInput label="NL Box 3 Transition Year" value={inputs.nlBox3TransitionYear} min={2026} max={2050} onChange={(v) => setInputs({ ...inputs, nlBox3TransitionYear: v })} />
          </div>
        </section>

        <section className="mb-6 rounded-xl bg-white p-4 text-slate-900">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Ending Balance Projection</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                <Tooltip formatter={(value: number | string | undefined) => fmtCurrency(Number(value ?? 0))} />
                <Legend />
                <Line type="monotone" dataKey="CH" stroke="#b45309" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="NL" stroke="#0f766e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {[
            { title: "CH (Zurich)", rows: chRows },
            { title: "NL (Netherlands)", rows: nlRows },
          ].map((s) => (
            <div key={s.title} className="overflow-x-auto rounded-xl bg-white p-3 text-slate-900">
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    {[
                      "Age",
                      "Year",
                      "Beginning Balance",
                      "FRN Interest",
                      "Dividends",
                      "Equity Growth",
                      "Margin Interest",
                      "KCA Income",
                      "SSI",
                      "Tax",
                      "Withdrawals",
                      "Ending Balance",
                    ].map((h) => (
                      <th key={h} className="px-2 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r) => (
                    <tr key={`${s.title}-${r.year}`} className={getStatusClass(r, inputs.annualWithdrawal)}>
                      <td className="px-2 py-1">{r.age}</td>
                      <td className="px-2 py-1">{r.year}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.beginningBalance)}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.frnInterest)}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.dividends)}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.equityGrowth)}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.marginInterest)}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.kcaIncome)}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.ssi + r.k401kWithdrawal)}</td>
                      <td className="px-2 py-1" title={r.taxBreakdown}>{fmtCurrency(r.tax)}</td>
                      <td className="px-2 py-1">{fmtCurrency(r.withdrawals)}</td>
                      <td className="px-2 py-1 font-semibold">{fmtCurrency(r.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

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
  liquidationProceeds: number;
  capGainsTax: number;
  totalIncome: number;
  withdrawal: number;
  endingBalanceNL: number;
  endingBalanceCH: number;
};

type TaxLot = {
  ticker: string;
  desc: string;
  value: number;
  cost: number;
  gain: number;
  acqDate: string;
  kind: "equity" | "frn";
};

type LiquidationEvent = {
  lotIndex: number;
  proceeds: number;
  tax: number;
  kind: "equity" | "frn";
  value: number;
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

const TAX_LOTS: TaxLot[] = [
  {ticker:"IJS",desc:"iShares S&P SmallCap 600 Value",value:34890.8,cost:24854.2,gain:10036.6,acqDate:"06/21/2022",kind:"equity"},
  {ticker:"IWD",desc:"iShares Russell 1000 Value",value:116064,cost:75205.8,gain:40858.2,acqDate:"06/21/2022",kind:"equity"},
  {ticker:"VOO",desc:"Vanguard S&P 500 ETF",value:543211.35,cost:300224.27,gain:242987.08,acqDate:"06/21/2022",kind:"equity"},
  {ticker:"IWD",desc:"iShares Russell 1000 Value",value:214272,cost:150345.42,gain:63926.58,acqDate:"04/19/2021",kind:"equity"},
  {ticker:"IWF",desc:"iShares Russell 1000 Growth",value:69649.25,cost:40309.98,gain:29339.27,acqDate:"04/19/2021",kind:"equity"},
  {ticker:"SPXT",desc:"ProShares S&P 500 Ex-Tech",value:221228.8,cost:150322.36,gain:70906.44,acqDate:"04/19/2021",kind:"equity"},
  {ticker:"BABA",desc:"Alibaba Group ADR",value:5440.05,cost:8577.53,gain:-3137.48,acqDate:"04/12/2021",kind:"equity"},
  {ticker:"IJS",desc:"iShares S&P SmallCap 600 Value",value:304048.4,cost:200320.14,gain:103728.26,acqDate:"12/28/2020",kind:"equity"},
  {ticker:"SPXT",desc:"ProShares S&P 500 Ex-Tech",value:721652.6,cost:437069.03,gain:284583.57,acqDate:"12/18/2020",kind:"equity"},
  {ticker:"SPXT",desc:"ProShares S&P 500 Ex-Tech",value:21272,cost:12896.25,gain:8375.75,acqDate:"12/17/2020",kind:"equity"},
  {ticker:"VOO",desc:"Vanguard S&P 500 ETF",value:1174341.3,cost:499276.77,gain:675064.53,acqDate:"02/28/2020",kind:"equity"},
  {ticker:"IWD",desc:"iShares Russell 1000 Value",value:363816,cost:187616.86,gain:176199.14,acqDate:"01/14/2019",kind:"equity"},
  {ticker:"IWF",desc:"iShares Russell 1000 Growth",value:620103,cost:187457.59,gain:432645.41,acqDate:"01/14/2019",kind:"equity"},
  {ticker:"VOO",desc:"Vanguard S&P 500 ETF",value:992224.2,cost:375973.89,gain:616250.31,acqDate:"01/14/2019",kind:"equity"},
  {ticker:"AIG",desc:"American International Group",value:116638.6,cost:37430.12,gain:79208.48,acqDate:"06/11/2018",kind:"equity"},
  {ticker:"C",desc:"Citigroup Inc",value:139949.4,cost:43050,gain:96899.4,acqDate:"06/11/2018",kind:"equity"},
  {ticker:"VOO",desc:"Vanguard S&P 500 ETF",value:913725.45,cost:231170.4,gain:682555.05,acqDate:"06/11/2018",kind:"equity"},
  {ticker:"BABA",desc:"Alibaba Group ADR",value:3885.75,cost:1700,gain:2185.75,acqDate:"09/18/2014",kind:"equity"},
  {ticker:"VOO",desc:"Vanguard S&P 500 ETF",value:304575.15,cost:88326.51,gain:216248.64,acqDate:"07/02/2014",kind:"equity"},
  {ticker:"VOO",desc:"Vanguard S&P 500 ETF",value:361094.25,cost:75321.33,gain:285772.92,acqDate:"12/07/2012",kind:"equity"},
  {ticker:"META",desc:"Meta Platforms Inc",value:95893.5,cost:5700,gain:90193.5,acqDate:"05/17/2012",kind:"equity"},
  {ticker:"MSFT",desc:"Microsoft Corp",value:270658.52,cost:16593.06,gain:254065.46,acqDate:"08/20/2010",kind:"equity"},
  {ticker:"",desc:"UPS Quarterly FRN 02/23/01 Due 12/21/50",value:129889.06,cost:131005,gain:-1115.94,acqDate:"12/06/2018",kind:"frn"},
  {ticker:"",desc:"Florida P&L 11/14/18 Due 11/14/68",value:492780.93,cost:500000,gain:-7219.07,acqDate:"11/08/2018",kind:"frn"},
  {ticker:"",desc:"Bank of America VR 08/31/18 Due 08/31/58",value:319362.69,cost:318937.35,gain:425.34,acqDate:"08/28/2018",kind:"frn"},
  {ticker:"",desc:"Florida P&L 1st Mtg 06/15/18 Due 06/15/68",value:494973.05,cost:500000,gain:-5026.95,acqDate:"06/12/2018",kind:"frn"},
  {ticker:"",desc:"UPS 09/17/15 Due 09/15/65",value:149369.94,cost:150005,gain:-635.06,acqDate:"04/30/2018",kind:"frn"},
  {ticker:"",desc:"UPS 09/17/15 Due 09/15/65",value:149369.94,cost:150005,gain:-635.06,acqDate:"04/27/2018",kind:"frn"},
  {ticker:"",desc:"Citigroup Global Mkts VR 04/30/18 Due 04/30/58",value:222036.75,cost:220611.77,gain:1424.98,acqDate:"04/25/2018",kind:"frn"},
  {ticker:"",desc:"US Bank Natl Assn Cincinnati",value:296972.31,cost:300000,gain:-3027.69,acqDate:"03/26/2018",kind:"frn"},
  {ticker:"",desc:"Procter & Gamble 08/22/17 Due 08/22/67",value:218823.57,cost:221000,gain:-2176.43,acqDate:"08/18/2017",kind:"frn"},
  {ticker:"",desc:"UPS 03/31/17 Due 03/15/67",value:198427.52,cost:200000,gain:-1572.48,acqDate:"03/28/2017",kind:"frn"},
  {ticker:"",desc:"US Bank Natl Assn Minneapolis",value:188049.76,cost:190000,gain:-1950.24,acqDate:"02/10/2017",kind:"frn"},
  {ticker:"",desc:"Colgate-Palmolive Medium Term Nts",value:99475.88,cost:100005,gain:-529.12,acqDate:"12/03/2012",kind:"frn"},
  {ticker:"",desc:"UPS Sr Nt FRN 06/29/01 Due 06/21/51",value:99764.61,cost:100005,gain:-240.39,acqDate:"11/16/2012",kind:"frn"},
  {ticker:"",desc:"3M Medium Term Note #018",value:99290.5,cost:100000.3,gain:-709.8,acqDate:"11/15/2012",kind:"frn"},
  {ticker:"",desc:"JP Morgan Chase 11/30/07 Due 11/15/47",value:49612.66,cost:49560.95,gain:51.71,acqDate:"10/22/2012",kind:"frn"},
  {ticker:"",desc:"JP Morgan Chase 11/30/07 Due 11/15/47",value:49612.66,cost:49442.67,gain:169.99,acqDate:"10/19/2012",kind:"frn"},
  {ticker:"",desc:"UPS Quarterly FRN 02/23/01 Due 12/21/50",value:173515.92,cost:175005,gain:-1489.08,acqDate:"08/28/2012",kind:"frn"},
  {ticker:"",desc:"Colgate-Palmolive Medium Term Nts",value:174082.8,cost:175005,gain:-922.2,acqDate:"07/13/2012",kind:"frn"},
  {ticker:"",desc:"GE Capital Medium Term Nts",value:173818.96,cost:175005,gain:-1186.04,acqDate:"07/13/2012",kind:"frn"},
  {ticker:"",desc:"Procter & Gamble FRN 09/10/08 Due 09/15/58",value:172304.63,cost:175005,gain:-2700.37,acqDate:"07/13/2012",kind:"frn"},
  {ticker:"",desc:"Wells Fargo Medium Term Sr Nts",value:148446.32,cost:150005,gain:-1558.68,acqDate:"05/23/2012",kind:"frn"},
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

function runOneScenario(
  inputs: Inputs,
  baseWithdrawal: number,
  scenario: 'NL' | 'CH',
  liquidationByYear?: Map<number, LiquidationEvent[]>,
  ftcOffsetEnabled?: boolean,
  ltcgRate?: number
) {
  const results: { tax: number; frnBal: number; eqBal: number; marginBal: number; abnBal: number; kelly401k: number; karl401k: number; kelly401kWithdrawal: number; karl401kWithdrawal: number; endingBalance: number; frnInterest: number; dividends: number; eqGrowth: number; marginInt: number; abnEarnings: number; karlSsi: number; kellySsi: number; totalIncome: number; withdrawal: number; nlDeemedOrActual: number; nlMarginDeduction: number; nlTaxable: number; chNetWealthUsd: number; chNetWealthChf: number; chCantonalBasicTax: number; chMunicipalTax: number; chTotalWealthTaxChf: number; chWealthTaxUsd: number; chInvestmentIncome: number; chIncomeTax: number; capGainsTax: number; box3TaxForFTC: number; liquidationProceeds: number }[] = [];

  let frn = inputs.frnBalance;
  let eq = inputs.equitiesBalance;
  let margin = inputs.marginLoan;
  let abn = inputs.abnBalance;
  let kelly401k = inputs.kelly401k;
  let karl401k = inputs.karl401k;
  let nlLossCarryforward = 0;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const age = year - 1967;

    // === LIQUIDATION PROCESSING ===
    const liquidations = liquidationByYear?.get(year) || [];
    let capGainsTax = 0;
    let liquidationProceeds = 0;
    
    for (const liq of liquidations) {
      capGainsTax += liq.tax;
      liquidationProceeds += liq.proceeds - liq.tax;
      
      // Remove from pools — use proceeds (grown value) for equity, value for FRN
      if (liq.kind === "equity") {
        eq = Math.max(0, eq - liq.proceeds);
      } else {
        frn = Math.max(0, frn - liq.proceeds);
      }
    }
    
    // Liquidation is a balance sheet event: net proceeds go directly to margin paydown
    margin = Math.max(0, margin - liquidationProceeds);

    const frnInterest = frn * (inputs.frnRate / 100);
    const dividends = eq * (inputs.dividendYield / 100);
    const eqGrowth = eq * (inputs.equityGrowthRate / 100);
    const marginInt = margin * (inputs.marginRate / 100);
    const abnRate = (inputs.dividendYield + inputs.equityGrowthRate) / 100;
    const abnEarnings = abn * abnRate;
    const kelly401kEarn = kelly401k * (inputs.k401kGrowthRate / 100);
    const karl401kEarn = karl401k * (inputs.k401kGrowthRate / 100);

    // 401k withdrawals: draw down to $0 by end of 2037, starting in 2030 (8 years)
    let kelly401kWithdrawal = 0;
    let karl401kWithdrawal = 0;
    if (year >= 2030 && year <= 2037) {
      const r = inputs.k401kGrowthRate / 100;
      const remainingYears = 2037 - year + 1;
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
    let box3TaxForFTC = 0;

    if (useNLTax) {
      const nlPre2028 = year < 2028;
      nlDeemedOrActual = nlPre2028 ? (frn + eq) * 0.0604 : frnInterest + dividends + eqGrowth;
      nlMarginDeduction = nlPre2028 ? margin * 0.0247 : marginInt;
      const taxableBeforeAllowance = nlDeemedOrActual - nlMarginDeduction;
      const taxableWithAllowance = taxableBeforeAllowance - NL_ALLOWANCE;
      const netTaxableAfterLoss = taxableWithAllowance - nlLossCarryforward;
      nlTaxable = Math.max(0, netTaxableAfterLoss);
      nlLossCarryforward = Math.max(0, -netTaxableAfterLoss);
      box3TaxForFTC = nlTaxable * NL_TAX_RATE;
      
      tax = box3TaxForFTC;
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
      chInvestmentIncome = Math.max(0, frnInterest + dividends - marginInt);
      chIncomeTax = chInvestmentIncome * CH_INVESTMENT_TAX_RATE;
      tax = chWealthTaxUsd + chIncomeTax;
    }

    const withdrawal = baseWithdrawal * getCurveMultiplier(age);

    // === CASH FLOW WATERFALL ===
    const totalCashIncome = karlSsi + kellySsi + frnInterest + dividends + kelly401kWithdrawal + karl401kWithdrawal;

    const netCashFlow = totalCashIncome - tax - withdrawal;

    const jpmShare = inputs.jpmWithdrawalShare / 100;
    if (netCashFlow < 0) {
      const shortfall = -netCashFlow;
      let jpmDraw = shortfall * jpmShare;
      let abnDraw = shortfall * (1 - jpmShare);

      const marginCap = frn * 0.9 + eq * 0.5;
      if (margin + jpmDraw > marginCap) {
        const maxAdd = Math.max(0, marginCap - margin);
        jpmDraw = maxAdd;
        abnDraw = shortfall - jpmDraw;
      }
      if (abnDraw > abn) {
        abnDraw = Math.max(0, abn);
        const remaining = shortfall - jpmDraw - abnDraw;
        const room = Math.max(0, (frn * 0.9 + eq * 0.5) - margin - jpmDraw);
        jpmDraw += Math.min(remaining, room);
      }

      margin += jpmDraw;
      abn = Math.max(0, abn - abnDraw);
    } else {
      margin = Math.max(0, margin - netCashFlow);
    }

    // === BALANCE GROWTH ===
    margin += marginInt;
    eq += eqGrowth;
    abn += abnEarnings;
    kelly401k += kelly401kEarn - kelly401kWithdrawal;
    karl401k += karl401kEarn - karl401kWithdrawal;
    kelly401k = Math.max(0, kelly401k);
    karl401k = Math.max(0, karl401k);

    frn = Math.max(0, frn);
    eq = Math.max(0, eq);

    // === MARGIN CAP ENFORCEMENT ===
    const finalMarginCap = frn * 0.9 + eq * 0.5;
    if (margin > finalMarginCap) {
      const excess = margin - finalMarginCap;
      const abnPaydown = Math.min(excess, abn);
      abn -= abnPaydown;
      margin -= abnPaydown;
      if (margin > finalMarginCap) {
        const stillOver = margin - finalMarginCap;
        const eqToSell = Math.min(eq, 2 * stillOver);
        eq -= eqToSell;
        margin -= eqToSell;
      }
    }

    const endingBalance = frn + eq + abn + kelly401k + karl401k - margin;
    const totalIncome = frnInterest + dividends - marginInt + karlSsi + kellySsi + kelly401kWithdrawal + karl401kWithdrawal;

    results.push({ tax, frnBal: frn, eqBal: eq, marginBal: margin, abnBal: abn, kelly401k, karl401k, kelly401kWithdrawal, karl401kWithdrawal, endingBalance, frnInterest, dividends, eqGrowth, marginInt, abnEarnings, karlSsi, kellySsi, totalIncome, withdrawal, nlDeemedOrActual, nlMarginDeduction, nlTaxable, chNetWealthUsd, chNetWealthChf, chCantonalBasicTax, chMunicipalTax, chTotalWealthTaxChf, chWealthTaxUsd, chInvestmentIncome, chIncomeTax, capGainsTax, box3TaxForFTC, liquidationProceeds });
  }
  return results;
}

function runProjection(
  inputs: Inputs,
  baseWithdrawal: number,
  liquidationByYear?: Map<number, LiquidationEvent[]>,
  ftcOffsetEnabled?: boolean,
  ltcgRate?: number
): YearRow[] {
  const nlResults = runOneScenario(inputs, baseWithdrawal, 'NL', liquidationByYear, ftcOffsetEnabled, ltcgRate);
  const chResults = runOneScenario(inputs, baseWithdrawal, 'CH', liquidationByYear, ftcOffsetEnabled, ltcgRate);
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
      nlTaxRate: NL_TAX_RATE, nlBox3Tax: nl.tax, nlFtcCredit: nl.box3TaxForFTC,
      chNetWealthUsd: ch.chNetWealthUsd, chNetWealthChf: ch.chNetWealthChf,
      chCantonalBasicTax: ch.chCantonalBasicTax, chMunicipalTax: ch.chMunicipalTax,
      chTotalWealthTaxChf: ch.chTotalWealthTaxChf,
      chTotalWealthTaxUsd: ch.chWealthTaxUsd,
      chInvestmentIncome: ch.chInvestmentIncome, chIncomeTax: ch.chIncomeTax,
      chTotalTax: ch.tax,
      liquidationProceeds: nl.liquidationProceeds,
      capGainsTax: nl.capGainsTax,
      totalIncome: nl.totalIncome, withdrawal: nl.withdrawal,
      endingBalanceNL: nl.endingBalance, endingBalanceCH: ch.endingBalance,
    });
  }
  return rows;
}

function solveBaseWithdrawal(
  inputs: Inputs,
  target: 'NL' | 'CH',
  liquidationByYear?: Map<number, LiquidationEvent[]>,
  ftcOffsetEnabled?: boolean,
  ltcgRate?: number
) {
  let low = 0;
  let high = 5_000_000;
  let best = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const rows = runProjection(inputs, mid, liquidationByYear, ftcOffsetEnabled, ltcgRate);
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
  const [tab, setTab] = useState<"summary" | "detail" | "liquidation">("summary");
  const [inputsOpen, setInputsOpen] = useState(true);
  const [manualWithdrawal, setManualWithdrawal] = useState<number | null>(null);
  const [autoSolve, setAutoSolve] = useState(true);
  const [solveTarget, setSolveTarget] = useState<'NL' | 'CH'>('NL');
  
  // Liquidation state
  const [lotAssignments, setLotAssignments] = useState<Map<number, "hold" | 2026 | 2027 | 2028 | 2029 | 2030>>(
    new Map(TAX_LOTS.map((_, i) => [i, "hold"]))
  );
  const [ftcOffsetEnabled, setFtcOffsetEnabled] = useState(false);
  const [ltcgRate, setLtcgRate] = useState(20);
  const [frnBasisOverride, setFrnBasisOverride] = useState(true);
  const [optimizedSchedule, setOptimizedSchedule] = useState<Map<number, "hold" | 2026 | 2027 | 2028 | 2029 | 2030> | null>(null);

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setTab(isMobile ? "summary" : "detail");
  }, []);

  // Compute liquidation events from assignments
  const liquidationByYear = useMemo(() => {
    const map = new Map<number, LiquidationEvent[]>();
    const growthRate = inputs.equityGrowthRate / 100;
    const effectiveLtcgRate = ltcgRate / 100;
    
    lotAssignments.forEach((year, lotIndex) => {
      if (year === "hold") return;
      
      const lot = TAX_LOTS[lotIndex];
      let proceeds = lot.value;
      let basis = lot.cost;
      
      // Apply FRN basis override
      if (lot.kind === "frn" && frnBasisOverride) {
        basis = 0;
      }
      
      // Grow equity lots
      if (lot.kind === "equity") {
        const yearsToGrow = year - START_YEAR;
        proceeds = lot.value * Math.pow(1 + growthRate, yearsToGrow);
      }
      
      const gain = proceeds - basis;
      const tax = Math.max(0, gain) * effectiveLtcgRate;
      
      const events = map.get(year) || [];
      events.push({
        lotIndex,
        proceeds,
        tax,
        kind: lot.kind,
        value: proceeds, // Grown value at time of sale
      });
      map.set(year, events);
    });
    
    return map;
  }, [lotAssignments, inputs.equityGrowthRate, ltcgRate, frnBasisOverride]);

  useEffect(() => {
    if (!autoSolve) return;
    const t = setTimeout(() => {
      const solved = solveBaseWithdrawal(inputs, solveTarget, liquidationByYear, ftcOffsetEnabled, ltcgRate);
      setBaseWithdrawal(solved);
      setManualWithdrawal(null);
    }, 300);
    return () => clearTimeout(t);
  }, [inputs, autoSolve, solveTarget, liquidationByYear, ftcOffsetEnabled, ltcgRate]);

  const effectiveWithdrawal = manualWithdrawal ?? baseWithdrawal;
  const rows = useMemo(() => runProjection(inputs, effectiveWithdrawal, liquidationByYear, ftcOffsetEnabled, ltcgRate), [inputs, effectiveWithdrawal, liquidationByYear, ftcOffsetEnabled, ltcgRate]);

  // Baseline (no liquidation)
  const baselineWithdrawal = useMemo(() => {
    return solveBaseWithdrawal(inputs, solveTarget, new Map(), ftcOffsetEnabled, ltcgRate);
  }, [inputs, solveTarget, ftcOffsetEnabled, ltcgRate]);

  const baselineRows = useMemo(() => {
    return runProjection(inputs, baselineWithdrawal, new Map(), ftcOffsetEnabled, ltcgRate);
  }, [inputs, baselineWithdrawal, ftcOffsetEnabled, ltcgRate]);

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

  // Liquidation totals
  const liquidationTotals = useMemo(() => {
    let totalProceeds = 0;
    let totalTax = 0;
    liquidationByYear.forEach((events) => {
      events.forEach((e) => {
        totalProceeds += e.proceeds;
        totalTax += e.tax;
      });
    });
    return { totalProceeds, totalTax, netProceeds: totalProceeds - totalTax };
  }, [liquidationByYear]);

  // Optimizer
  const runOptimizer = () => {
    const newAssignments = new Map(TAX_LOTS.map((_, i) => [i, "hold" as "hold" | 2026 | 2027 | 2028 | 2029 | 2030]));
    let currentBest = solveBaseWithdrawal(inputs, solveTarget, new Map(), ftcOffsetEnabled, ltcgRate);
    
    let improved = true;
    while (improved) {
      improved = false;
      let bestLot = -1;
      let bestYear: 2026 | 2027 | 2028 | 2029 | 2030 | null = null;
      let bestValue = currentBest;
      
      for (let lotIndex = 0; lotIndex < TAX_LOTS.length; lotIndex++) {
        if (newAssignments.get(lotIndex) !== "hold") continue;
        
        for (const year of [2026, 2027, 2028, 2029, 2030] as const) {
          newAssignments.set(lotIndex, year);
          
          // Recompute liquidation map
          const testMap = new Map<number, LiquidationEvent[]>();
          const growthRate = inputs.equityGrowthRate / 100;
          const effectiveLtcgRate = ltcgRate / 100;
          
          newAssignments.forEach((assignedYear, idx) => {
            if (assignedYear === "hold") return;
            const lot = TAX_LOTS[idx];
            let proceeds = lot.value;
            let basis = lot.cost;
            if (lot.kind === "frn" && frnBasisOverride) basis = 0;
            if (lot.kind === "equity") {
              const yearsToGrow = assignedYear - START_YEAR;
              proceeds = lot.value * Math.pow(1 + growthRate, yearsToGrow);
            }
            const gain = proceeds - basis;
            const tax = Math.max(0, gain) * effectiveLtcgRate;
            const events = testMap.get(assignedYear) || [];
            events.push({ lotIndex: idx, proceeds, tax, kind: lot.kind, value: proceeds });
            testMap.set(assignedYear, events);
          });
          
          const testWithdrawal = solveBaseWithdrawal(inputs, solveTarget, testMap, ftcOffsetEnabled, ltcgRate);
          
          if (testWithdrawal > bestValue) {
            bestValue = testWithdrawal;
            bestLot = lotIndex;
            bestYear = year;
            improved = true;
          }
          
          newAssignments.set(lotIndex, "hold");
        }
      }
      
      if (improved && bestLot >= 0 && bestYear) {
        newAssignments.set(bestLot, bestYear);
        currentBest = bestValue;
      }
    }
    
    setOptimizedSchedule(newAssignments);
    setLotAssignments(newAssignments);
  };

  const resetToHold = () => {
    setLotAssignments(new Map(TAX_LOTS.map((_, i) => [i, "hold"])));
    setOptimizedSchedule(null);
  };

  // Sorted lots
  const sortedLots = useMemo(() => {
    const equityLots = TAX_LOTS.map((lot, idx) => ({ lot, idx }))
      .filter((x) => x.lot.kind === "equity")
      .sort((a, b) => b.lot.value - a.lot.value);
    const frnLots = TAX_LOTS.map((lot, idx) => ({ lot, idx }))
      .filter((x) => x.lot.kind === "frn")
      .sort((a, b) => b.lot.value - a.lot.value);
    return [...equityLots, ...frnLots];
  }, []);

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
          <button onClick={() => setTab("liquidation")} className={`rounded px-3 py-1.5 text-sm ${tab === "liquidation" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`}>Liquidation Planner</button>
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
                    "Age", "Year", "Karl SSI Income", "Kelly SSI Income", "Kelly 401k Bal", "Kelly 401k Inc", "Karl 401k Bal", "Karl 401k Inc", "FRN Bal", "FRN Interest", "JPM Equity Bal", "JPM Dividends", "JPM Equity Growth", "JPM Margin Loan Bal", "Margin %", "Margin Int", "ABN Bal", "Liq Proceeds", "Cap Gains Tax", "NL: Deemed/Actual", "NL: Margin Deduction", "NL: Allowance", "NL: Box3 Taxable", "NL: Tax Rate", "NL: Box3 Tax", "NL: FTC Credit", "CH: Net Wealth USD", "CH: Wealth Tax USD", "CH: Net Inv Income", "CH: Income Tax", "CH: Total Tax", "Total Income", "Withdrawal", "Ending Balance (NL)", "Ending Balance (CH)",
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
                    <td className="px-2 py-1">{r.liquidationProceeds > 0 ? usd(r.liquidationProceeds) : '—'}</td>
                    <td className="px-2 py-1 text-red-600">{r.capGainsTax > 0 ? usd(-r.capGainsTax) : '—'}</td>
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

        {tab === "liquidation" && (
          <section className="space-y-4">
            {/* Liquidation Inputs */}
            <div className="rounded-lg border border-slate-300 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold">Liquidation Settings</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={ftcOffsetEnabled}
                    onChange={(e) => setFtcOffsetEnabled(e.target.checked)}
                  />
                  <span>NL Box 3 tax offsets US capital gains</span>
                </label>
                <InputField
                  label="LTCG Rate"
                  value={ltcgRate}
                  onChange={setLtcgRate}
                  suffix="%"
                  step={0.1}
                />
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={frnBasisOverride}
                    onChange={(e) => setFrnBasisOverride(e.target.checked)}
                  />
                  <span>Section 1042 QRP ($0 basis on FRNs)</span>
                </label>
              </div>
            </div>

            {/* Tax Lot Grid */}
            <div className="rounded-lg border border-slate-300 bg-white">
              <div className="border-b border-slate-300 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Tax Lot Schedule</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={resetToHold}
                      className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300"
                    >
                      Reset to Hold
                    </button>
                    <button
                      onClick={runOptimizer}
                      className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Optimize
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-2 py-2 text-left">Ticker</th>
                      <th className="px-2 py-2 text-left">Description</th>
                      <th className="px-2 py-2 text-right">Value</th>
                      <th className="px-2 py-2 text-right">Cost Basis</th>
                      <th className="px-2 py-2 text-right">Unrealized Gain</th>
                      <th className="px-2 py-2 text-right">Tax Cost %</th>
                      <th className="px-2 py-2 text-center">Kind</th>
                      <th className="px-2 py-2 text-center">Hold</th>
                      <th className="px-2 py-2 text-center">2026</th>
                      <th className="px-2 py-2 text-center">2027</th>
                      <th className="px-2 py-2 text-center">2028</th>
                      <th className="px-2 py-2 text-center">2029</th>
                      <th className="px-2 py-2 text-center">2030</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLots.map(({ lot, idx }, i) => {
                      const isEquity = lot.kind === "equity";
                      const isSectionBreak = i > 0 && sortedLots[i - 1].lot.kind !== lot.kind;
                      const assignment = lotAssignments.get(idx) ?? "hold";
                      
                      return (
                        <>
                          {isSectionBreak && (
                            <tr className="bg-slate-100">
                              <td colSpan={13} className="px-2 py-1 text-xs font-semibold text-slate-600">
                                FRN Lots
                              </td>
                            </tr>
                          )}
                          <tr
                            key={idx}
                            className={`border-t border-slate-200 ${isEquity ? "" : "bg-blue-50"}`}
                          >
                            <td className="px-2 py-1.5 font-medium">{lot.ticker || "—"}</td>
                            <td className="px-2 py-1.5">
                              {lot.desc.length > 40 ? lot.desc.substring(0, 40) + "..." : lot.desc}
                            </td>
                            <td className="px-2 py-1.5 text-right">{usd(lot.value)}</td>
                            <td className="px-2 py-1.5 text-right">{usd(lot.kind === "frn" && frnBasisOverride ? 0 : lot.cost)}</td>
                            <td className={`px-2 py-1.5 text-right ${lot.gain < 0 ? "text-red-600" : ""}`}>
                              {usd(lot.kind === "frn" && frnBasisOverride ? lot.value : lot.gain)}
                            </td>
                            <td className={`px-2 py-1.5 text-right ${lot.gain < 0 ? "text-red-600" : ""}`}>
                              {(() => {
                                const effectiveGain = lot.kind === "frn" && frnBasisOverride ? lot.value : lot.gain;
                                return lot.value !== 0 ? `${((effectiveGain / lot.value) * 100).toFixed(1)}%` : "—";
                              })()}
                            </td>
                            <td className="px-2 py-1.5 text-center text-xs uppercase">{lot.kind}</td>
                            {(["hold", 2026, 2027, 2028, 2029, 2030] as const).map((year) => (
                              <td
                                key={year}
                                className={`px-2 py-1.5 text-center ${assignment === year ? "bg-green-100" : ""}`}
                              >
                                <input
                                  type="radio"
                                  name={`lot-${idx}`}
                                  checked={assignment === year}
                                  onChange={() => {
                                    const newMap = new Map(lotAssignments);
                                    newMap.set(idx, year);
                                    setLotAssignments(newMap);
                                  }}
                                  className="h-3 w-3 cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        </>
                      );
                    })}
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-semibold">
                      <td className="px-2 py-2" colSpan={2}>Total Selected for Sale</td>
                      <td className="px-2 py-2 text-right">{usd(liquidationTotals.totalProceeds)}</td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2 text-center text-xs">Tax: {usd(liquidationTotals.totalTax)}</td>
                      <td className="px-2 py-2 text-center text-xs" colSpan={5}>Net Proceeds: {usd(liquidationTotals.netProceeds)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Comparison */}
            <div className="rounded-lg border border-slate-300 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold">Liquidation Impact Summary</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Scenario</th>
                      <th className="px-3 py-2 text-right">Base Withdrawal</th>
                      <th className="px-3 py-2 text-right">Monthly</th>
                      <th className="px-3 py-2 text-right">Lifetime Tax (NL)</th>
                      <th className="px-3 py-2 text-right">Lifetime Tax (CH)</th>
                      <th className="px-3 py-2 text-right">Ending Bal (NL)</th>
                      <th className="px-3 py-2 text-right">Ending Bal (CH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200">
                      <td className="px-3 py-2">No liquidation</td>
                      <td className="px-3 py-2 text-right">{usd(baselineWithdrawal)}</td>
                      <td className="px-3 py-2 text-right">{usd(baselineWithdrawal / 12)}</td>
                      <td className="px-3 py-2 text-right">{usd(baselineRows.reduce((a, r) => a + r.nlBox3Tax, 0))}</td>
                      <td className="px-3 py-2 text-right">{usd(baselineRows.reduce((a, r) => a + r.chTotalTax, 0))}</td>
                      <td className="px-3 py-2 text-right">{usd(baselineRows.at(-1)?.endingBalanceNL ?? 0)}</td>
                      <td className="px-3 py-2 text-right">{usd(baselineRows.at(-1)?.endingBalanceCH ?? 0)}</td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-blue-50">
                      <td className="px-3 py-2 font-semibold">Current schedule</td>
                      <td className="px-3 py-2 text-right font-semibold">{usd(effectiveWithdrawal)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{usd(effectiveWithdrawal / 12)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{usd(totals.totalTaxNL)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{usd(totals.totalTaxCH)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{usd(totals.endingNL)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{usd(totals.endingCH)}</td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-green-50">
                      <td className="px-3 py-2">Δ vs. baseline</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">
                        {effectiveWithdrawal > baselineWithdrawal ? "+" : ""}
                        {usd(effectiveWithdrawal - baselineWithdrawal)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">
                        {effectiveWithdrawal > baselineWithdrawal ? "+" : ""}
                        {usd((effectiveWithdrawal - baselineWithdrawal) / 12)}
                      </td>
                      <td className="px-3 py-2 text-right"></td>
                      <td className="px-3 py-2 text-right"></td>
                      <td className="px-3 py-2 text-right"></td>
                      <td className="px-3 py-2 text-right"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart */}
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
      </div>
    </main>
  );
}

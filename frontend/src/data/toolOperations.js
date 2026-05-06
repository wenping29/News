// 模拟央行货币政策工具操作数据
// 金额单位：亿元，利率单位：%

// 判断操作是否已到期（以当前日期为基准）
const TODAY = '2026-05-06';

function isExpired(maturityDate) {
  return maturityDate < TODAY;
}

// ========== SLF 常备借贷便利 ==========
export const slfOps = [
  { date: '2026-05-06', amount: 60, rate: 2.50, term: 7, termLabel: '7天', maturityDate: '2026-05-13', direction: 'release' },
  { date: '2026-05-05', amount: 30, rate: 2.50, term: 1, termLabel: '隔夜', maturityDate: '2026-05-06', direction: 'release' },
  { date: '2026-04-28', amount: 80, rate: 2.50, term: 7, termLabel: '7天', maturityDate: '2026-05-05', direction: 'release' },
  { date: '2026-04-15', amount: 50, rate: 2.50, term: 7, termLabel: '7天', maturityDate: '2026-04-22', direction: 'release' },
  { date: '2026-03-15', amount: 120, rate: 2.55, term: 30, termLabel: '1个月', maturityDate: '2026-04-14', direction: 'release' },
  { date: '2026-02-10', amount: 45, rate: 2.55, term: 7, termLabel: '7天', maturityDate: '2026-02-17', direction: 'release' },
].map(op => ({ ...op, expired: isExpired(op.maturityDate) }));

// ========== MLF 中期借贷便利 ==========
export const mlfOps = [
  { date: '2026-04-15', amount: 2000, rate: 2.00, term: 365, termLabel: '1年', maturityDate: '2027-04-15', direction: 'release' },
  { date: '2026-03-15', amount: 3870, rate: 2.00, term: 365, termLabel: '1年', maturityDate: '2027-03-15', direction: 'release' },
  { date: '2026-02-25', amount: 3000, rate: 2.00, term: 365, termLabel: '1年', maturityDate: '2027-02-25', direction: 'release' },
  { date: '2026-01-15', amount: 9950, rate: 2.00, term: 365, termLabel: '1年', maturityDate: '2027-01-15', direction: 'release' },
  { date: '2025-12-15', amount: 5000, rate: 2.10, term: 365, termLabel: '1年', maturityDate: '2026-12-15', direction: 'release' },
  { date: '2025-11-15', amount: 3000, rate: 2.20, term: 365, termLabel: '1年', maturityDate: '2026-11-15', direction: 'release' },
].map(op => ({ ...op, expired: isExpired(op.maturityDate) }));

// ========== SLO 短期流动性调节工具 ==========
export const sloOps = [
  { date: '2026-05-05', amount: 150, rate: 1.80, term: 2, termLabel: '2天', maturityDate: '2026-05-07', direction: 'release' },
  { date: '2026-04-30', amount: 100, rate: 1.80, term: 2, termLabel: '2天', maturityDate: '2026-05-02', direction: 'release' },
  { date: '2026-04-28', amount: 200, rate: 1.80, term: 3, termLabel: '3天', maturityDate: '2026-05-01', direction: 'release' },
  { date: '2026-03-25', amount: 80, rate: 1.85, term: 1, termLabel: '1天', maturityDate: '2026-03-26', direction: 'release' },
].map(op => ({ ...op, expired: isExpired(op.maturityDate) }));

// ========== PSL 抵押补充贷款 ==========
export const pslOps = [
  { date: '2026-03-01', amount: 1000, rate: 2.25, term: 1825, termLabel: '5年', maturityDate: '2031-03-01', direction: 'release' },
  { date: '2025-12-01', amount: 3500, rate: 2.25, term: 1825, termLabel: '5年', maturityDate: '2030-12-01', direction: 'release' },
  { date: '2025-06-01', amount: 2000, rate: 2.40, term: 1095, termLabel: '3年', maturityDate: '2028-06-01', direction: 'release' },
  { date: '2024-12-01', amount: 5000, rate: 2.40, term: 1825, termLabel: '5年', maturityDate: '2029-12-01', direction: 'release' },
  { date: '2024-01-15', amount: 1500, rate: 2.60, term: 1825, termLabel: '5年', maturityDate: '2029-01-15', direction: 'release' },
].map(op => ({ ...op, expired: isExpired(op.maturityDate) }));

// ========== 逆回购 ==========
export const reverseRepoOps = [
  { date: '2026-05-06', amount: 300, rate: 1.50, term: 7, termLabel: '7天', maturityDate: '2026-05-13', direction: 'release' },
  { date: '2026-05-05', amount: 200, rate: 1.50, term: 7, termLabel: '7天', maturityDate: '2026-05-12', direction: 'release' },
  { date: '2026-04-30', amount: 500, rate: 1.50, term: 7, termLabel: '7天', maturityDate: '2026-05-07', direction: 'release' },
  { date: '2026-04-28', amount: 800, rate: 1.50, term: 14, termLabel: '14天', maturityDate: '2026-05-12', direction: 'release' },
  { date: '2026-04-22', amount: 600, rate: 1.50, term: 7, termLabel: '7天', maturityDate: '2026-04-29', direction: 'release' },
  { date: '2026-04-15', amount: 1000, rate: 1.50, term: 28, termLabel: '28天', maturityDate: '2026-05-13', direction: 'release' },
].map(op => ({ ...op, expired: isExpired(op.maturityDate) }));

// ========== LPR 贷款市场报价利率 ==========
export const lprQuotes = [
  { date: '2026-04-21', rate1y: 3.10, rate5y: 3.60 },
  { date: '2026-03-20', rate1y: 3.10, rate5y: 3.60 },
  { date: '2026-02-20', rate1y: 3.10, rate5y: 3.60 },
  { date: '2026-01-20', rate1y: 3.10, rate5y: 3.60 },
  { date: '2025-12-20', rate1y: 3.10, rate5y: 3.60 },
  { date: '2025-11-20', rate1y: 3.15, rate5y: 3.65 },
  { date: '2025-10-20', rate1y: 3.15, rate5y: 3.65 },
  { date: '2025-09-20', rate1y: 3.20, rate5y: 3.70 },
  { date: '2025-08-20', rate1y: 3.20, rate5y: 3.70 },
  { date: '2025-07-22', rate1y: 3.25, rate5y: 3.75 },
];

// 所有操作数据映射
export const OPERATIONS_MAP = {
  slf: { ops: slfOps, type: 'fund' },
  mlf: { ops: mlfOps, type: 'fund' },
  slo: { ops: sloOps, type: 'fund' },
  psl: { ops: pslOps, type: 'fund' },
  'reverse-repo': { ops: reverseRepoOps, type: 'fund' },
  lpr: { ops: lprQuotes, type: 'rate' },
};

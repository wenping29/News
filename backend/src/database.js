const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'policies.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT DEFAULT '',
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    country TEXT NOT NULL CHECK(country IN ('cn', 'us')),
    category TEXT NOT NULL CHECK(category IN ('finance', 'policy', 'fiscal', 'monetary')),
    publish_date TEXT DEFAULT '',
    collected_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_policies_country ON policies(country);
  CREATE INDEX IF NOT EXISTS idx_policies_source ON policies(source);
  CREATE INDEX IF NOT EXISTS idx_policies_publish_date ON policies(publish_date);

  CREATE TABLE IF NOT EXISTS tool_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id TEXT NOT NULL,
    op_type TEXT NOT NULL CHECK(op_type IN ('fund', 'rate')),
    op_date TEXT NOT NULL,
    amount REAL DEFAULT 0,
    rate REAL DEFAULT 0,
    rate1y REAL DEFAULT 0,
    rate5y REAL DEFAULT 0,
    term INTEGER DEFAULT 0,
    term_label TEXT DEFAULT '',
    maturity_date TEXT DEFAULT '',
    direction TEXT DEFAULT 'release',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_tool_ops_tool ON tool_operations(tool_id);

  CREATE TABLE IF NOT EXISTS legendary_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    exchange TEXT DEFAULT '',
    period TEXT DEFAULT '',
    rise_note TEXT DEFAULT '',
    theme TEXT DEFAULT '',
    story TEXT DEFAULT '',
    outcome TEXT DEFAULT '',
    peak_price REAL DEFAULT 0,
    peak_date TEXT DEFAULT '',
    low_price REAL DEFAULT 0,
    low_date TEXT DEFAULT '',
    peak_rise_pct REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_legendary_sort ON legendary_stocks(sort_order);

  CREATE TABLE IF NOT EXISTS stock_volatility_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    event_date TEXT NOT NULL,
    price REAL DEFAULT 0,
    change_pct REAL DEFAULT 0,
    volume REAL DEFAULT 0,
    event_type TEXT DEFAULT '',
    description TEXT DEFAULT '',
    FOREIGN KEY (stock_code) REFERENCES legendary_stocks(code)
  );
  CREATE INDEX IF NOT EXISTS idx_volatility_stock ON stock_volatility_events(stock_code);
  CREATE INDEX IF NOT EXISTS idx_volatility_date ON stock_volatility_events(event_date);
`;

// ========== 种子数据 ==========
const SEED_OPS = [
  // SLF
  { tool_id:'slf', op_type:'fund', op_date:'2026-05-06', amount:60, rate:2.50, term:7, term_label:'7天', maturity_date:'2026-05-13', direction:'release' },
  { tool_id:'slf', op_type:'fund', op_date:'2026-05-05', amount:30, rate:2.50, term:1, term_label:'隔夜', maturity_date:'2026-05-06', direction:'release' },
  { tool_id:'slf', op_type:'fund', op_date:'2026-04-28', amount:80, rate:2.50, term:7, term_label:'7天', maturity_date:'2026-05-05', direction:'release' },
  { tool_id:'slf', op_type:'fund', op_date:'2026-04-15', amount:50, rate:2.50, term:7, term_label:'7天', maturity_date:'2026-04-22', direction:'release' },
  { tool_id:'slf', op_type:'fund', op_date:'2026-03-15', amount:120, rate:2.55, term:30, term_label:'1个月', maturity_date:'2026-04-14', direction:'release' },
  { tool_id:'slf', op_type:'fund', op_date:'2026-02-10', amount:45, rate:2.55, term:7, term_label:'7天', maturity_date:'2026-02-17', direction:'release' },
  // MLF
  { tool_id:'mlf', op_type:'fund', op_date:'2026-04-15', amount:2000, rate:2.00, term:365, term_label:'1年', maturity_date:'2027-04-15', direction:'release' },
  { tool_id:'mlf', op_type:'fund', op_date:'2026-03-15', amount:3870, rate:2.00, term:365, term_label:'1年', maturity_date:'2027-03-15', direction:'release' },
  { tool_id:'mlf', op_type:'fund', op_date:'2026-02-25', amount:3000, rate:2.00, term:365, term_label:'1年', maturity_date:'2027-02-25', direction:'release' },
  { tool_id:'mlf', op_type:'fund', op_date:'2026-01-15', amount:9950, rate:2.00, term:365, term_label:'1年', maturity_date:'2027-01-15', direction:'release' },
  { tool_id:'mlf', op_type:'fund', op_date:'2025-12-15', amount:5000, rate:2.10, term:365, term_label:'1年', maturity_date:'2026-12-15', direction:'release' },
  { tool_id:'mlf', op_type:'fund', op_date:'2025-11-15', amount:3000, rate:2.20, term:365, term_label:'1年', maturity_date:'2026-11-15', direction:'release' },
  // SLO
  { tool_id:'slo', op_type:'fund', op_date:'2026-05-05', amount:150, rate:1.80, term:2, term_label:'2天', maturity_date:'2026-05-07', direction:'release' },
  { tool_id:'slo', op_type:'fund', op_date:'2026-04-30', amount:100, rate:1.80, term:2, term_label:'2天', maturity_date:'2026-05-02', direction:'release' },
  { tool_id:'slo', op_type:'fund', op_date:'2026-04-28', amount:200, rate:1.80, term:3, term_label:'3天', maturity_date:'2026-05-01', direction:'release' },
  { tool_id:'slo', op_type:'fund', op_date:'2026-03-25', amount:80, rate:1.85, term:1, term_label:'1天', maturity_date:'2026-03-26', direction:'release' },
  // PSL
  { tool_id:'psl', op_type:'fund', op_date:'2026-03-01', amount:1000, rate:2.25, term:1825, term_label:'5年', maturity_date:'2031-03-01', direction:'release' },
  { tool_id:'psl', op_type:'fund', op_date:'2025-12-01', amount:3500, rate:2.25, term:1825, term_label:'5年', maturity_date:'2030-12-01', direction:'release' },
  { tool_id:'psl', op_type:'fund', op_date:'2025-06-01', amount:2000, rate:2.40, term:1095, term_label:'3年', maturity_date:'2028-06-01', direction:'release' },
  { tool_id:'psl', op_type:'fund', op_date:'2024-12-01', amount:5000, rate:2.40, term:1825, term_label:'5年', maturity_date:'2029-12-01', direction:'release' },
  { tool_id:'psl', op_type:'fund', op_date:'2024-01-15', amount:1500, rate:2.60, term:1825, term_label:'5年', maturity_date:'2029-01-15', direction:'release' },
  // 逆回购
  { tool_id:'reverse-repo', op_type:'fund', op_date:'2026-05-06', amount:300, rate:1.50, term:7, term_label:'7天', maturity_date:'2026-05-13', direction:'release' },
  { tool_id:'reverse-repo', op_type:'fund', op_date:'2026-05-05', amount:200, rate:1.50, term:7, term_label:'7天', maturity_date:'2026-05-12', direction:'release' },
  { tool_id:'reverse-repo', op_type:'fund', op_date:'2026-04-30', amount:500, rate:1.50, term:7, term_label:'7天', maturity_date:'2026-05-07', direction:'release' },
  { tool_id:'reverse-repo', op_type:'fund', op_date:'2026-04-28', amount:800, rate:1.50, term:14, term_label:'14天', maturity_date:'2026-05-12', direction:'release' },
  { tool_id:'reverse-repo', op_type:'fund', op_date:'2026-04-22', amount:600, rate:1.50, term:7, term_label:'7天', maturity_date:'2026-04-29', direction:'release' },
  { tool_id:'reverse-repo', op_type:'fund', op_date:'2026-04-15', amount:1000, rate:1.50, term:28, term_label:'28天', maturity_date:'2026-05-13', direction:'release' },
  // LPR
  { tool_id:'lpr', op_type:'rate', op_date:'2026-04-21', amount:0, rate:0, rate1y:3.10, rate5y:3.60, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2026-03-20', amount:0, rate:0, rate1y:3.10, rate5y:3.60, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2026-02-20', amount:0, rate:0, rate1y:3.10, rate5y:3.60, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2026-01-20', amount:0, rate:0, rate1y:3.10, rate5y:3.60, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2025-12-20', amount:0, rate:0, rate1y:3.10, rate5y:3.60, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2025-11-20', amount:0, rate:0, rate1y:3.15, rate5y:3.65, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2025-10-20', amount:0, rate:0, rate1y:3.15, rate5y:3.65, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2025-09-20', amount:0, rate:0, rate1y:3.20, rate5y:3.70, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2025-08-20', amount:0, rate:0, rate1y:3.20, rate5y:3.70, term:0, term_label:'', maturity_date:'', direction:'release' },
  { tool_id:'lpr', op_type:'rate', op_date:'2025-07-22', amount:0, rate:0, rate1y:3.25, rate5y:3.75, term:0, term_label:'', maturity_date:'', direction:'release' },
];

function seedToolOperations() {
  try {
    const row = db.exec("SELECT COUNT(*) as cnt FROM tool_operations");
    const count = row.length > 0 ? row[0].values[0][0] : 0;
    if (count > 0) return;
  } catch (e) {
    console.log('检查种子数据时出错(表可能尚未创建):', e.message);
    return;
  }

  console.log('正在初始化货币政策工具种子数据...');
  let inserted = 0;
  for (const op of SEED_OPS) {
    try {
      const stmt = db.prepare(
        `INSERT INTO tool_operations (tool_id, op_type, op_date, amount, rate, rate1y, rate5y, term, term_label, maturity_date, direction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run([
        op.tool_id || '',
        op.op_type || 'fund',
        op.op_date || '',
        op.amount || 0,
        op.rate || 0,
        op.rate1y || 0,
        op.rate5y || 0,
        op.term || 0,
        op.term_label || '',
        op.maturity_date || '',
        op.direction || 'release',
      ]);
      stmt.free();
      inserted++;
    } catch (e) {
      console.error(`插入种子数据失败 (${op.tool_id} ${op.op_date}):`, e.message);
    }
  }
  console.log(`已插入 ${inserted}/${SEED_OPS.length} 条种子数据`);
  saveDB();
}

// ========== 历史上的妖股（教育向整理，非投资建议）==========
const SEED_LEGENDARY = [
  {
    name: '中国石油',
    code: '601857',
    exchange: '上交所',
    period: '2007年',
    rise_note: 'A股 IPO 体量极大',
    theme: '蓝筹上市',
    story: '2007 年 11 月回归 A 股上市，上市初期换手与定价备受关注，之后较长周期走势成为"新股与周期"讨论中的常见案例。',
    outcome: '长期回调后低位震荡（历史走势，不代表未来）',
    peak_price: 48.62,
    peak_date: '2007-11-05',
    low_price: 7.51,
    low_date: '2013-06-25',
    peak_rise_pct: -84.6,
    sort_order: 10,
  },
  {
    name: '中国船舶',
    code: '600150',
    exchange: '上交所',
    period: '2007年前后',
    rise_note: '周期高位剧烈波动',
    theme: '造船周期 / 重组预期',
    story: '叠加行业景气与资产重组预期，曾在市场情绪高涨阶段出现极端涨幅与波动，随后随周期与预期修正大幅回撤。',
    outcome: '深度回撤后随行业周期波动',
    peak_price: 300.00,
    peak_date: '2007-10-16',
    low_price: 8.50,
    low_date: '2014-03-12',
    peak_rise_pct: -97.2,
    sort_order: 20,
  },
  {
    name: '特力A',
    code: '000025',
    exchange: '深交所',
    period: '2015年',
    rise_note: '短期连续涨停（投机情绪）',
    theme: '国企改革 / 题材炒作',
    story: '2015 年行情中多次出现连续涨停，换手与波动极高，常被作为"题材驱动、流动性博弈"的案例提及。',
    outcome: '监管与市场冷却后波动收敛',
    peak_price: 108.90,
    peak_date: '2015-12-28',
    low_price: 8.90,
    low_date: '2015-07-09',
    peak_rise_pct: 1123.6,
    sort_order: 30,
  },
  {
    name: '全通教育',
    code: '300359',
    exchange: '深交所创业板',
    period: '2015年',
    rise_note: '高价股与估值争议',
    theme: '互联网+教育',
    story: '在线教育概念高峰期估值与股价同步抬升，市值一度引发广泛讨论，后续业绩与估值回归成为创业板典型案例之一。',
    outcome: '估值回落、长期走势分化',
    peak_price: 468.60,
    peak_date: '2015-05-26',
    low_price: 6.80,
    low_date: '2018-12-04',
    peak_rise_pct: -98.6,
    sort_order: 40,
  },
  {
    name: '暴风集团',
    code: '300431',
    exchange: '深交所创业板',
    period: '2015年前后',
    rise_note: '次新股与概念共振',
    theme: 'VR / 视频生态',
    story: '上市初期叠加题材热度出现剧烈波动；其后经营与合规问题暴露，退市风险教育意义突出。',
    outcome: '退市（风险警示案例）',
    peak_price: 327.01,
    peak_date: '2015-09-01',
    low_price: 0.28,
    low_date: '2020-06-29',
    peak_rise_pct: -99.9,
    sort_order: 50,
  },
  {
    name: '乐视网',
    code: '300104',
    exchange: '深交所创业板',
    period: '2015年前后',
    rise_note: '生态故事与杠杆扩张',
    theme: '互联网生态 / 硬件补贴',
    story: '高预期与高扩张并行，股价曾在乐观周期走强；资金链与治理问题爆发后风险急剧暴露。',
    outcome: '退市（公司治理与财务风险案例）',
    peak_price: 178.68,
    peak_date: '2015-05-12',
    low_price: 0.18,
    low_date: '2020-07-17',
    peak_rise_pct: -99.9,
    sort_order: 60,
  },
  {
    name: '东方通信',
    code: '600776',
    exchange: '上交所',
    period: '2018-2019年',
    rise_note: '连板与放量',
    theme: '5G 题材映射',
    story: '市场将其作为 5G 情绪映射标的之一，出现连续涨停与极高关注度；基本面与题材落差常被复盘讨论。',
    outcome: '题材冷却后大幅回吐涨幅',
    peak_price: 41.88,
    peak_date: '2019-03-01',
    low_price: 5.95,
    low_date: '2018-10-16',
    peak_rise_pct: 603.9,
    sort_order: 70,
  },
  {
    name: '中潜股份',
    code: '300526',
    exchange: '深交所创业板',
    period: '2020年',
    rise_note: '跨界题材剧烈波动',
    theme: '跨界并购 / 概念炒作',
    story: '因跨界热点预期出现短期暴涨，监管问询与信息披露问题随后引发剧烈反转。',
    outcome: '监管处罚与股价重挫（合规案例）',
    peak_price: 210.00,
    peak_date: '2020-08-18',
    low_price: 6.90,
    low_date: '2022-04-27',
    peak_rise_pct: -96.7,
    sort_order: 80,
  },
  {
    name: '仁东控股',
    code: '002647',
    exchange: '深交所',
    period: '2020年',
    rise_note: '闪崩与流动性枯竭',
    theme: '庄股质疑 / 控盘争议',
    story: '长期逆势上涨后突发连续跌停，融资盘与流动性冲击放大跌幅，被视为"筹码结构与风控"研究素材。',
    outcome: '剧烈下跌后整理',
    peak_price: 64.54,
    peak_date: '2020-11-20',
    low_price: 4.50,
    low_date: '2021-02-03',
    peak_rise_pct: -93.0,
    sort_order: 90,
  },
  {
    name: '九安医疗',
    code: '002432',
    exchange: '深交所',
    period: '2021-2022年',
    rise_note: '订单预期驱动暴涨',
    theme: '新冠检测 / 海外订单',
    story: '海外订单预期与公告披露节奏叠加，股价短期剧烈上行；预期修正阶段波动加大。',
    outcome: '高位回落、波动仍高',
    peak_price: 96.80,
    peak_date: '2022-01-05',
    low_price: 6.80,
    low_date: '2021-11-02',
    peak_rise_pct: 1323.5,
    sort_order: 100,
  },
];

function seedLegendaryStocks() {
  console.log('正在初始化/更新「历史上的妖股」数据...');
  let updated = 0;
  for (const s of SEED_LEGENDARY) {
    try {
      const checkStmt = db.prepare('SELECT id FROM legendary_stocks WHERE code = ?');
      checkStmt.bind([s.code]);
      const exists = checkStmt.step();
      checkStmt.free();

      if (exists) {
        const updStmt = db.prepare(
          `UPDATE legendary_stocks SET
             name=?, exchange=?, period=?, rise_note=?, theme=?, story=?, outcome=?,
             peak_price=?, peak_date=?, low_price=?, low_date=?, peak_rise_pct=?, sort_order=?
           WHERE code=?`
        );
        updStmt.run([
          s.name,
          s.exchange || '',
          s.period || '',
          s.rise_note || '',
          s.theme || '',
          s.story || '',
          s.outcome || '',
          s.peak_price || 0,
          s.peak_date || '',
          s.low_price || 0,
          s.low_date || '',
          s.peak_rise_pct || 0,
          s.sort_order ?? 0,
          s.code,
        ]);
        updStmt.free();
      } else {
        const insStmt = db.prepare(
          `INSERT INTO legendary_stocks (name, code, exchange, period, rise_note, theme, story, outcome, peak_price, peak_date, low_price, low_date, peak_rise_pct, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        insStmt.run([
          s.name,
          s.code,
          s.exchange || '',
          s.period || '',
          s.rise_note || '',
          s.theme || '',
          s.story || '',
          s.outcome || '',
          s.peak_price || 0,
          s.peak_date || '',
          s.low_price || 0,
          s.low_date || '',
          s.peak_rise_pct || 0,
          s.sort_order ?? 0,
        ]);
        insStmt.free();
      }
      updated++;
    } catch (e) {
      console.error(`处理妖股数据失败 (${s.code}):`, e.message);
    }
  }
  console.log(`已处理 ${updated}/${SEED_LEGENDARY.length} 条妖股案例`);
  saveDB();
}

// ========== 妖股波动事件明细（教育向整理） ==========
const SEED_VOLATILITY = [
  // 中国石油 601857
  { stock_code: '601857', event_date: '2007-11-05', price: 48.62, change_pct: 162.5, event_type: 'peak', description: '上市首日开盘冲高至历史峰值 48.62 元' },
  { stock_code: '601857', event_date: '2007-11-05', price: 43.96, change_pct: 136.4, event_type: 'listing', description: '上市首日收盘 43.96 元，市值一度突破万亿' },
  { stock_code: '601857', event_date: '2008-10-28', price: 10.52, change_pct: -76.0, event_type: 'crash', description: '随全球金融危机暴跌至 10 元附近' },
  { stock_code: '601857', event_date: '2013-06-25', price: 7.51, change_pct: -84.6, event_type: 'bottom', description: '跌至历史低点 7.51 元，较高点回撤超 84%' },

  // 中国船舶 600150
  { stock_code: '600150', event_date: '2006-08-10', price: 12.30, change_pct: 0, event_type: 'start', description: '重组前基线价格约 12 元' },
  { stock_code: '600150', event_date: '2007-10-16', price: 300.00, change_pct: 2337.4, event_type: 'peak', description: '造船周期顶点，股价突破 300 元，涨幅超 23 倍' },
  { stock_code: '600150', event_date: '2008-12-09', price: 45.20, change_pct: -84.9, event_type: 'crash', description: '金融危机后暴跌至 45 元附近' },
  { stock_code: '600150', event_date: '2014-03-12', price: 8.50, change_pct: -97.2, event_type: 'bottom', description: '随行业下行探底至 8.50 元' },

  // 特力A 000025
  { stock_code: '000025', event_date: '2015-07-09', price: 8.90, change_pct: 0, event_type: 'start', description: '股灾后低点启动' },
  { stock_code: '000025', event_date: '2015-08-17', price: 43.50, change_pct: 388.8, event_type: 'surge', description: '连续涨停突破 40 元' },
  { stock_code: '000025', event_date: '2015-10-15', price: 22.00, change_pct: -49.4, event_type: 'crash', description: '监管关注后大幅回调' },
  { stock_code: '000025', event_date: '2015-12-28', price: 108.90, change_pct: 1123.6, event_type: 'peak', description: '第二波炒作创出 108.90 元历史高点' },

  // 全通教育 300359
  { stock_code: '300359', event_date: '2015-05-26', price: 468.60, change_pct: 0, event_type: 'peak', description: 'A 股历史最高价之一 468.60 元，市值超 500 亿' },
  { stock_code: '300359', event_date: '2015-09-01', price: 120.00, change_pct: -74.4, event_type: 'crash', description: '估值泡沫破裂，短期暴跌超 70%' },
  { stock_code: '300359', event_date: '2018-12-04', price: 6.80, change_pct: -98.6, event_type: 'bottom', description: '长期阴跌至 6.80 元，较高点回撤近 99%' },

  // 暴风集团 300431
  { stock_code: '300431', event_date: '2015-03-24', price: 7.25, change_pct: 0, event_type: 'start', description: '上市发行价 7.25 元' },
  { stock_code: '300431', event_date: '2015-09-01', price: 327.01, change_pct: 4410.5, event_type: 'peak', description: '连板 36 次，最高触及 327.01 元，涨幅超 44 倍' },
  { stock_code: '300431', event_date: '2019-11-07', price: 3.29, change_pct: -99.0, event_type: 'crash', description: '经营恶化，股价跌至 3 元附近' },
  { stock_code: '300431', event_date: '2020-06-29', price: 0.28, change_pct: -99.9, event_type: 'delisted', description: '退市前最后交易日，股价 0.28 元' },

  // 乐视网 300104
  { stock_code: '300104', event_date: '2015-05-12', price: 178.68, change_pct: 0, event_type: 'peak', description: '乐视生态概念巅峰，股价 178.68 元' },
  { stock_code: '300104', event_date: '2017-03-10', price: 58.00, change_pct: -67.5, event_type: 'crash', description: '资金链危机暴露，股价跌破 60 元' },
  { stock_code: '300104', event_date: '2020-04-27', price: 0.67, change_pct: -99.6, event_type: 'delisted', description: '退市整理期，股价不足 1 元' },
  { stock_code: '300104', event_date: '2020-07-17', price: 0.18, change_pct: -99.9, event_type: 'delisted', description: '正式摘牌前最后价格 0.18 元' },

  // 东方通信 600776
  { stock_code: '600776', event_date: '2018-10-16', price: 5.95, change_pct: 0, event_type: 'start', description: '5G 概念启动前基线价格约 6 元' },
  { stock_code: '600776', event_date: '2018-12-25', price: 18.50, change_pct: 210.9, event_type: 'surge', description: '5G 概念发酵，首波涨至 18.50 元' },
  { stock_code: '600776', event_date: '2019-01-16', price: 12.80, change_pct: -30.8, event_type: 'crash', description: '公司澄清无 5G 业务，短期暴跌' },
  { stock_code: '600776', event_date: '2019-03-01', price: 41.88, change_pct: 603.9, event_type: 'peak', description: '游资接力再炒，创出 41.88 元高点' },
  { stock_code: '600776', event_date: '2019-05-06', price: 18.20, change_pct: -56.6, event_type: 'crash', description: '情绪退潮，快速回撤超 50%' },

  // 中潜股份 300526
  { stock_code: '300526', event_date: '2020-03-10', price: 15.80, change_pct: 0, event_type: 'start', description: '跨界概念炒作前价格约 16 元' },
  { stock_code: '300526', event_date: '2020-07-08', price: 120.00, change_pct: 659.5, event_type: 'surge', description: '跨界转型预期，股价突破百元' },
  { stock_code: '300526', event_date: '2020-08-18', price: 210.00, change_pct: 1227.8, event_type: 'peak', description: '炒作巅峰触及 210 元' },
  { stock_code: '300526', event_date: '2020-11-09', price: 32.00, change_pct: -84.8, event_type: 'crash', description: '监管处罚公告后暴跌' },
  { stock_code: '300526', event_date: '2022-04-27', price: 6.90, change_pct: -96.7, event_type: 'bottom', description: '长期阴跌至 6.90 元' },

  // 仁东控股 002647
  { stock_code: '002647', event_date: '2020-01-02', price: 15.20, change_pct: 0, event_type: 'start', description: '长期逆势上涨起点约 15 元' },
  { stock_code: '002647', event_date: '2020-11-20', price: 64.54, change_pct: 324.6, event_type: 'peak', description: '控盘炒作至 64.54 元高点' },
  { stock_code: '002647', event_date: '2020-11-23', price: 58.09, change_pct: -10.0, event_type: 'crash', description: '连续跌停首日，融资盘开始爆仓' },
  { stock_code: '002647', event_date: '2020-12-04', price: 22.00, change_pct: -65.9, event_type: 'crash', description: '连续 14 个跌停后打开，仍暴跌 65%' },
  { stock_code: '002647', event_date: '2021-02-03', price: 4.50, change_pct: -93.0, event_type: 'bottom', description: '流动性枯竭后探底 4.50 元' },

  // 九安医疗 002432
  { stock_code: '002432', event_date: '2021-11-02', price: 6.80, change_pct: 0, event_type: 'start', description: '新冠检测概念启动前约 6.80 元' },
  { stock_code: '002432', event_date: '2021-11-25', price: 35.60, change_pct: 423.5, event_type: 'surge', description: '海外订单预期发酵，首月暴涨 4 倍' },
  { stock_code: '002432', event_date: '2021-12-20', price: 58.00, change_pct: 752.9, event_type: 'surge', description: '业绩超预期，继续冲高至 58 元' },
  { stock_code: '002432', event_date: '2022-01-05', price: 96.80, change_pct: 1323.5, event_type: 'peak', description: '创出 96.80 元历史高点，涨幅超 13 倍' },
  { stock_code: '002432', event_date: '2022-04-27', price: 38.50, change_pct: -60.2, event_type: 'crash', description: '预期修正，股价腰斩至 38.50 元' },
];

function seedVolatilityEvents() {
  try {
    const row = db.exec('SELECT COUNT(*) as cnt FROM stock_volatility_events');
    const count = row.length > 0 ? row[0].values[0][0] : 0;
    if (count > 0) return;
  } catch (e) {
    return;
  }

  console.log('正在初始化「妖股波动事件」种子数据...');
  let inserted = 0;
  const stmt = db.prepare(
    `INSERT INTO stock_volatility_events (stock_code, event_date, price, change_pct, volume, event_type, description)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  );
  for (const e of SEED_VOLATILITY) {
    try {
      stmt.run([
        e.stock_code,
        e.event_date,
        e.price || 0,
        e.change_pct || 0,
        e.event_type || '',
        e.description || '',
      ]);
      inserted++;
    } catch (err) {
      console.error(`插入波动事件失败 (${e.stock_code} ${e.event_date}):`, err.message);
    }
  }
  stmt.free();
  console.log(`已插入 ${inserted}/${SEED_VOLATILITY.length} 条波动事件`);
  saveDB();
}

function migrateSchema() {
  const tableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='policies'");
  if (tableInfo.length > 0) {
    const createSQL = tableInfo[0].values[0][0];
    if (createSQL.includes("'meeting'")) {
      console.log('检测到旧分类约束，正在迁移...');
      const oldCount = db.exec('SELECT COUNT(*) FROM policies');
      db.run('DROP TABLE IF EXISTS policies');
      db.run(SCHEMA);
      console.log('数据表已迁移到新分类体系 (旧数据已清除)');
    }
  }

  const legendaryInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='legendary_stocks'");
  if (legendaryInfo.length > 0) {
    const createSQL = legendaryInfo[0].values[0][0];
    if (!createSQL.includes('peak_price')) {
      console.log('检测到旧版妖股表结构，正在迁移...');
      try {
        db.run('ALTER TABLE legendary_stocks ADD COLUMN peak_price REAL DEFAULT 0');
        db.run('ALTER TABLE legendary_stocks ADD COLUMN peak_date TEXT DEFAULT ""');
        db.run('ALTER TABLE legendary_stocks ADD COLUMN low_price REAL DEFAULT 0');
        db.run('ALTER TABLE legendary_stocks ADD COLUMN low_date TEXT DEFAULT ""');
        db.run('ALTER TABLE legendary_stocks ADD COLUMN peak_rise_pct REAL DEFAULT 0');
        console.log('妖股表已添加波动概要字段');
      } catch (e) {
        console.log('迁移妖股表时出错:', e.message);
      }
    }
  }
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.exec(SCHEMA);
  migrateSchema();
  seedToolOperations();
  seedLegendaryStocks();
  seedVolatilityEvents();
  saveDB();
}

function saveDB() {
  const data = db.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buf);
}

function batchInsert(policies) {
  let count = 0;
  for (const item of policies) {
    try {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO policies (title, summary, url, source, country, category, publish_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run([
        item.title,
        item.summary || '',
        item.url,
        item.source,
        item.country,
        item.category || 'policy',
        item.publishDate || '',
      ]);
      stmt.free();

      const changes = db.getRowsModified();
      if (changes > 0) count++;
    } catch (e) {
      // 忽略重复键等错误
    }
  }
  saveDB();
  return count;
}

function queryPolicies({ country, source, category, q, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (country) {
    conditions.push('country = ?');
    params.push(country);
  }
  if (source) {
    conditions.push('source = ?');
    params.push(source);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (q) {
    conditions.push('(title LIKE ? OR summary LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * limit;

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM policies ${where}`);
  countStmt.bind(params);
  let total = 0;
  if (countStmt.step()) {
    total = countStmt.getAsObject().total;
  }
  countStmt.free();

  const queryParams = [...params, limit, offset];
  const stmt = db.prepare(
    `SELECT * FROM policies ${where} ORDER BY publish_date DESC, id DESC LIMIT ? OFFSET ?`
  );
  stmt.bind(queryParams);

  const items = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject());
  }
  stmt.free();

  return { total, page, limit, items };
}

function getStats() {
  const total = [];
  const bySource = [];
  const byCategory = [];
  let lastCollectedAt = null;

  const t = db.prepare('SELECT country, COUNT(*) as count FROM policies GROUP BY country');
  while (t.step()) total.push(t.getAsObject());
  t.free();

  const s = db.prepare('SELECT source, country, COUNT(*) as count FROM policies GROUP BY source, country');
  while (s.step()) bySource.push(s.getAsObject());
  s.free();

  const c = db.prepare('SELECT category, country, COUNT(*) as count FROM policies GROUP BY category, country');
  while (c.step()) byCategory.push(c.getAsObject());
  c.free();

  const r = db.prepare('SELECT collected_at FROM policies ORDER BY collected_at DESC LIMIT 1');
  if (r.step()) lastCollectedAt = r.getAsObject().collected_at;
  r.free();

  return { total, bySource, byCategory, lastCollectedAt };
}

function queryToolOperations(toolId) {
  const stmt = db.prepare(
    'SELECT * FROM tool_operations WHERE tool_id = ? ORDER BY op_date DESC, id DESC'
  );
  stmt.bind([toolId]);
  const ops = [];
  while (stmt.step()) {
    ops.push(stmt.getAsObject());
  }
  stmt.free();
  return ops;
}

function queryLegendaryStocks({ q, exchange } = {}) {
  const conditions = [];
  const params = [];

  if (exchange) {
    conditions.push('exchange = ?');
    params.push(exchange);
  }
  if (q) {
    conditions.push(
      '(name LIKE ? OR code LIKE ? OR theme LIKE ? OR story LIKE ? OR period LIKE ?)'
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const stmt = db.prepare(
    `SELECT * FROM legendary_stocks ${where} ORDER BY sort_order ASC, id ASC`
  );
  if (params.length > 0) stmt.bind(params);

  const items = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject());
  }
  stmt.free();
  return { items };
}

function queryVolatilityEvents(stockCode) {
  const stmt = db.prepare(
    'SELECT * FROM stock_volatility_events WHERE stock_code = ? ORDER BY event_date ASC, id ASC'
  );
  stmt.bind([stockCode]);
  const events = [];
  while (stmt.step()) {
    events.push(stmt.getAsObject());
  }
  stmt.free();
  return events;
}

function insertLegendaryStock(stock) {
  // 检查是否已存在
  const checkStmt = db.prepare('SELECT id FROM legendary_stocks WHERE code = ?');
  checkStmt.bind([stock.code || '']);
  const exists = checkStmt.step();
  checkStmt.free();
  
  if (exists) {
    return false; // 已存在，不重复插入
  }

  const stmt = db.prepare(
    `INSERT INTO legendary_stocks (name, code, exchange, period, rise_note, theme, story, outcome, peak_price, peak_date, low_price, low_date, peak_rise_pct, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run([
    stock.name || '',
    stock.code || '',
    stock.exchange || '',
    stock.period || '',
    stock.rise_note || '',
    stock.theme || '',
    stock.story || '',
    stock.outcome || '',
    stock.peak_price || 0,
    stock.peak_date || '',
    stock.low_price || 0,
    stock.low_date || '',
    stock.peak_rise_pct || 0,
    stock.sort_order || 0,
  ]);
  stmt.free();
  
  // 插入波动事件
  if (stock.events && stock.events.length > 0) {
    const eventStmt = db.prepare(
      `INSERT INTO stock_volatility_events (stock_code, event_date, price, change_pct, volume, event_type, description)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    );
    for (const evt of stock.events) {
      eventStmt.run([
        stock.code,
        evt.event_date || '',
        evt.price || 0,
        evt.change_pct || 0,
        evt.event_type || '',
        evt.description || '',
      ]);
    }
    eventStmt.free();
  }
  
  saveDB();
  return true;
}

function insertToolOperation(op) {
  // 去重：检查是否已存在相同记录
  const checkStmt = db.prepare(
    `SELECT id FROM tool_operations
     WHERE tool_id = ? AND op_type = ? AND op_date = ? AND direction = ?
       AND amount = ? AND rate = ? AND rate1y = ? AND rate5y = ?
     LIMIT 1`
  );
  checkStmt.bind([
    op.tool_id || '',
    op.op_type || 'fund',
    op.op_date || '',
    op.direction || 'release',
    op.amount || 0,
    op.rate || 0,
    op.rate1y || 0,
    op.rate5y || 0,
  ]);
  const exists = checkStmt.step();
  checkStmt.free();
  if (exists) return false;

  const stmt = db.prepare(
    `INSERT INTO tool_operations (tool_id, op_type, op_date, amount, rate, rate1y, rate5y, term, term_label, maturity_date, direction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run([op.tool_id, op.op_type, op.op_date, op.amount || 0, op.rate || 0, op.rate1y || 0, op.rate5y || 0, op.term || 0, op.term_label || '', op.maturity_date || '', op.direction || 'release']);
  stmt.free();
  saveDB();
  return true;
}

module.exports = {
  initDB,
  batchInsert,
  queryPolicies,
  getStats,
  queryToolOperations,
  insertToolOperation,
  queryLegendaryStocks,
  queryVolatilityEvents,
  insertLegendaryStock,
};

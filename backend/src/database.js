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

module.exports = { initDB, batchInsert, queryPolicies, getStats, queryToolOperations, insertToolOperation };

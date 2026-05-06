import { useState } from 'react';

const API_BASE = '/api';

const TOOLS = [
  { id: 'slo', name: '短期流动性调节工具 (SLO)', color: '#2ecc71', type: 'fund' },
  { id: 'reverse-repo', name: '逆回购 (Reverse Repo)', color: '#e74c3c', type: 'fund' },
  { id: 'slf', name: '常备借贷便利 (SLF)', color: '#3498db', type: 'fund' },
  { id: 'mlf', name: '中期借贷便利 (MLF)', color: '#e67e22', type: 'fund' },
  { id: 'psl', name: '抵押补充贷款 (PSL)', color: '#9b59b6', type: 'fund' },
  { id: 'lpr', name: '贷款市场报价利率 (LPR)', color: '#f39c12', type: 'rate' },
];

const TERM_PRESETS = [
  { label: '隔夜', days: 1 },
  { label: '2天', days: 2 },
  { label: '3天', days: 3 },
  { label: '7天', days: 7 },
  { label: '14天', days: 14 },
  { label: '28天', days: 28 },
  { label: '1个月', days: 30 },
  { label: '3个月', days: 90 },
  { label: '6个月', days: 182 },
  { label: '1年', days: 365 },
  { label: '3年', days: 1095 },
  { label: '5年', days: 1825 },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  if (!dateStr || !days) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Fund operation form
function FundForm({ toolId, toolName, color, onSubmit }) {
  const [form, setForm] = useState({
    op_date: getToday(),
    amount: '',
    rate: '',
    term_days: '',
    term_label: '',
    maturity_date: '',
    direction: 'release',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleChange = (key, value) => {
    const next = { ...form, [key]: value };

    // Auto-calc maturity date when date + term changes
    if (key === 'term_days') {
      const found = TERM_PRESETS.find(t => t.days === parseInt(value));
      next.term_label = found ? found.label : '';
      next.maturity_date = addDays(next.op_date, parseInt(value) || 0);
    }
    if (key === 'op_date') {
      next.maturity_date = addDays(value, parseInt(next.term_days) || 0);
    }

    setForm(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.op_date || !form.amount || !form.rate) {
      setMsg({ type: 'error', text: '请填写日期、金额、利率' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tools/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: toolId,
          op_type: 'fund',
          op_date: form.op_date,
          amount: parseFloat(form.amount),
          rate: parseFloat(form.rate),
          term: parseInt(form.term_days) || 0,
          term_label: form.term_label,
          maturity_date: form.maturity_date,
          direction: form.direction,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg({ type: 'success', text: '操作记录已保存' });
      setForm({
        op_date: getToday(),
        amount: '',
        rate: '',
        term_days: '',
        term_label: '',
        maturity_date: '',
        direction: 'release',
      });
    } catch (err) {
      setMsg({ type: 'error', text: `保存失败: ${err.message}` });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <form className="dm-form" onSubmit={handleSubmit} style={{ borderLeftColor: color }}>
      <h3 className="dm-form-title" style={{ color }}>{toolName} — 新增操作</h3>

      <div className="dm-form-grid">
        <div className="dm-field">
          <label>操作日期</label>
          <input type="date" value={form.op_date} onChange={e => handleChange('op_date', e.target.value)} required />
        </div>
        <div className="dm-field">
          <label>金额（亿元）</label>
          <input type="number" step="1" placeholder="如 2000" value={form.amount}
            onChange={e => handleChange('amount', e.target.value)} required />
        </div>
        <div className="dm-field">
          <label>利率（%）</label>
          <input type="number" step="0.01" placeholder="如 2.00" value={form.rate}
            onChange={e => handleChange('rate', e.target.value)} required />
        </div>
        <div className="dm-field">
          <label>期限</label>
          <select value={form.term_days} onChange={e => handleChange('term_days', e.target.value)}>
            <option value="">— 选择期限 —</option>
            {TERM_PRESETS.map(t => (
              <option key={t.days} value={t.days}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="dm-field">
          <label>到期日</label>
          <input type="date" value={form.maturity_date}
            onChange={e => handleChange('maturity_date', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>方向</label>
          <select value={form.direction} onChange={e => handleChange('direction', e.target.value)}>
            <option value="release">投放</option>
            <option value="mature">到期回笼</option>
          </select>
        </div>
      </div>

      <div className="dm-form-actions">
        <button type="submit" className="dm-btn-submit" disabled={submitting}>
          {submitting ? '提交中...' : '提交'}
        </button>
        {msg && <span className={`dm-msg dm-msg-${msg.type}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

// LPR form
function LPRForm({ color, onSubmit }) {
  const [form, setForm] = useState({ op_date: getToday(), rate1y: '', rate5y: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.op_date || !form.rate1y || !form.rate5y) {
      setMsg({ type: 'error', text: '请填写日期和利率' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tools/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: 'lpr',
          op_type: 'rate',
          op_date: form.op_date,
          rate1y: parseFloat(form.rate1y),
          rate5y: parseFloat(form.rate5y),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg({ type: 'success', text: 'LPR 报价已保存' });
      setForm({ op_date: getToday(), rate1y: '', rate5y: '' });
    } catch (err) {
      setMsg({ type: 'error', text: `保存失败: ${err.message}` });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <form className="dm-form" onSubmit={handleSubmit} style={{ borderLeftColor: color }}>
      <h3 className="dm-form-title" style={{ color }}>LPR 报价录入</h3>

      <div className="dm-form-grid">
        <div className="dm-field">
          <label>报价日期</label>
          <input type="date" value={form.op_date} onChange={e => setForm(p => ({ ...p, op_date: e.target.value }))} required />
        </div>
        <div className="dm-field">
          <label>1年期 LPR（%）</label>
          <input type="number" step="0.01" placeholder="如 3.10" value={form.rate1y}
            onChange={e => setForm(p => ({ ...p, rate1y: e.target.value }))} required />
        </div>
        <div className="dm-field">
          <label>5年期以上 LPR（%）</label>
          <input type="number" step="0.01" placeholder="如 3.60" value={form.rate5y}
            onChange={e => setForm(p => ({ ...p, rate5y: e.target.value }))} required />
        </div>
      </div>

      <div className="dm-form-actions">
        <button type="submit" className="dm-btn-submit" disabled={submitting}>
          {submitting ? '提交中...' : '提交'}
        </button>
        {msg && <span className={`dm-msg dm-msg-${msg.type}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

// Month collection card
function CollectCard() {
  const [month, setMonth] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleCollect = async () => {
    setCollecting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(month ? { month } : {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMsg({ type: 'success', text: data.message });
    } catch (err) {
      setMsg({ type: 'error', text: `采集失败: ${err.message}` });
    } finally {
      setCollecting(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  return (
    <div className="dm-collect-card">
      <h3 className="dm-collect-title">新闻 + 货币政策工具数据采集</h3>
      <p className="dm-page-desc" style={{ marginBottom: 14 }}>
        从配置的中美新闻源采集政策新闻，同时从 PBOC 官网自动采集货币政策工具操作数据（逆回购/MLF/SLF/PSL/LPR）。不填月份采最新，填月份（如 2026-04）采集该月数据。
      </p>
      <div className="dm-collect-row">
        <div className="dm-field">
          <label>月份（可选，YYYY-MM）</label>
          <input
            type="text"
            placeholder="如 2026-04，留空采最新"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ width: 200 }}
            pattern="\d{4}-\d{2}"
          />
        </div>
        <button className="dm-collect-btn" onClick={handleCollect} disabled={collecting}>
          {collecting ? '采集中...' : month ? `采集 ${month}` : '立即采集'}
        </button>
        {msg && <span className={`dm-msg dm-msg-${msg.type}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

export default function DataManager() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0].id);
  const tool = TOOLS.find(t => t.id === selectedTool);

  return (
    <div className="dm-container">
      <h2 className="dm-page-title">数据管理</h2>
      <p className="dm-page-desc">手动录入货币政策工具操作记录 + 按月份触发新闻采集。</p>

      <CollectCard />

      <div className="dm-tool-select">
        <label>选择工具：</label>
        <select value={selectedTool} onChange={e => setSelectedTool(e.target.value)}>
          {TOOLS.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {tool.type === 'fund' ? (
        <FundForm toolId={tool.id} toolName={tool.name} color={tool.color} />
      ) : (
        <LPRForm color={tool.color} />
      )}
    </div>
  );
}

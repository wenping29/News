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

const EXCHANGE_OPTIONS = ['上交所', '深交所', '深交所创业板'];

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

// 妖股信息采集卡片
function LegendaryStockCollectCard() {
  const [riseThreshold, setRiseThreshold] = useState(80);
  const [windowDays, setWindowDays] = useState(20);
  const [collecting, setCollecting] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleCollect = async () => {
    setCollecting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/collect-legendary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riseThreshold: parseFloat(riseThreshold),
          windowDays: parseInt(windowDays),
          maxStocks: 30,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMsg({ type: 'success', text: `${data.message}（完成后请刷新页面查看）` });
    } catch (err) {
      setMsg({ type: 'error', text: `采集失败: ${err.message}` });
    } finally {
      setCollecting(false);
      setTimeout(() => setMsg(null), 8000);
    }
  };

  return (
    <div className="dm-collect-card" style={{ borderLeftColor: '#c0392b' }}>
      <h3 className="dm-collect-title" style={{ color: '#c0392b' }}>妖股数据采集</h3>
      <p className="dm-page-desc" style={{ marginBottom: 14 }}>
        自动扫描沪深两市涨幅榜，分析近期走势特征，识别疑似妖股。采集结果会自动添加到"历史上的妖股"数据库中。
        <strong style={{ color: '#e74c3c' }}>（需要能访问东方财富API）</strong>
      </p>
      <div className="dm-collect-row">
        <div className="dm-field">
          <label>涨幅阈值（%）</label>
          <input
            type="number"
            min="30"
            max="300"
            value={riseThreshold}
            onChange={e => setRiseThreshold(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <div className="dm-field">
          <label>检测窗口（天）</label>
          <input
            type="number"
            min="10"
            max="60"
            value={windowDays}
            onChange={e => setWindowDays(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <button className="dm-collect-btn" onClick={handleCollect} disabled={collecting} style={{ background: '#c0392b' }}>
          {collecting ? '采集中...' : '采集妖股数据'}
        </button>
        {msg && <span className={`dm-msg dm-msg-${msg.type}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

// 批量检测妖股（手动输入代码）
function BatchDetectLegendary() {
  const [codesInput, setCodesInput] = useState('');
  const [windowDays, setWindowDays] = useState(20);
  const [riseThreshold, setRiseThreshold] = useState(50);
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState([]);
  const [msg, setMsg] = useState(null);

  const handleDetect = async () => {
    const codes = codesInput
      .split(/[\s,，;；\n]+/)
      .map(c => c.trim())
      .filter(c => /^\d{6}$/.test(c));

    if (codes.length === 0) {
      setMsg({ type: 'error', text: '请输入至少一个6位股票代码' });
      return;
    }

    setDetecting(true);
    setMsg(null);
    setResults([]);

    const detected = [];
    
    for (const code of codes) {
      for (const exchange of ['上交所', '深交所']) {
        try {
          const res = await fetch(`${API_BASE}/detect-legendary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, exchange, windowDays, riseThreshold }),
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.isLegendary) {
              detected.push({ ...data, exchange });
            }
          }
        } catch (e) {
          // 忽略错误，继续下一个
        }
      }
    }

    setResults(detected);
    setDetecting(false);
    
    if (detected.length > 0) {
      setMsg({ type: 'success', text: `发现 ${detected.length} 只疑似妖股` });
    } else {
      setMsg({ type: 'error', text: '未发现疑似妖股，或网络请求失败' });
    }
  };

  const handleSave = async (stock) => {
    try {
      const res = await fetch(`${API_BASE}/legendary-stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stock.name || stock.code,
          code: stock.code,
          exchange: stock.exchange,
          period: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`,
          rise_note: `${stock.windowDays}日涨幅${stock.maxRise.toFixed(0)}%`,
          theme: '批量检测发现',
          story: `${stock.windowDays}个交易日内最大涨幅${stock.maxRise.toFixed(0)}%，从${stock.maxRiseStartPrice}元涨至${stock.maxRiseEndPrice}元`,
          outcome: '待观察',
          peak_price: stock.maxRiseEndPrice,
          peak_date: stock.maxRiseEnd,
          low_price: stock.maxRiseStartPrice,
          low_date: stock.maxRiseStart,
          peak_rise_pct: stock.maxRise,
          events: [],
        }),
      });
      
      if (res.ok) {
        setMsg({ type: 'success', text: `${stock.code} 已保存到数据库` });
      } else {
        const data = await res.json();
        setMsg({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: `保存失败: ${e.message}` });
    }
  };

  return (
    <div className="dm-collect-card" style={{ borderLeftColor: '#9b59b6' }}>
      <h3 className="dm-collect-title" style={{ color: '#9b59b6' }}>批量检测妖股</h3>
      <p className="dm-page-desc" style={{ marginBottom: 14 }}>
        手动输入股票代码列表（每行一个或用逗号分隔），系统会逐个分析是否存在短期剧烈上涨。
      </p>
      
      <div className="dm-field" style={{ marginBottom: 14 }}>
        <label>股票代码列表</label>
        <textarea
          rows="4"
          placeholder={"例如：\n000025\n600776\n300431\n或用逗号分隔：000025,600776,300431"}
          value={codesInput}
          onChange={e => setCodesInput(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', fontFamily: 'monospace' }}
        />
      </div>

      <div className="dm-collect-row" style={{ marginBottom: 14 }}>
        <div className="dm-field">
          <label>涨幅阈值（%）</label>
          <input
            type="number"
            min="20"
            max="200"
            value={riseThreshold}
            onChange={e => setRiseThreshold(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <div className="dm-field">
          <label>检测窗口（天）</label>
          <input
            type="number"
            min="10"
            max="60"
            value={windowDays}
            onChange={e => setWindowDays(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <button className="dm-collect-btn" onClick={handleDetect} disabled={detecting} style={{ background: '#9b59b6' }}>
          {detecting ? '检测中...' : '批量检测'}
        </button>
      </div>

      {msg && <span className={`dm-msg dm-msg-${msg.type}`} style={{ display: 'block', marginBottom: 12 }}>{msg.text}</span>}

      {results.length > 0 && (
        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#9b59b6', marginBottom: '10px' }}>检测结果：</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((r, idx) => (
              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fff', borderRadius: '6px', marginBottom: '8px' }}>
                <div>
                  <strong>{r.code}</strong> ({r.exchange})
                  <span style={{ marginLeft: '12px', color: '#e74c3c', fontWeight: '700' }}>涨幅{r.maxRise.toFixed(0)}%</span>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    {r.maxRiseStart} → {r.maxRiseEnd} | ¥{r.maxRiseStartPrice} → ¥{r.maxRiseEndPrice}
                  </div>
                </div>
                <button
                  onClick={() => handleSave(r)}
                  style={{ padding: '4px 12px', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  保存到数据库
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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

// 妖股信息录入表单
function LegendaryStockForm() {
  const [form, setForm] = useState({
    name: '',
    code: '',
    exchange: '',
    period: '',
    rise_note: '',
    theme: '',
    story: '',
    outcome: '',
    peak_price: '',
    peak_date: '',
    low_price: '',
    low_date: '',
    peak_rise_pct: '',
  });
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    event_date: '',
    price: '',
    change_pct: '',
    event_type: 'surge',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleEventChange = (key, value) => {
    setNewEvent(prev => ({ ...prev, [key]: value }));
  };

  const addEvent = () => {
    if (!newEvent.event_date || !newEvent.description) {
      setMsg({ type: 'error', text: '事件日期和描述不能为空' });
      return;
    }
    setEvents(prev => [...prev, { ...newEvent }]);
    setNewEvent({ event_date: '', price: '', change_pct: '', event_type: 'surge', description: '' });
    setMsg(null);
  };

  const removeEvent = (index) => {
    setEvents(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.exchange) {
      setMsg({ type: 'error', text: '请填写股票名称、代码和市场' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/legendary-stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          peak_price: parseFloat(form.peak_price) || 0,
          low_price: parseFloat(form.low_price) || 0,
          peak_rise_pct: parseFloat(form.peak_rise_pct) || 0,
          events: events.map(evt => ({
            ...evt,
            price: parseFloat(evt.price) || 0,
            change_pct: parseFloat(evt.change_pct) || 0,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setMsg({ type: 'success', text: '妖股信息已保存' });
      setForm({
        name: '', code: '', exchange: '', period: '', rise_note: '', theme: '',
        story: '', outcome: '', peak_price: '', peak_date: '', low_price: '',
        low_date: '', peak_rise_pct: '',
      });
      setEvents([]);
    } catch (err) {
      setMsg({ type: 'error', text: `保存失败: ${err.message}` });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <form className="dm-form" onSubmit={handleSubmit} style={{ borderLeftColor: '#c0392b' }}>
      <h3 className="dm-form-title" style={{ color: '#c0392b' }}>妖股信息录入</h3>
      <p className="dm-page-desc" style={{ marginBottom: 14 }}>
        妖股定义：短期内剧烈上涨的股票。请录入代表性案例便于复盘与风险教育。
      </p>

      <div className="dm-form-grid">
        <div className="dm-field">
          <label>股票名称 *</label>
          <input type="text" placeholder="如 特力A" value={form.name} onChange={e => handleChange('name', e.target.value)} required />
        </div>
        <div className="dm-field">
          <label>股票代码 *</label>
          <input type="text" placeholder="如 000025" value={form.code} onChange={e => handleChange('code', e.target.value)} required />
        </div>
        <div className="dm-field">
          <label>市场 *</label>
          <select value={form.exchange} onChange={e => handleChange('exchange', e.target.value)} required>
            <option value="">— 选择市场 —</option>
            {EXCHANGE_OPTIONS.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
        </div>
        <div className="dm-field">
          <label>妖股时期</label>
          <input type="text" placeholder="如 2015年" value={form.period} onChange={e => handleChange('period', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>题材/概念</label>
          <input type="text" placeholder="如 国企改革" value={form.theme} onChange={e => handleChange('theme', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>上涨特征</label>
          <input type="text" placeholder="如 连续涨停" value={form.rise_note} onChange={e => handleChange('rise_note', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>历史高点价格</label>
          <input type="number" step="0.01" placeholder="如 108.90" value={form.peak_price} onChange={e => handleChange('peak_price', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>高点日期</label>
          <input type="date" value={form.peak_date} onChange={e => handleChange('peak_date', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>峰值涨幅%</label>
          <input type="number" step="0.1" placeholder="如 1123.6" value={form.peak_rise_pct} onChange={e => handleChange('peak_rise_pct', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>历史低点价格</label>
          <input type="number" step="0.01" placeholder="如 8.90" value={form.low_price} onChange={e => handleChange('low_price', e.target.value)} />
        </div>
        <div className="dm-field">
          <label>低点日期</label>
          <input type="date" value={form.low_date} onChange={e => handleChange('low_date', e.target.value)} />
        </div>
      </div>

      <div className="dm-field" style={{ marginBottom: 14 }}>
        <label>故事/背景描述</label>
        <textarea
          rows="3"
          placeholder="描述该股票为何被视为妖股..."
          value={form.story}
          onChange={e => handleChange('story', e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
        />
      </div>

      <div className="dm-field" style={{ marginBottom: 14 }}>
        <label>后续概况</label>
        <textarea
          rows="2"
          placeholder="后续走势或结果..."
          value={form.outcome}
          onChange={e => handleChange('outcome', e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
        />
      </div>

      {/* 波动事件录入区 */}
      <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#c0392b', marginBottom: '10px' }}>关键波动事件（可选）</h4>
        
        <div className="dm-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="dm-field">
            <label>事件日期</label>
            <input type="date" value={newEvent.event_date} onChange={e => handleEventChange('event_date', e.target.value)} />
          </div>
          <div className="dm-field">
            <label>价格</label>
            <input type="number" step="0.01" placeholder="如 43.50" value={newEvent.price} onChange={e => handleEventChange('price', e.target.value)} />
          </div>
          <div className="dm-field">
            <label>涨跌幅%</label>
            <input type="number" step="0.1" placeholder="如 388.8" value={newEvent.change_pct} onChange={e => handleEventChange('change_pct', e.target.value)} />
          </div>
          <div className="dm-field">
            <label>事件类型</label>
            <select value={newEvent.event_type} onChange={e => handleEventChange('event_type', e.target.value)}>
              <option value="surge">暴涨</option>
              <option value="peak">峰值</option>
              <option value="crash">暴跌</option>
              <option value="bottom">低点</option>
              <option value="start">启动</option>
              <option value="listing">上市</option>
              <option value="delisted">退市</option>
            </select>
          </div>
        </div>
        <div className="dm-field" style={{ marginTop: '10px' }}>
          <label>事件描述</label>
          <input
            type="text"
            placeholder="如 连续涨停突破 40 元"
            value={newEvent.description}
            onChange={e => handleEventChange('description', e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={addEvent}
          style={{ marginTop: '10px', padding: '6px 16px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
        >
          + 添加事件
        </button>

        {events.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>已添加事件：</h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {events.map((evt, idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fff', borderRadius: '4px', marginBottom: '6px', fontSize: '13px' }}>
                  <span>
                    <strong>{evt.event_date}</strong> - {evt.description} 
                    {evt.price && ` (¥${evt.price})`}
                    {evt.change_pct && ` ${evt.change_pct >= 0 ? '+' : ''}${evt.change_pct}%`}
                  </span>
                  <button type="button" onClick={() => removeEvent(idx)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}>删除</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="dm-form-actions">
        <button type="submit" className="dm-btn-submit" disabled={submitting} style={{ background: '#c0392b' }}>
          {submitting ? '提交中...' : '提交妖股信息'}
        </button>
        {msg && <span className={`dm-msg dm-msg-${msg.type}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

export default function DataManager() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0].id);
  const tool = TOOLS.find(t => t.id === selectedTool);

  return (
    <div className="dm-container">
      <h2 className="dm-page-title">数据管理</h2>
      <p className="dm-page-desc">手动录入货币政策工具操作记录 + 按月份触发新闻采集 + 妖股信息录入。</p>

      <CollectCard />

      <LegendaryStockCollectCard />

      <BatchDetectLegendary />

      <div className="dm-tool-select">
        <label>选择工具：</label>
        <select value={selectedTool} onChange={e => setSelectedTool(e.target.value)}>
          {TOOLS.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
          <option value="legendary">妖股信息录入</option>
        </select>
      </div>

      {selectedTool === 'legendary' ? (
        <LegendaryStockForm />
      ) : tool.type === 'fund' ? (
        <FundForm toolId={tool.id} toolName={tool.name} color={tool.color} />
      ) : (
        <LPRForm color={tool.color} />
      )}
    </div>
  );
}

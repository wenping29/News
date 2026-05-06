import { useState, useEffect } from 'react';
import { fetchLegendaryStocks } from '../services/api';
import LegendaryStockDetail from './LegendaryStockDetail';

const EXCHANGE_OPTIONS = ['上交所', '深交所', '深交所创业板'];

export default function LegendaryStocks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [exchange, setExchange] = useState('');
  const [detailStock, setDetailStock] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 280);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchLegendaryStocks({ q, exchange });
        if (!cancelled) setItems(data.items || []);
      } catch (e) {
        if (!cancelled) setError(e.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, exchange]);

  const openDetail = row => setDetailStock(row);
  const closeDetail = () => setDetailStock(null);

  return (
    <div className="ls-container">
      <div className="ls-hero">
        <h2 className="ls-title">历史上的妖股</h2>
        <p className="ls-desc">
          整理 A 股历史上高波动、强题材或极端走势的代表性案例，便于复盘与风险教育。
          <strong className="ls-disclaimer"> 不构成投资建议。</strong>
        </p>
      </div>

      <div className="ls-toolbar">
        <div className="ls-field">
          <label htmlFor="ls-q">关键词</label>
          <input
            id="ls-q"
            type="search"
            placeholder="名称、代码、题材、时期…"
            value={qInput}
            onChange={e => setQInput(e.target.value)}
          />
        </div>
        <div className="ls-field">
          <label htmlFor="ls-ex">市场</label>
          <select id="ls-ex" value={exchange} onChange={e => setExchange(e.target.value)}>
            <option value="">全部</option>
            {EXCHANGE_OPTIONS.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading">加载中...</div>}
      {error && <div className="ls-error">{error}</div>}

      {!loading && !error && (
        <ul className="ls-list">
          {items.length === 0 && (
            <li className="ls-empty">没有匹配的案例，试试清空筛选条件。</li>
          )}
          {items.map(row => (
            <li key={row.id}>
              <button
                type="button"
                className="ls-card ls-card-clickable"
                onClick={() => openDetail(row)}
              >
              <div className="ls-card-head">
                <div className="ls-name-block">
                  <span className="ls-name">{row.name}</span>
                  <span className="ls-code">{row.code}</span>
                </div>
                <span className="ls-exchange">{row.exchange}</span>
              </div>
              <div className="ls-tags">
                <span className="ls-tag ls-period">{row.period}</span>
                {row.theme && <span className="ls-tag ls-theme">{row.theme}</span>}
                {row.rise_note && <span className="ls-tag ls-rise">{row.rise_note}</span>}
              </div>
              <p className="ls-story">{row.story}</p>
              {row.outcome && (
                <p className="ls-outcome">
                  <span className="ls-outcome-label">后续概况</span>
                  {row.outcome}
                </p>
              )}
              <p className="ls-card-hint">点击查看详情与走势 →</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {detailStock && (
        <LegendaryStockDetail stock={detailStock} onClose={closeDetail} />
      )}
    </div>
  );
}

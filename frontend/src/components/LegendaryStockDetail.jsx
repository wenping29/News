import { useState, useEffect, useMemo, useId } from 'react';
import { fetchStockHistory } from '../services/api';

function buildPath(points, width, height, padL, padR, padT, padB) {
  if (!points.length) return '';
  const ys = points.map(p => p.close);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const n = points.length;
  const step = n <= 1 ? 0 : innerW / (n - 1);

  return points
    .map((p, i) => {
      const x = padL + step * i;
      const yNorm = (p.close - minY) / spanY;
      const y = padT + innerH * (1 - yNorm);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function formatPrice(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toFixed(2);
}

export default function LegendaryStockDetail({ stock, onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [series, setSeries] = useState(null);
  const fillGradId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!stock) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      setSeries(null);
      try {
        const data = await fetchStockHistory(stock.code, stock.exchange);
        if (!cancelled) setSeries(data);
      } catch (e) {
        if (!cancelled) setErr(e.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stock]);

  useEffect(() => {
    if (!stock) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stock, onClose]);

  useEffect(() => {
    if (!stock) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stock]);

  const points = series?.points || [];
  const stats = useMemo(() => {
    if (!points.length) return null;
    const closes = points.map(p => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const first = points[0];
    const last = points[points.length - 1];
    const changePct =
      first.close > 0 ? ((last.close - first.close) / first.close) * 100 : null;
    return { min, max, first, last, changePct };
  }, [points]);

  const W = 720;
  const H = 280;
  const padL = 52;
  const padR = 16;
  const padT = 18;
  const padB = 36;
  const path = useMemo(
    () => buildPath(points, W, H, padL, padR, padT, padB),
    [points]
  );

  const xLabels = useMemo(() => {
    if (!points.length) return [];
    const pick = i => ({
      x: padL + (points.length <= 1 ? 0 : ((W - padL - padR) * i) / (points.length - 1)),
      text: points[i].date.slice(0, 7),
    });
    if (points.length === 1) return [pick(0)];
    const mid = Math.floor((points.length - 1) / 2);
    return [pick(0), pick(mid), pick(points.length - 1)];
  }, [points]);

  if (!stock) return null;

  return (
    <div
      className="lsd-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lsd-title"
      onClick={onClose}
    >
      <div className="lsd-panel" onClick={e => e.stopPropagation()}>
        <div className="lsd-head">
          <div>
            <h3 id="lsd-title" className="lsd-title">
              {stock.name}
              <span className="lsd-code">{stock.code}</span>
            </h3>
            <p className="lsd-sub">{stock.exchange} · {stock.period}</p>
          </div>
          <button type="button" className="lsd-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="lsd-body">
          <div className="lsd-chart-head">
            <span className="lsd-chart-title">月线收盘价走势</span>
            <span className="lsd-chart-note">后端代理东方财富 K 线（月线收盘），仅供参考</span>
          </div>

          {loading && <div className="lsd-chart-loading">加载走势数据…</div>}
          {!loading && err && (
            <div className="lsd-chart-error">{err}</div>
          )}
          {!loading && !err && points.length < 2 && (
            <div className="lsd-chart-empty">可用数据点过少，无法绘制趋势线（可能已退市或源站不可达）。</div>
          )}
          {!loading && !err && points.length >= 2 && (
            <>
              {stats && (
                <div className="lsd-stats">
                  <div>
                    <span className="lsd-st-label">区间首尾</span>
                    <span className="lsd-st-val">
                      {stats.first.date} → {stats.last.date}
                    </span>
                  </div>
                  <div>
                    <span className="lsd-st-label">首尾涨跌</span>
                    <span
                      className={
                        stats.changePct == null
                          ? 'lsd-st-val'
                          : stats.changePct >= 0
                            ? 'lsd-st-val lsd-up'
                            : 'lsd-st-val lsd-down'
                      }
                    >
                      {stats.changePct == null
                        ? '—'
                        : `${stats.changePct >= 0 ? '+' : ''}${stats.changePct.toFixed(1)}%`}
                    </span>
                  </div>
                  <div>
                    <span className="lsd-st-label">收盘高/低</span>
                    <span className="lsd-st-val">
                      {formatPrice(stats.max)} / {formatPrice(stats.min)}
                    </span>
                  </div>
                </div>
              )}
              <div className="lsd-svg-wrap">
                <svg
                  className="lsd-svg"
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c0392b" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#c0392b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1={padL}
                    y1={H - padB}
                    x2={W - padR}
                    y2={H - padB}
                    stroke="#e0e0e0"
                    strokeWidth="1"
                  />
                  <text x={padL} y={H - 10} fill="#999" fontSize="11">
                    {formatPrice(stats.min)}
                  </text>
                  <text x={padL} y={padT + 12} fill="#999" fontSize="11">
                    {formatPrice(stats.max)}
                  </text>
                  {path && (
                    <>
                      <path
                        d={`${path} L ${W - padR} ${H - padB} L ${padL} ${H - padB} Z`}
                        fill={`url(#${fillGradId})`}
                      />
                      <path
                        d={path}
                        fill="none"
                        stroke="#c0392b"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                  {xLabels.map((lb, i) => (
                    <text
                      key={i}
                      x={lb.x}
                      y={H - 12}
                      fill="#888"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {lb.text}
                    </text>
                  ))}
                </svg>
              </div>
            </>
          )}

          <div className="lsd-story-block">
            <p className="lsd-story">{stock.story}</p>
            {stock.outcome && (
              <p className="lsd-outcome">
                <span className="ls-outcome-label">后续概况</span>
                {stock.outcome}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

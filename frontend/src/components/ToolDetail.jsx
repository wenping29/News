import { useState, useEffect, useMemo } from 'react';
import { fetchToolOperations } from '../services/api';

const TOOLS_MAP = {
  slo: { name: '短期流动性调节工具', abbr: 'SLO', color: '#2ecc71' },
  mlf: { name: '中期借贷便利', abbr: 'MLF', color: '#e67e22' },
  slf: { name: '常备借贷便利', abbr: 'SLF', color: '#3498db' },
  psl: { name: '抵押补充贷款', abbr: 'PSL', color: '#9b59b6' },
  'reverse-repo': { name: '逆回购', abbr: 'Reverse Repo', color: '#e74c3c' },
  lpr: { name: '贷款市场报价利率', abbr: 'LPR', color: '#f39c12' },
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function isExpired(maturityDate) {
  if (!maturityDate) return false;
  return maturityDate < getToday();
}

function fmtAmount(amount) {
  if (amount >= 10000) return (amount / 10000).toFixed(2) + '万亿';
  return amount + '亿';
}

function parseDate(s) {
  return new Date(s);
}

function daysBetween(a, b) {
  return (parseDate(b) - parseDate(a)) / 86400000;
}

// ==================== Fund Tool Detail ====================
function FundDetail({ toolId, rawOps }) {
  const ops = useMemo(() =>
    rawOps.map(op => ({ ...op, expired: isExpired(op.maturity_date) })),
    [rawOps]
  );

  const stats = useMemo(() => {
    const outstanding = ops.filter(o => !o.expired).reduce((s, o) => s + o.amount, 0);
    const matured = ops.filter(o => o.expired).reduce((s, o) => s + o.amount, 0);
    const net = outstanding;
    const latest = ops[0];
    return { outstanding, matured, net, latest };
  }, [ops]);

  const today = getToday();
  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates = ops.flatMap(o => [o.op_date, o.maturity_date, today].filter(Boolean));
    const sorted = dates.sort();
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const days = daysBetween(min, max);
    return { minDate: min, maxDate: max, totalDays: Math.max(days, 1) };
  }, [ops, today]);

  const todayPct = useMemo(() => {
    return (daysBetween(minDate, today) / totalDays) * 100;
  }, [minDate, totalDays, today]);

  const barHeight = 28;
  const labelWidth = 130;
  const chartWidth = Math.max(600, labelWidth + totalDays * 2.5);

  return (
    <div className="td-detail">
      {/* Summary Cards */}
      <div className="td-summary">
        <div className="td-summary-card release">
          <div className="td-summary-icon">↓</div>
          <div className="td-summary-data">
            <div className="td-summary-value">{fmtAmount(stats.outstanding)}</div>
            <div className="td-summary-label">存续中</div>
          </div>
        </div>
        <div className="td-summary-card mature">
          <div className="td-summary-icon">↑</div>
          <div className="td-summary-data">
            <div className="td-summary-value">{fmtAmount(stats.matured)}</div>
            <div className="td-summary-label">已到期</div>
          </div>
        </div>
        <div className="td-summary-card net">
          <div className="td-summary-icon">⟳</div>
          <div className="td-summary-data">
            <div className="td-summary-value">{fmtAmount(stats.net)}</div>
            <div className="td-summary-label">净存续规模</div>
          </div>
        </div>
        <div className="td-summary-card rate">
          <div className="td-summary-icon">%</div>
          <div className="td-summary-data">
            <div className="td-summary-value">{stats.latest.rate.toFixed(2)}%</div>
            <div className="td-summary-label">最新利率 ({stats.latest.op_date})</div>
          </div>
        </div>
      </div>

      {/* Gantt Timeline */}
      <div className="td-chart-section">
        <h3 className="td-chart-title">资金存续时间轴</h3>
        <div className="td-gantt-wrap">
          <div className="td-gantt" style={{ width: chartWidth }}>
            {ops.map((op, i) => {
              const startPct = (daysBetween(minDate, op.op_date) / totalDays) * 100;
              const widthPct = (daysBetween(op.op_date, op.maturity_date) / totalDays) * 100;
              return (
                <div key={op.id || i} className="td-gantt-row" style={{ height: barHeight }}>
                  <div className="td-gantt-label" style={{ width: labelWidth }}>
                    <span className="td-gantt-label-date">{op.op_date}</span>
                    <span className="td-gantt-label-amount">{fmtAmount(op.amount)}</span>
                  </div>
                  <div className="td-gantt-track" style={{ width: `calc(100% - ${labelWidth}px)` }}>
                    <div
                      className={`td-gantt-bar ${op.expired ? 'expired' : 'active'}`}
                      style={{
                        left: startPct + '%',
                        width: Math.max(widthPct, 2) + '%',
                        background: op.expired ? '#bbb' : TOOLS_MAP[toolId].color,
                      }}
                    >
                      <span className="td-gantt-bar-text">
                        {op.term_label} {op.rate.toFixed(2)}%
                      </span>
                    </div>
                    {todayPct > startPct && todayPct < startPct + widthPct && (
                      <div className="td-gantt-today" style={{ left: todayPct + '%' }} title="今日" />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="td-gantt-axis" style={{ paddingLeft: labelWidth }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} className="td-gantt-tick" style={{ left: pct + '%' }}>
                  <span className="td-gantt-tick-label">
                    {(() => {
                      const d = new Date(parseDate(minDate).getTime() + totalDays * pct / 100 * 86400000);
                      return d.toISOString().slice(0, 10);
                    })()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="td-chart-legend">
          <span className="td-legend-item"><span className="td-legend-dot active"></span> 存续中</span>
          <span className="td-legend-item"><span className="td-legend-dot expired"></span> 已到期</span>
          <span className="td-legend-item"><span className="td-legend-today-marker"></span> 今日</span>
        </div>
      </div>

      {/* Operation Table */}
      <div className="td-table-section">
        <h3 className="td-chart-title">操作记录</h3>
        <div className="td-table-wrap">
          <table className="td-table">
            <thead>
              <tr>
                <th>操作日期</th>
                <th>金额</th>
                <th>利率</th>
                <th>期限</th>
                <th>到期日</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {ops.map(op => (
                <tr key={op.id} className={op.expired ? 'td-row-expired' : ''}>
                  <td>{op.op_date}</td>
                  <td className="td-amount">{fmtAmount(op.amount)}</td>
                  <td>{op.rate.toFixed(2)}%</td>
                  <td>{op.term_label}</td>
                  <td>{op.maturity_date}</td>
                  <td>
                    <span className={`td-status ${op.expired ? 'expired' : 'active'}`}>
                      {op.expired ? '已到期' : '存续中'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== LPR Detail ====================
function LPRDetail({ quotes }) {
  const sorted = useMemo(() => [...quotes].sort((a, b) => b.op_date.localeCompare(a.op_date)), [quotes]);
  const latest = sorted[0];
  const prev = sorted[1];
  const change1y = latest ? (latest.rate1y - (prev ? prev.rate1y : latest.rate1y)) : 0;
  const change5y = latest ? (latest.rate5y - (prev ? prev.rate5y : latest.rate5y)) : 0;

  const svgW = 640;
  const svgH = 260;
  const pad = { top: 20, right: 40, bottom: 44, left: 48 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const allRates = sorted.flatMap(q => [q.rate1y, q.rate5y]);
  const yMin = Math.floor(Math.min(...allRates) * 100) / 100 - 0.05;
  const yMax = Math.ceil(Math.max(...allRates) * 100) / 100 + 0.05;
  const yRange = yMax - yMin;

  const xScale = (i) => pad.left + (i / (sorted.length - 1)) * plotW;
  const yScale = (v) => pad.top + plotH - ((v - yMin) / yRange) * plotH;

  const line1y = sorted.map((q, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(q.rate1y).toFixed(1)}`).join(' ');
  const line5y = sorted.map((q, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(q.rate5y).toFixed(1)}`).join(' ');

  const yTicks = [];
  const tickStep = yRange <= 0.15 ? 0.05 : yRange <= 0.3 ? 0.10 : 0.20;
  for (let v = yMin; v <= yMax + tickStep / 2; v += tickStep) {
    yTicks.push(Math.round(v * 100) / 100);
  }

  return (
    <div className="td-detail">
      <div className="td-summary">
        <div className="td-summary-card rate-1y">
          <div className="td-summary-icon">1Y</div>
          <div className="td-summary-data">
            <div className="td-summary-value">{latest.rate1y.toFixed(2)}%</div>
            <div className="td-summary-label">1年期 LPR</div>
            {change1y !== 0 && (
              <div className={`td-change ${change1y < 0 ? 'down' : 'up'}`}>
                {change1y > 0 ? '+' : ''}{change1y.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
        <div className="td-summary-card rate-5y">
          <div className="td-summary-icon">5Y</div>
          <div className="td-summary-data">
            <div className="td-summary-value">{latest.rate5y.toFixed(2)}%</div>
            <div className="td-summary-label">5年期以上 LPR</div>
            {change5y !== 0 && (
              <div className={`td-change ${change5y < 0 ? 'down' : 'up'}`}>
                {change5y > 0 ? '+' : ''}{change5y.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
        <div className="td-summary-card rate-date">
          <div className="td-summary-icon">📅</div>
          <div className="td-summary-data">
            <div className="td-summary-value" style={{ fontSize: 20 }}>{latest.op_date}</div>
            <div className="td-summary-label">最新报价日</div>
          </div>
        </div>
        <div className="td-summary-card rate-stable">
          <div className="td-summary-icon">—</div>
          <div className="td-summary-data">
            <div className="td-summary-value" style={{ fontSize: 22 }}>
              {change1y === 0 && change5y === 0 ? '持平' : change1y < 0 ? '下调' : '上调'}
            </div>
            <div className="td-summary-label">较上期变动</div>
          </div>
        </div>
      </div>

      <div className="td-chart-section">
        <h3 className="td-chart-title">LPR 利率走势</h3>
        <div className="td-lpr-chart-wrap">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="td-lpr-svg">
            {yTicks.map(v => (
              <g key={v}>
                <line x1={pad.left} y1={yScale(v)} x2={svgW - pad.right} y2={yScale(v)}
                  stroke="#eee" strokeWidth="1" />
                <text x={pad.left - 8} y={yScale(v) + 4} textAnchor="end" fontSize="11" fill="#999">
                  {v.toFixed(2)}%
                </text>
              </g>
            ))}
            {sorted.filter((_, i) => i % 2 === 0 || i === sorted.length - 1).map(q => {
              const idx = sorted.indexOf(q);
              return (
                <text key={q.op_date} x={xScale(idx)} y={svgH - 8} textAnchor="middle" fontSize="10" fill="#999">
                  {q.op_date.slice(5)}
                </text>
              );
            })}
            <path d={line1y} fill="none" stroke="#3498db" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={line5y} fill="none" stroke="#e74c3c" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="6,3" />
            {sorted.map((q, i) => (
              <g key={i}>
                <circle cx={xScale(i)} cy={yScale(q.rate1y)} r="3.5" fill="#fff" stroke="#3498db" strokeWidth="2" />
                <circle cx={xScale(i)} cy={yScale(q.rate5y)} r="3.5" fill="#fff" stroke="#e74c3c" strokeWidth="2" />
              </g>
            ))}
          </svg>
        </div>
        <div className="td-chart-legend">
          <span className="td-legend-item">
            <span className="td-legend-line" style={{ background: '#3498db' }}></span> 1年期 LPR
          </span>
          <span className="td-legend-item">
            <span className="td-legend-line" style={{ background: '#e74c3c', borderStyle: 'dashed' }}></span> 5年期以上 LPR
          </span>
        </div>
      </div>

      <div className="td-table-section">
        <h3 className="td-chart-title">历史报价</h3>
        <div className="td-table-wrap">
          <table className="td-table">
            <thead>
              <tr>
                <th>报价日期</th>
                <th>1年期 LPR</th>
                <th>5年期以上 LPR</th>
                <th>变动</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((q, i) => {
                const prevQ = sorted[i + 1];
                const changed = prevQ && (q.rate1y !== prevQ.rate1y || q.rate5y !== prevQ.rate5y);
                return (
                  <tr key={q.id || i}>
                    <td>{q.op_date}</td>
                    <td className="td-rate">{q.rate1y.toFixed(2)}%</td>
                    <td className="td-rate">{q.rate5y.toFixed(2)}%</td>
                    <td>
                      {i === sorted.length - 1 ? (
                        <span className="td-status expired">最早记录</span>
                      ) : changed ? (
                        <span className="td-status active" style={{ background: q.rate1y < prevQ.rate1y ? '#2ecc71' : '#e74c3c' }}>
                          {q.rate1y < prevQ.rate1y ? '下调' : '上调'}
                        </span>
                      ) : (
                        <span className="td-status expired">持平</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== ToolDetail ====================
export default function ToolDetail({ toolId, onBack }) {
  const tool = TOOLS_MAP[toolId];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchToolOperations(toolId)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [toolId]);

  if (!tool) {
    return <div className="td-error">未找到工具数据</div>;
  }

  return (
    <div className="td-container">
      {/* Header */}
      <div className="td-header">
        <button className="td-back-btn" onClick={onBack}>← 返回工具列表</button>
        <div className="td-header-info">
          <h2 className="td-header-title" style={{ color: tool.color }}>
            {tool.name}
            <span className="td-header-abbr" style={{ background: tool.color }}>{tool.abbr}</span>
          </h2>
          <p className="td-header-sub">
            {toolId === 'lpr'
              ? '报价行每月20日（遇节假日顺延）公布最新利率报价'
              : '央行通过公开市场操作调节市场流动性'}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="td-loading-wrap">
          <div className="td-loading-spinner"></div>
          <p>加载操作数据...</p>
        </div>
      ) : error ? (
        <div className="td-error-wrap">
          <p>数据加载失败: {error}</p>
          <button className="td-retry-btn" onClick={() => {
            setLoading(true);
            setError(null);
            fetchToolOperations(toolId)
              .then(res => { setData(res); setLoading(false); })
              .catch(err => { setError(err.message); setLoading(false); });
          }}>重试</button>
        </div>
      ) : data && data.operations.length === 0 ? (
        <div className="td-empty-wrap">
          <p>暂无操作记录</p>
        </div>
      ) : data && data.operations[0].op_type === 'rate' ? (
        <LPRDetail quotes={data.operations} />
      ) : (
        <FundDetail toolId={toolId} rawOps={data.operations} />
      )}
    </div>
  );
}

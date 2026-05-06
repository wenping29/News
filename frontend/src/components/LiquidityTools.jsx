import { useState } from 'react';
import ToolDetail from './ToolDetail';

const TOOLS = [
  {
    id: 'slo',
    name: '短期流动性调节工具',
    abbr: 'SLO',
    desc: '央行用于调节银行体系短期流动性波动的公开市场操作工具，期限通常在7天以内。',
    tenor: '1~7天',
    minDays: 1,
    maxDays: 7,
    color: '#2ecc71',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3"/>
        <path d="M24 12v12l8 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M14 18l4-1 1 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M34 30l-4 1-1-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'reverse-repo',
    name: '逆回购',
    abbr: 'Reverse Repo',
    desc: '央行通过向一级交易商购买有价证券，向市场投放流动性，期限以7天、14天、28天为主。',
    tenor: '7/14/28天',
    minDays: 7,
    maxDays: 28,
    color: '#e74c3c',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M8 16h32M8 32h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="20" cy="16" r="3" fill="currentColor"/>
        <circle cx="34" cy="32" r="3" fill="currentColor"/>
        <path d="M14 20l6 8M34 26l-6 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M38 12l4-4M10 36l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'slf',
    name: '常备借贷便利',
    abbr: 'SLF',
    desc: '央行向商业银行提供的短期流动性支持工具，由金融机构主动发起，期限为隔夜至3个月。',
    tenor: '隔夜~3个月',
    minDays: 1,
    maxDays: 90,
    color: '#3498db',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <rect x="8" y="14" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="3"/>
        <line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="26" x2="28" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M24 8v6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="24" cy="7" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'mlf',
    name: '中期借贷便利',
    abbr: 'MLF',
    desc: '央行向商业银行提供的中期基础货币投放工具，期限3个月至1年，可续作。',
    tenor: '3个月~1年',
    minDays: 90,
    maxDays: 365,
    color: '#e67e22',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <rect x="6" y="12" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="3"/>
        <rect x="14" y="20" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="24" cy="26" r="3" fill="currentColor"/>
        <path d="M24 6v6M24 40v2" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M12 8l4 6M36 8l-4 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'psl',
    name: '抵押补充贷款',
    abbr: 'PSL',
    desc: '央行以抵押方式向政策性银行提供的大额长期资金支持，期限3~5年，主要用于棚改等特定领域。',
    tenor: '3~5年',
    minDays: 1095,
    maxDays: 1825,
    color: '#9b59b6',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M24 4L8 14v16c0 8 6.7 12.4 16 14 9.3-1.6 16-6 16-14V14L24 4z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
        <path d="M18 22l4 4 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="24" y1="34" x2="24" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'lpr',
    name: '贷款市场报价利率',
    abbr: 'LPR',
    desc: '由多家商业银行报价计算得出的贷款基准利率，是贷款利率定价的主要参考基准，设1年期和5年期以上两个品种。',
    tenor: '1年 / 5年以上',
    minDays: 365,
    maxDays: 1825,
    color: '#f39c12',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M8 40V20l6 6 8-10 10 8 8-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8" cy="20" r="3" fill="currentColor"/>
        <circle cx="14" cy="26" r="3" fill="currentColor"/>
        <circle cx="22" cy="16" r="3" fill="currentColor"/>
        <circle cx="32" cy="24" r="3" fill="currentColor"/>
        <circle cx="40" cy="12" r="3" fill="currentColor"/>
        <line x1="4" y1="44" x2="44" y2="44" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <line x1="4" y1="40" x2="4" y2="44" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// Log-scale tick marks for the timeline
const TICKS = [
  { label: '1天', days: 1 },
  { label: '7天', days: 7 },
  { label: '14天', days: 14 },
  { label: '28天', days: 28 },
  { label: '3月', days: 90 },
  { label: '6月', days: 182 },
  { label: '1年', days: 365 },
  { label: '3年', days: 1095 },
  { label: '5年', days: 1825 },
  { label: '10年', days: 3650 },
];

function daysToX(days, maxDays, padding = 40, width = 700) {
  const logMin = Math.log(0.7);
  const logMax = Math.log(maxDays * 1.05);
  const scale = (width - padding * 2) / (logMax - logMin);
  return padding + (Math.log(days) - logMin) * scale;
}

export default function LiquidityTools() {
  const [selectedTool, setSelectedTool] = useState(null);
  const maxDays = 3650;

  // Detail view
  if (selectedTool) {
    return <ToolDetail toolId={selectedTool} onBack={() => setSelectedTool(null)} />;
  }

  // List view
  return (
    <div className="lt-container">
      {/* Tool Cards */}
      <section className="lt-cards">
        {TOOLS.map(tool => (
          <div
            key={tool.id}
            className="lt-card lt-card-clickable"
            style={{ '--tool-color': tool.color }}
            onClick={() => setSelectedTool(tool.id)}
          >
            <div className="lt-card-icon" style={{ color: tool.color }}>
              {tool.icon}
            </div>
            <div className="lt-card-body">
              <h3 className="lt-card-name">{tool.name}</h3>
              <span className="lt-card-abbr" style={{ background: tool.color }}>{tool.abbr}</span>
              <p className="lt-card-tenor">
                <span className="lt-tenor-label">期限</span>
                {tool.tenor}
              </p>
              <p className="lt-card-desc">{tool.desc}</p>
              <div className="lt-card-hint">点击查看最新操作 →</div>
            </div>
          </div>
        ))}
      </section>

      {/* Validity Period Timeline */}
      <section className="lt-timeline-section">
        <h2 className="lt-section-title">资金有效期对比</h2>
        <div className="lt-timeline-chart">
          <div className="lt-bars">
            {TOOLS.map(tool => (
              <div key={tool.id} className="lt-bar-row">
                <div className="lt-bar-label">
                  <span className="lt-bar-abbr" style={{ color: tool.color }}>{tool.abbr}</span>
                </div>
                <div className="lt-bar-track">
                  <div
                    className="lt-bar"
                    style={{
                      left: daysToX(tool.minDays, maxDays),
                      width: daysToX(tool.maxDays, maxDays) - daysToX(tool.minDays, maxDays),
                      background: tool.color,
                    }}
                  >
                    <span className="lt-bar-text">{tool.tenor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="lt-ticks" style={{ paddingLeft: 72 }}>
            {TICKS.map(t => (
              <div
                key={t.label}
                className="lt-tick"
                style={{ left: daysToX(t.days, maxDays) }}
              >
                <div className="lt-tick-line"></div>
                <span className="lt-tick-label">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

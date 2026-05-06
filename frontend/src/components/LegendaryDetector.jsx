import { useState } from 'react';
import { detectLegendaryStock } from '../services/api';

const EXCHANGE_OPTIONS = ['上交所', '深交所', '深交所创业板'];

export default function LegendaryDetector() {
  const [code, setCode] = useState('');
  const [exchange, setExchange] = useState('');
  const [windowDays, setWindowDays] = useState(20);
  const [riseThreshold, setRiseThreshold] = useState(50);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleDetect = async () => {
    if (!code || !exchange) {
      setError('请填写股票代码和市场');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('股票代码格式错误，应为6位数字');
      return;
    }

    setDetecting(true);
    setError('');
    setResult(null);

    try {
      const data = await detectLegendaryStock(code, exchange, {
        windowDays,
        riseThreshold,
      });
      setResult(data);
    } catch (e) {
      setError(e.message || '检测失败');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="ld-container">
      <h2 className="ld-title">妖股自动检测</h2>
      <p className="ld-desc">
        输入股票代码，系统会分析近期日线数据，检测是否存在短期内剧烈上涨的情况。
        <strong>妖股定义：指定天数内涨幅超过阈值。</strong>
      </p>

      <div className="ld-form">
        <div className="ld-form-row">
          <div className="ld-field">
            <label>股票代码 *</label>
            <input
              type="text"
              placeholder="如 000025"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
            />
          </div>
          <div className="ld-field">
            <label>市场 *</label>
            <select value={exchange} onChange={e => setExchange(e.target.value)}>
              <option value="">— 选择市场 —</option>
              {EXCHANGE_OPTIONS.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ld-form-row">
          <div className="ld-field">
            <label>检测窗口（天）</label>
            <input
              type="number"
              min="5"
              max="60"
              value={windowDays}
              onChange={e => setWindowDays(parseInt(e.target.value) || 20)}
            />
          </div>
          <div className="ld-field">
            <label>涨幅阈值（%）</label>
            <input
              type="number"
              min="10"
              max="500"
              value={riseThreshold}
              onChange={e => setRiseThreshold(parseInt(e.target.value) || 50)}
            />
          </div>
          <div className="ld-field ld-btn-field">
            <button
              className="ld-btn-detect"
              onClick={handleDetect}
              disabled={detecting}
            >
              {detecting ? '检测中...' : '开始检测'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="ld-error">{error}</div>
      )}

      {result && (
        <div className={`ld-result ${result.isLegendary ? 'ld-result-legendary' : 'ld-result-normal'}`}>
          <div className="ld-result-header">
            <h3 className="ld-result-title">
              {result.isLegendary ? '⚠️ 疑似妖股' : '✅ 未发现异常'}
            </h3>
            <span className="ld-result-code">{result.code} ({result.exchange})</span>
          </div>

          <div className="ld-result-summary">
            <div className="ld-summary-item">
              <span className="ld-summary-label">检测窗口</span>
              <span className="ld-summary-value">{result.windowDays}天</span>
            </div>
            <div className="ld-summary-item">
              <span className="ld-summary-label">最大涨幅</span>
              <span className={`ld-summary-value ${result.maxRise >= result.riseThreshold ? 'ld-up' : ''}`}>
                {result.maxRise != null ? `${result.maxRise.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="ld-summary-item">
              <span className="ld-summary-label">涨幅阈值</span>
              <span className="ld-summary-value">{result.riseThreshold}%</span>
            </div>
          </div>

          {result.maxRiseStart && (
            <div className="ld-result-period">
              <h4 className="ld-period-title">最大涨幅区间</h4>
              <div className="ld-period-info">
                <div>
                  <span className="ld-period-label">起始日期</span>
                  <span className="ld-period-value">{result.maxRiseStart}</span>
                </div>
                <div>
                  <span className="ld-period-label">起始价格</span>
                  <span className="ld-period-value">¥{result.maxRiseStartPrice}</span>
                </div>
                <div className="ld-period-arrow">→</div>
                <div>
                  <span className="ld-period-label">结束日期</span>
                  <span className="ld-period-value">{result.maxRiseEnd}</span>
                </div>
                <div>
                  <span className="ld-period-label">结束价格</span>
                  <span className="ld-period-value ld-price-end">¥{result.maxRiseEndPrice}</span>
                </div>
              </div>
            </div>
          )}

          <p className="ld-result-reason">{result.reason}</p>

          <div className="ld-result-latest">
            <span>最新价格：</span>
            <strong>¥{result.latestPrice}</strong>
            <span style={{ color: '#999', fontSize: '13px' }}>（{result.latestDate}）</span>
          </div>

          {result.isLegendary && (
            <p className="ld-hint">
              该股票在 {result.windowDays} 天内涨幅达到 {result.maxRise.toFixed(1)}%，符合妖股特征。
              建议谨慎对待，注意投资风险。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

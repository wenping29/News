/**
 * 技术指标计算模块
 * 支持 MACD、KDJ、RSI、布林带等常用指标
 */

/**
 * 计算EMA（指数移动平均）
 */
function calculateEMA(data, period) {
  const multiplier = 2 / (period + 1);
  const ema = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      sum += data[i];
      ema.push(null);
    } else if (i === period) {
      ema.push(sum / period);
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  return ema;
}

/**
 * 计算MACD
 * @param {Array} closePrices 收盘价数组
 * @param {number} fastPeriod 快线周期，默认12
 * @param {number} slowPeriod 慢线周期，默认26
 * @param {number} signalPeriod 信号线周期，默认9
 * @returns {Object} { dif, dea, macd }
 */
function calculateMACD(closePrices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(closePrices, fastPeriod);
  const slowEMA = calculateEMA(closePrices, slowPeriod);

  const dif = [];
  for (let i = 0; i < closePrices.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      dif.push(fastEMA[i] - slowEMA[i]);
    } else {
      dif.push(null);
    }
  }

  const validDif = dif.filter(v => v !== null);
  const deaValues = calculateEMA(validDif, signalPeriod);

  let deaIdx = 0;
  const dea = [];
  for (let i = 0; i < dif.length; i++) {
    if (dif[i] !== null) {
      dea.push(deaValues[deaIdx++] || null);
    } else {
      dea.push(null);
    }
  }

  const macd = [];
  for (let i = 0; i < dif.length; i++) {
    if (dif[i] !== null && dea[i] !== null) {
      macd.push((dif[i] - dea[i]) * 2);
    } else {
      macd.push(null);
    }
  }

  return { dif, dea, macd };
}

/**
 * 计算RSI（相对强弱指标）
 * @param {Array} closePrices 收盘价数组
 * @param {number} period 周期，默认14
 * @returns {Array} RSI值数组
 */
function calculateRSI(closePrices, period = 14) {
  const rsi = [];
  const changes = [];

  for (let i = 1; i < closePrices.length; i++) {
    changes.push(closePrices[i] - closePrices[i - 1]);
  }

  for (let i = 0; i < closePrices.length; i++) {
    if (i < period) {
      rsi.push(null);
      continue;
    }

    let gains = 0;
    let losses = 0;
    for (let j = i - period; j < i; j++) {
      if (changes[j] > 0) {
        gains += changes[j];
      } else {
        losses += Math.abs(changes[j]);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * 计算KDJ（随机指标）
 * @param {Array} highPrices 最高价数组
 * @param {Array} lowPrices 最低价数组
 * @param {Array} closePrices 收盘价数组
 * @param {number} period 周期，默认9
 * @param {number} m1 K值平滑参数，默认3
 * @param {number} m2 D值平滑参数，默认3
 * @returns {Object} { k, d, j }
 */
function calculateKDJ(highPrices, lowPrices, closePrices, period = 9, m1 = 3, m2 = 3) {
  const k = [];
  const d = [];
  const j = [];

  for (let i = 0; i < closePrices.length; i++) {
    if (i < period - 1) {
      k.push(null);
      d.push(null);
      j.push(null);
      continue;
    }

    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      highest = Math.max(highest, highPrices[j]);
      lowest = Math.min(lowest, lowPrices[j]);
    }

    const rsv = lowest === highest ? 50 : ((closePrices[i] - lowest) / (highest - lowest)) * 100;

    if (i === period - 1) {
      k.push(rsv);
      d.push(rsv);
    } else {
      const prevK = k[k.length - 1];
      const prevD = d[d.length - 1];
      const newK = (2 / (m1 + 1)) * rsv + (m1 - 1) / (m1 + 1) * prevK;
      const newD = (2 / (m2 + 1)) * newK + (m2 - 1) / (m2 + 1) * prevD;
      k.push(newK);
      d.push(newD);
    }

    j.push(3 * k[k.length - 1] - 2 * d[d.length - 1]);
  }

  return { k, d, j };
}

/**
 * 计算布林带（Bollinger Bands）
 * @param {Array} closePrices 收盘价数组
 * @param {number} period 周期，默认20
 * @param {number} multiplier 标准差倍数，默认2
 * @returns {Object} { upper, middle, lower }
 */
function calculateBollingerBands(closePrices, period = 20, multiplier = 2) {
  const upper = [];
  const middle = [];
  const lower = [];

  for (let i = 0; i < closePrices.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }

    const slice = closePrices.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    middle.push(avg);

    const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper.push(avg + multiplier * stdDev);
    lower.push(avg - multiplier * stdDev);
  }

  return { upper, middle, lower };
}

/**
 * 计算成交量移动平均
 * @param {Array} volumes 成交量数组
 * @param {number} period 周期，默认5
 * @returns {Array} MA值数组
 */
function calculateVolumeMA(volumes, period = 5) {
  const ma = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < period - 1) {
      ma.push(null);
    } else {
      const slice = volumes.slice(i - period + 1, i + 1);
      ma.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return ma;
}

/**
 * 为K线数据计算所有技术指标
 * @param {Array} klineData K线数据，每个元素包含 { date, open, close, high, low, volume }
 * @returns {Object} 包含所有技术指标的数据
 */
function calculateAllIndicators(klineData) {
  const closePrices = klineData.map(d => d.close);
  const highPrices = klineData.map(d => d.high);
  const lowPrices = klineData.map(d => d.low);
  const volumes = klineData.map(d => d.volume);

  return {
    dates: klineData.map(d => d.date),
    closePrices,
    volume: volumes,
    macd: calculateMACD(closePrices),
    rsi: calculateRSI(closePrices),
    kdj: calculateKDJ(highPrices, lowPrices, closePrices),
    bollinger: calculateBollingerBands(closePrices),
    volumeMa5: calculateVolumeMA(volumes, 5),
    volumeMa10: calculateVolumeMA(volumes, 10),
  };
}

module.exports = {
  calculateMACD,
  calculateRSI,
  calculateKDJ,
  calculateBollingerBands,
  calculateVolumeMA,
  calculateAllIndicators,
};

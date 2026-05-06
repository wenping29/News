const axios = require('axios');
const https = require('https');

function toEastMoneySecId(code, exchange) {
  const c = String(code || '').trim();
  if (!/^\d{6}$/.test(c)) return null;
  const ex = String(exchange || '').trim();
  if (ex === '上交所') return `1.${c}`;
  if (ex === '深交所' || ex === '深交所创业板') return `0.${c}`;
  return null;
}

const EM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://quote.eastmoney.com/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate',
};

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

function isTransientNetErr(msg) {
  const m = String(msg || '').toLowerCase();
  return (
    m.includes('socket hang up') ||
    m.includes('econnreset') ||
    m.includes('timeout') ||
    m.includes('etimedout') ||
    m.includes('network') ||
    m.includes('closed')
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchEastMoneyMonthlyWithRetry(secid, lmt, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
      const { data } = await axios.get(url, {
        params: {
          secid,
          klt: 103,
          fqt: 1,
          lmt,
          fields1: 'f1',
          fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
        },
        timeout: 30000,
        headers: {
          ...EM_HEADERS,
          'Connection': 'keep-alive',
        },
        httpsAgent: ipv4Agent,
        validateStatus: s => s === 200,
      });

      const klines = data?.data?.klines;
      if (!Array.isArray(klines) || klines.length === 0) {
        const err = new Error('暂无 K 线数据（可能已退市、长期停牌或代码与交易所不匹配）');
        err.status = 404;
        throw err;
      }

      const points = [];
      for (const line of klines) {
        const parts = String(line).split(',');
        if (parts.length < 3) continue;
        const date = parts[0];
        const close = parseFloat(parts[2]);
        if (!date || Number.isNaN(close)) continue;
        const t = Math.floor(new Date(`${date}T00:00:00+08:00`).getTime() / 1000);
        points.push({ t, date, close });
      }

      if (points.length === 0) {
        const err = new Error('K 线解析失败');
        err.status = 502;
        throw err;
      }

      return points;
    } catch (e) {
      lastError = e;
      
      if (!isTransientNetErr(e.message) || attempt === maxRetries) {
        break;
      }
      
      console.log(`东方财富API请求失败 (第${attempt}次)，2秒后重试...`, e.message);
      await sleep(2000 * attempt);
    }
  }
  
  throw lastError;
}

/**
 * 东方财富月线收盘价（klt=103）。支持自动重试，最多3次。
 */
async function fetchMonthlyHistory(code, exchange) {
  const secid = toEastMoneySecId(code, exchange);
  if (!secid) {
    const err = new Error('无法匹配交易所与代码，请确认为上交所/深交所 A 股');
    err.status = 400;
    throw err;
  }

  console.log(`正在获取 ${code} (${exchange}) 的月线数据...`);
  
  try {
    const points = await fetchEastMoneyMonthlyWithRetry(secid, 180, 3);
    console.log(`成功获取 ${code} 的 ${points.length} 个月线数据点`);
    
    return {
      symbol: secid,
      interval: '1mo',
      points,
      source: 'eastmoney',
    };
  } catch (e) {
    console.error(`获取 ${code} 月线数据失败:`, e.message);
    const err = new Error(e.message || '获取行情失败，请稍后重试');
    err.status = e.status || 502;
    throw err;
  }
}

/**
 * 东方财富日线收盘价（klt=101）。用于妖股检测。
 */
async function fetchDailyHistory(code, exchange, lmt = 120) {
  const secid = toEastMoneySecId(code, exchange);
  if (!secid) {
    const err = new Error('无法匹配交易所与代码');
    err.status = 400;
    throw err;
  }

  console.log(`正在获取 ${code} (${exchange}) 的日线数据...`);
  
  try {
    const points = await fetchEastMoneyMonthlyWithRetry(secid, lmt, 3);
    console.log(`成功获取 ${code} 的 ${points.length} 个日线数据点`);
    
    return {
      symbol: secid,
      interval: '1d',
      points,
      source: 'eastmoney',
    };
  } catch (e) {
    console.error(`获取 ${code} 日线数据失败:`, e.message);
    const err = new Error(e.message || '获取日线行情失败');
    err.status = e.status || 502;
    throw err;
  }
}

/**
 * 妖股检测：分析短期内的剧烈涨幅
 * @param {string} code 股票代码
 * @param {string} exchange 交易所
 * @param {object} options 检测参数
 * @param {number} options.windowDays 检测窗口天数，默认20
 * @param {number} options.riseThreshold 涨幅阈值%，默认50
 * @returns {object} 检测结果
 */
async function detectLegendaryStock(code, exchange, options = {}) {
  const {
    windowDays = 20,
    riseThreshold = 50,
  } = options;

  const dailyData = await fetchDailyHistory(code, exchange, 120);
  const points = dailyData.points;

  if (points.length < windowDays) {
    return {
      code,
      exchange,
      isLegendary: false,
      reason: '数据点不足',
      points: points.length,
    };
  }

  let maxRise = 0;
  let maxRiseStart = null;
  let maxRiseEnd = null;
  let maxRiseStartPrice = 0;
  let maxRiseEndPrice = 0;

  for (let i = 0; i <= points.length - windowDays; i++) {
    const start = points[i];
    const end = points[i + windowDays - 1];
    
    if (start.close > 0) {
      const risePct = ((end.close - start.close) / start.close) * 100;
      if (risePct > maxRise) {
        maxRise = risePct;
        maxRiseStart = start.date;
        maxRiseEnd = end.date;
        maxRiseStartPrice = start.close;
        maxRiseEndPrice = end.close;
      }
    }
  }

  const isLegendary = maxRise >= riseThreshold;

  return {
    code,
    exchange,
    symbol: dailyData.symbol,
    isLegendary,
    maxRise: Math.round(maxRise * 100) / 100,
    riseThreshold,
    windowDays,
    maxRiseStart,
    maxRiseEnd,
    maxRiseStartPrice: Math.round(maxRiseStartPrice * 100) / 100,
    maxRiseEndPrice: Math.round(maxRiseEndPrice * 100) / 100,
    totalDays: points.length,
    latestPrice: points[points.length - 1]?.close || 0,
    latestDate: points[points.length - 1]?.date || '',
    reason: isLegendary 
      ? `${windowDays}天内最大涨幅${maxRise.toFixed(1)}%，超过阈值${riseThreshold}%`
      : `${windowDays}天内最大涨幅${maxRise.toFixed(1)}%，未达阈值${riseThreshold}%`,
    recentPoints: points.slice(-30),
  };
}

module.exports = { fetchMonthlyHistory, fetchDailyHistory, detectLegendaryStock, toEastMoneySecId };

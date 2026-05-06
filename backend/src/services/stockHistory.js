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

async function fetchEastMoneyMonthlyOnce(secid, lmt, httpsAgent) {
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
    timeout: 25000,
    headers: EM_HEADERS,
    ...(httpsAgent ? { httpsAgent } : {}),
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
}

async function fetchEastMoneyMonthly(secid, lmt = 120) {
  try {
    return await fetchEastMoneyMonthlyOnce(secid, lmt, null);
  } catch (e) {
    if (isTransientNetErr(e.message)) {
      return fetchEastMoneyMonthlyOnce(secid, lmt, ipv4Agent);
    }
    throw e;
  }
}

/**
 * 东方财富月线收盘价（klt=103）。网络异常时会尝试 IPv4；退市或长时间停牌可能无数据。
 */
async function fetchMonthlyHistory(code, exchange) {
  const secid = toEastMoneySecId(code, exchange);
  if (!secid) {
    const err = new Error('无法匹配交易所与代码，请确认为上交所/深交所 A 股');
    err.status = 400;
    throw err;
  }

  let points;
  try {
    points = await fetchEastMoneyMonthly(secid, 180);
  } catch (e1) {
    try {
      points = await fetchEastMoneyMonthly(secid, 60);
    } catch (e2) {
      const err = new Error(e2.message || e1.message || '获取行情失败');
      err.status = e2.status || e1.status || 502;
      throw err;
    }
  }

  return {
    symbol: secid,
    interval: '1mo',
    points,
    source: 'eastmoney',
  };
}

module.exports = { fetchMonthlyHistory, toEastMoneySecId };

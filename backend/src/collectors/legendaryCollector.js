const axios = require('axios');

const https = require('https');

const EM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://quote.eastmoney.com/',
  Accept: 'application/json, text/plain, */*',
};

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, params, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await axios.get(url, {
        params,
        headers: EM_HEADERS,
        timeout: 20000,
        httpsAgent: ipv4Agent,
      });
      return data;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        console.log(`[LegendaryCollector] 请求失败 (第${attempt}次)，${attempt * 2}秒后重试...`, e.message);
        await sleep(2000 * attempt);
      }
    }
  }
  
  throw lastError;
}

/**
 * 获取东方财富涨幅榜数据
 * @param {string} market 市场：sh(上交所)、sz(深交所)
 * @param {number} pageNum 页码
 * @param {number} pageSize 每页数量
 */
async function fetchTopGainers(market, pageNum = 1, pageSize = 50) {
  const url = 'https://push2.eastmoney.com/api/qt/clist/get';
  const params = {
    fid: 'f3',
    po: 1,
    pz: pageSize,
    pn: pageNum,
    np: 1,
    fltt: 2,
    invt: 2,
    fs: market === 'sh' ? 'm:1+t:2,m:1+t:23' : 'm:0+t:6,m:0+t:80,m:0+t:81,m:0+t:82,m:0+t:83,m:0+t:84,m:0+t:85,m:0+t:86,m:0+t:87',
    fields: 'f2,f3,f4,f5,f6,f12,f14,f15,f16,f17,f18',
  };

  const data = await fetchWithRetry(url, params, 3);

  const diff = data?.data?.diff || [];
  return diff.map(item => ({
    code: String(item.f12 || '').padStart(6, '0'),
    name: item.f14 || '',
    price: item.f2 || 0,
    changePct: item.f3 || 0,
    volume: item.f5 || 0,
    turnover: item.f6 || 0,
    amplitude: item.f17 || 0,
    high: item.f15 || 0,
    low: item.f16 || 0,
    open: item.f18 || 0,
    market: market === 'sh' ? '上交所' : '深交所',
  }));
}

/**
 * 获取股票近期日线数据
 */
async function fetchRecentDaily(code, exchange, lmt = 60) {
  const secId = exchange === '上交所' ? `1.${code}` : `0.${code}`;
  const url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
  const params = {
    secid: secId,
    klt: 101,
    fqt: 1,
    lmt,
    fields1: 'f1',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
  };

  try {
    const data = await fetchWithRetry(url, params, 2);
    const klines = data?.data?.klines || [];
    
    return klines.map(line => {
      const parts = String(line).split(',');
      if (parts.length < 7) return null;
      return {
        date: parts[0],
        open: parseFloat(parts[1]) || 0,
        close: parseFloat(parts[2]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        volume: parseFloat(parts[5]) || 0,
        amount: parseFloat(parts[6]) || 0,
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * 分析妖股特征
 */
function analyzeLegendary(dailyData, options = {}) {
  const {
    windowDays = 20,
    riseThreshold = 80,
    consecutiveLimitUp = 3,
    amplitudeThreshold = 7,
  } = options;

  if (dailyData.length < windowDays) {
    return null;
  }

  let maxRise = 0;
  let maxRiseStart = null;
  let maxRiseEnd = null;
  let maxRiseStartPrice = 0;
  let maxRiseEndPrice = 0;
  let consecutiveUps = 0;
  let maxConsecutiveUps = 0;
  let highAmplitudeDays = 0;

  for (let i = 0; i <= dailyData.length - windowDays; i++) {
    const start = dailyData[i];
    const end = dailyData[i + windowDays - 1];
    
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

  for (let i = 1; i < dailyData.length; i++) {
    const prev = dailyData[i - 1];
    const curr = dailyData[i];
    
    if (prev.close > 0) {
      const dailyChange = ((curr.close - prev.close) / prev.close) * 100;
      
      if (dailyChange >= 9.8) {
        consecutiveUps++;
        maxConsecutiveUps = Math.max(maxConsecutiveUps, consecutiveUps);
      } else {
        consecutiveUps = 0;
      }
      
      if (curr.high > 0 && curr.low > 0) {
        const amplitude = ((curr.high - curr.low) / curr.low) * 100;
        if (amplitude >= amplitudeThreshold) {
          highAmplitudeDays++;
        }
      }
    }
  }

  const peakPrice = Math.max(...dailyData.map(d => d.high));
  const lowPrice = Math.min(...dailyData.map(d => d.low));
  const peakDate = dailyData.find(d => d.high === peakPrice)?.date || '';
  const lowDate = dailyData.find(d => d.low === lowPrice)?.date || '';
  const peakRisePct = lowPrice > 0 ? ((peakPrice - lowPrice) / lowPrice) * 100 : 0;

  const score = (
    (maxRise >= riseThreshold ? 40 : 0) +
    (maxConsecutiveUps >= consecutiveLimitUp ? 30 : 0) +
    (highAmplitudeDays >= 5 ? 20 : 0) +
    (peakRisePct >= 100 ? 10 : 0)
  );

  return {
    maxRise: Math.round(maxRise * 100) / 100,
    maxRiseStart,
    maxRiseEnd,
    maxRiseStartPrice: Math.round(maxRiseStartPrice * 100) / 100,
    maxRiseEndPrice: Math.round(maxRiseEndPrice * 100) / 100,
    maxConsecutiveUps,
    highAmplitudeDays,
    peakPrice: Math.round(peakPrice * 100) / 100,
    peakDate,
    lowPrice: Math.round(lowPrice * 100) / 100,
    lowDate,
    peakRisePct: Math.round(peakRisePct * 100) / 100,
    score,
    isLegendary: score >= 70 || maxRise >= riseThreshold || maxConsecutiveUps >= consecutiveLimitUp,
  };
}

function buildStory(stock, analysis) {
  const stories = [];
  
  if (analysis.maxConsecutiveUps >= 5) {
    stories.push(`${analysis.maxConsecutiveUps}连板，极端投机情绪驱动`);
  } else if (analysis.maxConsecutiveUps >= 3) {
    stories.push(`短期连续涨停${analysis.maxConsecutiveUps}次，资金炒作明显`);
  }
  
  if (analysis.maxRise >= 200) {
    stories.push(`${20}个交易日内暴涨${analysis.maxRise.toFixed(0)}%，涨幅惊人`);
  } else if (analysis.maxRise >= 100) {
    stories.push(`${20}个交易日内涨幅${analysis.maxRise.toFixed(0)}%，走势强劲`);
  }
  
  if (analysis.highAmplitudeDays >= 10) {
    stories.push(`高振幅交易日达${analysis.highAmplitudeDays}天，波动剧烈`);
  }
  
  if (analysis.peakRisePct >= 150) {
    stories.push(`区间内最高涨幅达${analysis.peakRisePct.toFixed(0)}%`);
  }
  
  return stories.length > 0 ? stories.join('；') : '短期涨幅异常，波动特征明显';
}

/**
 * 采集妖股数据 - 基于东方财富涨幅榜
 * 如果东方财富无法访问，返回空数组
 */
async function collectLegendaryStocks(options = {}) {
  const {
    riseThreshold = 80,
    windowDays = 20,
    maxStocks = 30,
    onProgress = null,
  } = options;

  console.log('[LegendaryCollector] 开始采集妖股数据...');
  
  const results = [];
  const markets = ['sh', 'sz'];
  
  for (const market of markets) {
    console.log(`[LegendaryCollector] 正在获取${market === 'sh' ? '上交所' : '深交所'}涨幅榜...`);
    
    try {
      const gainers = await fetchTopGainers(market, 1, 100);
      
      if (!gainers || gainers.length === 0) {
        console.log(`[LegendaryCollector] ${market === 'sh' ? '上交所' : '深交所'}涨幅榜数据为空，跳过`);
        continue;
      }
      
      console.log(`[LegendaryCollector] 获取到 ${gainers.length} 只股票，开始分析...`);
      
      let analyzedCount = 0;
      
      for (let i = 0; i < gainers.length && results.length < maxStocks; i++) {
        const stock = gainers[i];
        
        if (onProgress) {
          onProgress(stock.name, stock.code, i + 1, gainers.length);
        }
        
        // 只分析涨幅>5%的股票
        if (stock.changePct < 5) {
          continue;
        }
        
        // 限制请求频率
        await sleep(500);
        
        const dailyData = await fetchRecentDaily(stock.code, stock.market, 60);
        
        if (dailyData.length < windowDays) {
          continue;
        }
        
        analyzedCount++;
        
        const analysis = analyzeLegendary(dailyData, {
          windowDays,
          riseThreshold,
          consecutiveLimitUp: 3,
          amplitudeThreshold: 7,
        });
        
        if (analysis && analysis.isLegendary) {
          const story = buildStory(stock, analysis);
          
          results.push({
            name: stock.name,
            code: stock.code,
            exchange: stock.market,
            period: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`,
            rise_note: `${windowDays}日涨幅${analysis.maxRise.toFixed(0)}%`,
            theme: '短期异动',
            story,
            outcome: '待观察',
            peak_price: analysis.peakPrice,
            peak_date: analysis.peakDate,
            low_price: analysis.lowPrice,
            low_date: analysis.lowDate,
            peak_rise_pct: analysis.peakRisePct,
            sort_order: 1000 - results.length,
            events: buildEvents(stock, analysis, dailyData),
          });
          
          console.log(`[LegendaryCollector] 发现疑似妖股: ${stock.name} (${stock.code}) - 涨幅${analysis.maxRise.toFixed(0)}%, 得分${analysis.score}`);
        }
        
        // 每分析10只股票休息1秒
        if (analyzedCount % 10 === 0) {
          await sleep(1000);
        }
      }
      
      console.log(`[LegendaryCollector] ${market === 'sh' ? '上交所' : '深交所'}分析完成，发现 ${results.length} 只疑似妖股`);
    } catch (e) {
      console.error(`[LegendaryCollector] 获取${market}涨幅榜失败:`, e.message);
      console.log('[LegendaryCollector] 提示：可能是网络问题或东方财富API不可用，请检查网络连接后重试');
    }
  }
  
  console.log(`[LegendaryCollector] 采集完成，共发现 ${results.length} 只疑似妖股`);
  return results;
}

function buildEvents(stock, analysis, dailyData) {
  const events = [];
  
  const lowDay = dailyData.find(d => d.low === analysis.lowPrice);
  if (lowDay) {
    events.push({
      event_date: lowDay.date,
      price: analysis.lowPrice,
      change_pct: 0,
      event_type: 'start',
      description: `行情启动，股价处于低位${analysis.lowPrice}元`,
    });
  }
  
  for (let i = 1; i < dailyData.length; i++) {
    const prev = dailyData[i - 1];
    const curr = dailyData[i];
    
    if (prev.close > 0) {
      const dailyChange = ((curr.close - prev.close) / prev.close) * 100;
      
      if (dailyChange >= 9.8) {
        events.push({
          event_date: curr.date,
          price: curr.close,
          change_pct: Math.round(dailyChange * 100) / 100,
          event_type: 'surge',
          description: `涨停板，收盘价${curr.close.toFixed(2)}元，涨幅${dailyChange.toFixed(1)}%`,
        });
      }
    }
  }
  
  const peakDay = dailyData.find(d => d.high === analysis.peakPrice);
  if (peakDay) {
    events.push({
      event_date: peakDay.date,
      price: analysis.peakPrice,
      change_pct: analysis.maxRise,
      event_type: 'peak',
      description: `创出阶段高点${analysis.peakPrice.toFixed(2)}元，较启动点上涨${analysis.maxRise.toFixed(0)}%`,
    });
  }
  
  return events.sort((a, b) => a.event_date.localeCompare(b.event_date));
}

module.exports = { collectLegendaryStocks, fetchTopGainers, analyzeLegendary };

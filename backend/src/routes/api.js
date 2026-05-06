const express = require('express');
const router = express.Router();
const {
  queryPolicies,
  getStats,
  queryToolOperations,
  insertToolOperation,
  queryLegendaryStocks,
} = require('../database');
const { collectAll } = require('../collectors/scheduler');
const { fetchMonthlyHistory } = require('../services/stockHistory');

// 分页查询
router.get('/policies', (req, res) => {
  const { country, source, category, q, page, limit } = req.query;
  const result = queryPolicies({
    country,
    source,
    category,
    q,
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 20, 100),
  });
  res.json(result);
});

// 统计信息
router.get('/stats', (req, res) => {
  const stats = getStats();
  res.json(stats);
});

// 手动触发采集（支持 month 参数：YYYY-MM）
router.post('/collect', async (req, res) => {
  const { month } = req.body || {};
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '月份格式错误，应为 YYYY-MM' });
  }
  res.json({ message: month ? `正在采集 ${month} 的数据...` : '采集已触发，正在后台执行' });
  try {
    const result = await collectAll(month ? { month } : {});
    console.log(`手动采集完成: ${result.collected} 条，新增 ${result.inserted} 条`);
  } catch (err) {
    console.error('手动采集失败:', err.message);
  }
});

// 货币政策工具操作查询
router.get('/tools/operations/:toolId', (req, res) => {
  const { toolId } = req.params;
  const ops = queryToolOperations(toolId);
  res.json({ toolId, operations: ops });
});

// 货币政策工具操作录入（供后续手动维护数据）
router.post('/tools/operations', (req, res) => {
  try {
    insertToolOperation(req.body);
    res.json({ message: '操作记录已保存' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 历史上的妖股（本地种子 + 可检索）
router.get('/legendary-stocks', (req, res) => {
  const { q, exchange } = req.query;
  const result = queryLegendaryStocks({ q: q || '', exchange: exchange || '' });
  res.json(result);
});

// A 股历史月线收盘（Yahoo 代理，仅供展示）
router.get('/stocks/:code/history', async (req, res) => {
  const { code } = req.params;
  const { exchange } = req.query;
  try {
    const payload = await fetchMonthlyHistory(code, exchange);
    res.json(payload);
  } catch (err) {
    const status = err.status || 502;
    res.status(status).json({ error: err.message || '获取行情失败' });
  }
});

// 数据源列表
router.get('/sources', (req, res) => {
  const { rssSources: cnRSS, scraperSources: cnScraper } = require('../collectors/sources-cn');
  const { rssSources: usRSS, scraperSources: usScraper } = require('../collectors/sources-us');

  const sources = [
    ...cnRSS.map(s => ({ ...s, method: 'rss' })),
    ...cnScraper.map(s => ({ name: s.name, source: s.source, country: s.country, method: 'scraper' })),
    ...usRSS.map(s => ({ ...s, method: 'rss' })),
    ...usScraper.map(s => ({ name: s.name, source: s.source, country: s.country, method: 'scraper' })),
  ];
  res.json(sources);
});

module.exports = router;

const cron = require('node-cron');
const { fetchRSS } = require('./rss');
const { scrapePage } = require('./scraper');
const { batchInsert } = require('../database');
const { collectToolOps } = require('./toolCollector');

const { rssSources: cnRSS, scraperSources: cnScraper } = require('./sources-cn');
const { rssSources: usRSS, scraperSources: usScraper } = require('./sources-us');

async function collectAll(options = {}) {
  const { month } = options;
  console.log(`\n[${new Date().toLocaleString()}] 开始采集数据...${month ? ` (月份: ${month})` : ''}`);

  const allRSS = [...cnRSS, ...usRSS];
  const allScraper = [...cnScraper, ...usScraper];

  // 并行抓取所有 RSS
  const rssResults = await Promise.all(allRSS.map(feed => fetchRSS(feed, { month })));
  const rssItems = rssResults.flat();

  // 并行抓取所有网页
  const scraperResults = await Promise.all(allScraper.map(site => scrapePage(site, { month })));
  const scraperItems = scraperResults.flat();

  const allItems = [...rssItems, ...scraperItems];
  console.log(`  共抓取 ${allItems.length} 条记录`);

  let inserted = 0;
  if (allItems.length > 0) {
    inserted = batchInsert(allItems);
    console.log(`  新增 ${inserted} 条记录，跳过 ${allItems.length - inserted} 条重复`);
  }

  // 采集货币政策工具操作数据
  const toolResult = await collectToolOps(options);

  console.log(`[${new Date().toLocaleString()}] 采集完成 (新闻 ${inserted} 条 + 工具 ${toolResult.parsed} 条)\n`);
  return { collected: allItems.length, inserted, toolParsed: toolResult.parsed };
}

function startScheduler(cronExpression = '0 */6 * * *') {
  console.log(`定时采集已启动 (cron: ${cronExpression})`);
  // 启动时立即执行一次
  collectAll();
  // 定时执行
  cron.schedule(cronExpression, () => collectAll());
}

module.exports = { collectAll, startScheduler };

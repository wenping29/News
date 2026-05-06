const RssParser = require('rss-parser');
const parser = new RssParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

async function fetchRSS(feed, options = {}) {
  const { month } = options;
  const { url, source, country, category } = feed;
  try {
    const feedData = await parser.parseURL(url);
    return feedData.items
      .map(item => ({
        title: item.title?.trim() || '',
        summary: (item.contentSnippet || item.summary || '').trim().slice(0, 500),
        url: item.link || '',
        publishDate: item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : item.isoDate?.slice(0, 10) || '',
        source,
        country,
        category,
      }))
      .filter(item => {
        // 如果指定了月份，只保留该月份的记录
        if (month && item.publishDate) {
          return item.publishDate.startsWith(month);
        }
        return true;
      });
  } catch (err) {
    console.error(`[RSS] 获取失败 ${source}: ${err.message}`);
    return [];
  }
}

module.exports = { fetchRSS };

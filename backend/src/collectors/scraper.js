const axios = require('axios');
const cheerio = require('cheerio');

const client = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'zh-CN,en-US;q=0.9,en;q=0.8,zh;q=0.7',
  },
});

// 跳过噪声链接的关键词
const SKIP_TITLES = [
  'english', '网站地图', '无障碍', '首页', '联系我们',
  '关于我们', '术语表', '返回首页', '设为首页', '收藏本站',
  'home', 'contact', 'about', 'sitemap', 'search',
];

const SKIP_URLS = [
  'english', 'en/', '/en/', 'sitemap', 'javascript', 'mailto:',
];

function isValidLink(title, href) {
  if (!title || title.length < 8) return false;
  if (!href) return false;

  const lowerTitle = title.toLowerCase();
  const lowerHref = (href || '').toLowerCase();

  for (const skip of SKIP_TITLES) {
    if (lowerTitle.includes(skip)) return false;
  }
  for (const skip of SKIP_URLS) {
    if (lowerHref.includes(skip)) return false;
  }
  return true;
}

function extractDate(text) {
  // 1. 标准日期格式: YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日
  let m = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  // 2. URL中的连续日期数字: 20260430 -> 2026-04-30 (PBOC URL)
  m = text.match(/(\d{4})(\d{2})(\d{2})\d{4,}/);
  if (m && parseInt(m[2]) <= 12 && parseInt(m[3]) <= 31) {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  // 3. 文件名中的 tYYYYMMDD 格式 (发改委: t20260427)
  m = text.match(/t(\d{4})(\d{2})(\d{2})/);
  if (m && parseInt(m[2]) <= 12 && parseInt(m[3]) <= 31) {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  // 4. URL 路径中的 YYYYMM 格式 (国务院: /202604/content_)
  m = text.match(/\/(\d{4})(\d{2})\/content_/);
  if (m && parseInt(m[2]) <= 12) {
    return `${m[1]}-${m[2]}-01`;
  }
  return '';
}

async function scrapePage({ url, source, country, category, linkFilter }, options = {}) {
  const { month } = options;
  try {
    // 如果指定了月份，尝试访问该月份的归档页面
    let targetUrl = url;
    if (month) {
      // 国务院政策归档: /zhengce/ → /zhengce/202604/
      if (url.includes('gov.cn/zhengce/') && !url.includes('content_')) {
        const ym = month.replace('-', '');
        targetUrl = url.replace(/\/$/, '') + '/' + ym + '/';
      }
      // 统计局: /sj/zxfb/ → /sj/zxfb/202604/
      if (url.includes('stats.gov.cn/sj/')) {
        const ym = month.replace('-', '');
        targetUrl = url.replace(/\/$/, '') + '/' + ym + '/';
      }
    }

    const { data } = await client.get(targetUrl);
    const $ = cheerio.load(data);
    const results = [];

    // 查找所有 <a> 标签中文本较长且链接匹配特定模式的
    $('a').each((i, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      let href = $el.attr('href') || '';

      if (!isValidLink(title, href)) return;

      // 如果配置了 linkFilter，只保留匹配的链接
      if (linkFilter && !linkFilter.test(href)) return;

      // 补全相对URL
      if (!href.startsWith('http')) {
        if (href.startsWith('//')) {
          href = 'https:' + href;
        } else if (href.startsWith('/')) {
          const u = new URL(targetUrl);
          href = u.origin + href;
        } else {
          href = targetUrl.replace(/\/$/, '') + '/' + href;
        }
      }

      // 去重 - 同一个链接只保留第一次
      if (results.find(r => r.url === href)) return;

      const publishDate = extractDate(title + ' ' + href);

      // 如果指定了月份，只保留该月份的记录
      if (month && publishDate && !publishDate.startsWith(month)) return;

      results.push({
        title,
        summary: '',
        url: href,
        publishDate,
        source,
        country,
        category,
      });
    });

    // 限制最多 30 条
    return results.slice(0, 30);
  } catch (err) {
    console.error(`[Scraper] ${source}: ${err.message}`);
    return [];
  }
}

module.exports = { scrapePage };

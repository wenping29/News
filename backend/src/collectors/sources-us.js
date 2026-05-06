// 美国数据源配置 - 已验证可用的数据源
// US data source configuration - verified working sources

const rssSources = [
  {
    name: '美联储新闻稿',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    source: 'Federal Reserve',
    country: 'us',
    category: 'monetary',
  },
  {
    name: '美国证交会新闻稿',
    url: 'https://www.sec.gov/news/pressreleases.rss',
    source: 'SEC',
    country: 'us',
    category: 'finance',
  },
];

const scraperSources = [
  {
    name: '美国财政部新闻稿',
    url: 'https://home.treasury.gov/news/press-releases',
    source: 'US Treasury',
    country: 'us',
    category: 'fiscal',
    linkFilter: /\/news\/press-releases\//,
  },
  {
    name: 'CFTC新闻稿',
    url: 'https://www.cftc.gov/PressRoom/PressReleases/index.htm',
    source: 'CFTC',
    country: 'us',
    category: 'finance',
    linkFilter: /PressRoom\/PressReleases\/\d+/,
  },
  {
    name: '纽约联储新闻',
    url: 'https://www.newyorkfed.org/newsevents/news',
    source: 'NY Fed',
    country: 'us',
    category: 'monetary',
    linkFilter: /\/newsevents\/news\/markets/,
  },
];

module.exports = { rssSources, scraperSources };

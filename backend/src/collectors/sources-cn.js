// 中国数据源配置 - 已验证可用的数据源

const scraperSources = [
  {
    name: '人民银行-新闻发布',
    url: 'http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html',
    source: '人民银行',
    country: 'cn',
    category: 'monetary',
    linkFilter: /\/113469\/\d+\//,
  },
  {
    name: '人民银行-货币政策',
    url: 'http://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125431/index.html',
    source: '人民银行',
    country: 'cn',
    category: 'monetary',
    linkFilter: /\/125431\/\d+\/\d{10,}/,
  },
  {
    name: '人民银行-公开市场操作',
    url: 'http://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125443/index.html',
    source: '人民银行',
    country: 'cn',
    category: 'monetary',
    linkFilter: /\/125443\/\d+\/\d{10,}/,
  },
  {
    name: '国务院-政策文件',
    url: 'https://www.gov.cn/zhengce/',
    source: '国务院',
    country: 'cn',
    category: 'policy',
    linkFilter: /\/content_/,
  },
  {
    name: '发改委-新闻发布',
    url: 'https://www.ndrc.gov.cn/xwdt/xwfb/',
    source: '发改委',
    country: 'cn',
    category: 'policy',
    linkFilter: /\/t\d{8}_\d+\.html/,
  },
  {
    name: '财政部-政策发布',
    url: 'https://www.mof.gov.cn/zhengwuxinxi/zhengcefabu/',
    source: '财政部',
    country: 'cn',
    category: 'fiscal',
    linkFilter: /\/t\d{8}_\d+\.htm/,
  },
  {
    name: '证监会-新闻发布',
    url: 'http://www.csrc.gov.cn/csrc/c100028/common_list.shtml',
    source: '证监会',
    country: 'cn',
    category: 'finance',
    linkFilter: /\/c100028\/content_/,
  },
  {
    name: '国家统计局-最新发布',
    url: 'https://www.stats.gov.cn/sj/zxfb/',
    source: '统计局',
    country: 'cn',
    category: 'fiscal',
    linkFilter: /\/t\d{8}_\d+\.html/,
  },
  {
    name: '外汇管理局-新闻',
    url: 'https://www.safe.gov.cn/safe/xwfb/index.html',
    source: '外汇管理局',
    country: 'cn',
    category: 'finance',
    linkFilter: /\/safe.*\/\d{4}\/\d+\.html/,
  },
];

const rssSources = [];

module.exports = { rssSources, scraperSources };

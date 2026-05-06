const axios = require('axios');
const cheerio = require('cheerio');
const { insertToolOperation } = require('../database');

const PBOC_BASE = 'http://www.pbc.gov.cn';
const PBOC_PATH = '/zhengcehuobisi/125207/125213';

const client = axios.create({
  timeout: 25000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'zh-CN,en;q=0.9',
  },
});

// PBOC 工具列表页配置
const TOOL_SOURCES = [
  {
    tool_id: 'reverse-repo',
    listUrl: `${PBOC_BASE}${PBOC_PATH}/125431/125475/index.html`,
    // URL 中的时间戳: /125475/2026050608574214744/index.html
    linkPattern: /\/125475\/(\d{8,})\/index\.html/,
    parser: 'reverseRepoText',
  },
  {
    tool_id: 'lpr',
    listUrl: `${PBOC_BASE}${PBOC_PATH}/125440/3876551/index.html`,
    linkPattern: /\/3876551\/(\d{8,})\/index\.html/,
    parser: 'lprText',
  },
  {
    tool_id: 'mlf',
    listUrl: `${PBOC_BASE}${PBOC_PATH}/125437/125446/125873/index.html`,
    linkPattern: /\/125873\/(\d{8,})\/index\.html/,
    parser: 'mlfText',
  },
  {
    tool_id: 'mlf',
    listUrl: `${PBOC_BASE}${PBOC_PATH}/125437/125446/125876/index.html`,
    linkPattern: /\/125876\/(\d{8,})\/index\.html/,
    parser: 'mlfTable',
  },
  {
    tool_id: 'slf',
    listUrl: `${PBOC_BASE}${PBOC_PATH}/125437/125443/125860/index.html`,
    linkPattern: /\/125860\/(\d{8,})\/index\.html/,
    parser: 'slfTable',
  },
  {
    tool_id: 'psl',
    listUrl: `${PBOC_BASE}${PBOC_PATH}/125437/2161446/2161457/index.html`,
    linkPattern: /\/2161457\/(\d{8,})\/index\.html/,
    parser: 'pslText',
  },
];

// ========== 工具函数 ==========

function extractDateFromText(text) {
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  // 尝试 "2026年5月" (无日)
  const m2 = text.match(/(\d{4})年(\d{1,2})月/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-01`;
  }
  return '';
}

function extractDateFromURL(url) {
  const m = url.match(/\/(\d{4})(\d{2})(\d{2})\d{4,}\//);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

// 规范化利率值
function parseRate(text) {
  // 去掉 %
  const cleaned = text.replace(/%/g, '').trim();
  return parseFloat(cleaned) || 0;
}

// ========== 文本解析器 ==========

function parseReverseRepoText($) {
  const text = $.text();
  const results = [];

  // 提取日期
  const date = extractDateFromText(text);

  // 匹配逆回购模式: "开展了X亿元逆回购操作，期限X天，中标利率X.XX%"
  // PBOC 可能一天发多笔（不同期限）
  const patterns = [
    // 模式1: 标准公告
    /(\d+)\s*亿元.*?逆回购.*?(?:期限|为期)?\s*(\d+)\s*天.*?利率\s*([\d.]+)%/g,
    // 模式2: 利率招标方式开展了X亿元
    /开展了\s*(\d+)\s*亿元.*?(\d+)\s*天.*?逆回购.*?利率\s*([\d.]+)%/g,
    // 模式3: 简洁版
    /(\d+)\s*亿元.*?(\d+)\s*天.*?([\d.]+)%/g,
  ];

  for (const pattern of patterns) {
    let match;
    const textCopy = text.slice(); // 避免 lastIndex 冲突
    while ((match = pattern.exec(textCopy)) !== null) {
      const amount = parseInt(match[1]);
      const term = parseInt(match[2]);
      const rate = parseFloat(match[3]);
      if (amount > 0 && term > 0 && rate > 0) {
        // 去重同一笔
        if (!results.find(r => r.amount === amount && r.term === term)) {
          results.push({ amount, term, rate });
        }
      }
    }
  }

  if (results.length === 0) {
    // 尝试更宽松的匹配：只要有金额、利率、期限
    const mAmt = text.match(/(\d+)\s*亿元/);
    const mTerm = text.match(/(\d+)\s*天/);
    const mRate = text.match(/([\d.]+)%/);
    if (mAmt && mTerm && mRate) {
      results.push({
        amount: parseInt(mAmt[1]),
        term: parseInt(mTerm[1]),
        rate: parseFloat(mRate[1]),
      });
    }
  }

  return results.map(r => ({
    tool_id: 'reverse-repo',
    op_type: 'fund',
    op_date: date,
    amount: r.amount,
    rate: r.rate,
    term: r.term,
    term_label: r.term === 7 ? '7天' : r.term === 14 ? '14天' : r.term === 28 ? '28天' : `${r.term}天`,
    maturity_date: date ? addDays(date, r.term) : '',
    direction: 'release',
  }));
}

function parseMLFText($) {
  const text = $.text();
  const date = extractDateFromText(text);
  const results = [];

  // MLF 公告: "开展了X亿元中期借贷便利（MLF）操作，期限1年，中标利率X.XX%"
  // 或 "开展了X亿元MLF操作"
  const mAmt = text.match(/(\d+)\s*亿元.*?(?:中期借贷便利|MLF)/);
  const mTerm = text.match(/(?:期限|为期)?\s*(\d+)\s*(?:年|个月)/);
  const mRate = text.match(/(?:中标利率|利率)\s*([\d.]+)%/);

  if (mAmt) {
    const termMonths = mTerm ? parseInt(mTerm[1]) : 12;
    const termDays = termMonths >= 12 ? termMonths / 12 * 365 : termMonths * 30;
    const termLabel = termMonths >= 12 ? `${termMonths / 12}年` : `${termMonths}个月`;

    results.push({
      tool_id: 'mlf',
      op_type: 'fund',
      op_date: date,
      amount: parseInt(mAmt[1]),
      rate: mRate ? parseFloat(mRate[1]) : 0,
      term: termDays,
      term_label: termLabel,
      maturity_date: date ? addDays(date, termDays) : '',
      direction: 'release',
    });
  }

  return results;
}

function parseLPRText($) {
  const text = $.text();
  const date = extractDateFromText(text);

  const m1y = text.match(/1年期LPR.*?([\d.]+)%/);
  const m5y = text.match(/5年期以上LPR.*?([\d.]+)%/);

  if (!m1y && !m5y) return [];

  return [{
    tool_id: 'lpr',
    op_type: 'rate',
    op_date: date,
    amount: 0,
    rate: 0,
    rate1y: m1y ? parseFloat(m1y[1]) : 0,
    rate5y: m5y ? parseFloat(m5y[1]) : 0,
    term: 0,
    term_label: '',
    maturity_date: '',
    direction: 'release',
  }];
}

function parsePSLText($) {
  const text = $.text();
  const date = extractDateFromText(text);

  const mAmt = text.match(/抵押补充贷款.*?(\d+)\s*亿元/);
  const mRate = text.match(/利率[^\d]*([\d.]+)%/);

  if (!mAmt && !text.includes('抵押补充贷款')) return [];

  return [{
    tool_id: 'psl',
    op_type: 'fund',
    op_date: date,
    amount: mAmt ? parseInt(mAmt[1]) : 0,
    rate: mRate ? parseFloat(mRate[1]) : 0,
    term: 1825, // PSL 通常3-5年，默认标记为5年
    term_label: '3-5年',
    maturity_date: date ? addDays(date, 1825) : '',
    direction: 'release',
  }];
}

// ========== HTML表格解析器 ==========

function parseMLFTable($) {
  const results = [];
  // 查找操作表表格
  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    rows.each((i, row) => {
      const cells = $(row).find('td, th');
      if (cells.length < 4) return; // 跳过表头
      const texts = cells.map((_, c) => $(c).text().trim()).get();
      // 预期列: 日期 | 投放金额 | 回笼金额 | 利率 | 期限
      const dateStr = texts[0] || '';
      const date = extractDateFromText(dateStr) || dateStr;
      const releaseAmt = parseFloat(texts[1]) || 0;
      const matureAmt = parseFloat(texts[2]) || 0;
      const rate = parseRate(texts[3] || '');
      const termText = texts[4] || '1年';

      if (!date) return;

      if (releaseAmt > 0) {
        results.push({
          tool_id: 'mlf', op_type: 'fund', op_date: date,
          amount: releaseAmt, rate, term: 365, term_label: termText,
          maturity_date: addDays(date, 365), direction: 'release',
        });
      }
      if (matureAmt > 0) {
        results.push({
          tool_id: 'mlf', op_type: 'fund', op_date: date,
          amount: matureAmt, rate: 0, term: 0, term_label: '',
          maturity_date: date, direction: 'mature',
        });
      }
    });
  });
  return results;
}

function parseSLFTable($) {
  const results = [];
  // SLF 操作表：通常按季度汇总
  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    rows.each((i, row) => {
      const cells = $(row).find('td, th');
      if (cells.length < 4) return;
      const texts = cells.map((_, c) => $(c).text().trim()).get();
      // 预期列: 日期/季度 | 操作金额 | 利率 | 期限品种
      const dateStr = texts[0] || '';
      const date = extractDateFromText(dateStr) || dateStr;
      const amount = parseFloat(texts[1]) || 0;
      const rate = parseRate(texts[2] || '');
      const termText = texts[3] || '';

      if (!date || amount <= 0) return;

      const termDays = termText.includes('月') ? 30
        : termText.includes('7天') ? 7
        : termText.includes('隔夜') ? 1
        : termText.includes('14天') ? 14
        : 7;

      results.push({
        tool_id: 'slf', op_type: 'fund', op_date: date,
        amount, rate, term: termDays, term_label: termText,
        maturity_date: addDays(date, termDays), direction: 'release',
      });
    });
  });
  return results;
}

// ========== 日期计算 ==========

function addDays(dateStr, days) {
  if (!dateStr || !days) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

// ========== 主采集函数 ==========

async function fetchPage(url) {
  try {
    const { data } = await client.get(url);
    return cheerio.load(data);
  } catch (err) {
    console.error(`  [ToolCollector] 页面获取失败 ${url}: ${err.message}`);
    return null;
  }
}

async function collectToolOps(options = {}) {
  const { month } = options;
  const monthPrefix = month ? month.replace('-', '') : null;

  console.log(`\n[ToolCollector] 开始采集货币政策工具数据...${month ? ` (月份: ${month})` : ''}`);

  let totalParsed = 0;
  let totalInserted = 0;

  for (const source of TOOL_SOURCES) {
    console.log(`  采集 ${source.tool_id} ...`);
    const $ = await fetchPage(source.listUrl);
    if (!$) continue;

    // 提取所有公告链接
    const links = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(source.linkPattern);
      if (match) {
        const timestamp = match[1]; // YYYYMMDD...
        // 按月过滤
        if (monthPrefix && !timestamp.startsWith(monthPrefix)) return;
        // 补全 URL
        const fullUrl = href.startsWith('http') ? href
          : href.startsWith('/') ? `${PBOC_BASE}${href}`
          : `${source.listUrl.replace(/\/$/, '')}/${href}`;
        // 去重同列表页
        if (!links.find(l => l.url === fullUrl)) {
          links.push({ url: fullUrl, timestamp });
        }
      }
    });

    if (links.length === 0) {
      console.log(`    ${source.tool_id} 无新公告`);
      continue;
    }

    console.log(`    找到 ${links.length} 条公告链接`);

    // 并发抓取详情页（限制并发数 5）
    const CONCURRENCY = 5;
    let parsed = 0;
    for (let i = 0; i < links.length; i += CONCURRENCY) {
      const batch = links.slice(i, i + CONCURRENCY);
      const pages = await Promise.all(batch.map(l => fetchPage(l.url)));

      for (let j = 0; j < pages.length; j++) {
        const page = pages[j];
        if (!page) continue;

        let ops = [];
        switch (source.parser) {
          case 'reverseRepoText': ops = parseReverseRepoText(page); break;
          case 'mlfText': ops = parseMLFText(page); break;
          case 'mlfTable': ops = parseMLFTable(page); break;
          case 'slfTable': ops = parseSLFTable(page); break;
          case 'lprText': ops = parseLPRText(page); break;
          case 'pslText': ops = parsePSLText(page); break;
        }

        // 补充从URL提取的日期
        const urlDate = extractDateFromURL(links[i + j].url);
        for (const op of ops) {
          if (!op.op_date && urlDate) op.op_date = urlDate;
          if (!op.maturity_date && op.op_date && op.term) {
            op.maturity_date = addDays(op.op_date, op.term);
          }
        }

        // 插入数据库
        for (const op of ops) {
          try {
            insertToolOperation(op);
            parsed++;
          } catch (e) {
            // 重复键或无效数据
          }
        }
      }
    }

    console.log(`    ${source.tool_id} 解析 ${parsed} 条`);
    totalParsed += parsed;
  }

  console.log(`[ToolCollector] 采集完成: 解析 ${totalParsed} 条\n`);
  return { parsed: totalParsed };
}

module.exports = { collectToolOps };

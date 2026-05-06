// 数据源英文名 → 中文显示名
export const SOURCE_DISPLAY_MAP = {
  '人民银行': '人民银行 (PBOC)',
  '国务院': '国务院 (State Council)',
  '发改委': '发改委 (NDRC)',
  'Federal Reserve': '美联储 (Federal Reserve)',
  'SEC': '美国证交会 (SEC)',
  'US Treasury': '美国财政部 (US Treasury)',
};

// 国家代码 → 中文名
export const COUNTRY_MAP = { cn: '中国', us: '美国' };

// 类别 → 中文名
export const CATEGORY_MAP = {
  finance: '金融类',
  policy: '政策类',
  fiscal: '财政类',
  monetary: '货币类',
};

// 获取数据源显示名称
export function getSourceDisplay(source) {
  return SOURCE_DISPLAY_MAP[source] || source;
}

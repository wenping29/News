import { useState, useEffect } from 'react';
import { fetchSources } from '../services/api';
import { getSourceDisplay } from '../constants';

export default function FilterBar({ filters, onChange, onPageReset }) {
  const [sources, setSources] = useState([]);

  useEffect(() => {
    fetchSources().then(data => {
      const unique = [];
      const seen = new Set();
      for (const s of data) {
        if (!seen.has(s.source)) {
          seen.add(s.source);
          unique.push(s);
        }
      }
      setSources(unique);
    }).catch(() => {});
  }, []);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
    onPageReset();
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>国家</label>
        <select value={filters.country} onChange={e => handleChange('country', e.target.value)}>
          <option value="">全部</option>
          <option value="cn">中国</option>
          <option value="us">美国</option>
        </select>
      </div>
      <div className="filter-group">
        <label>来源</label>
        <select value={filters.source} onChange={e => handleChange('source', e.target.value)}>
          <option value="">全部</option>
          {sources.map(s => (
            <option key={s.source} value={s.source}>{getSourceDisplay(s.source)}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>类别</label>
        <select value={filters.category} onChange={e => handleChange('category', e.target.value)}>
          <option value="">全部</option>
          <option value="finance">金融类</option>
          <option value="policy">政策类</option>
          <option value="fiscal">财政类</option>
          <option value="monetary">货币类</option>
        </select>
      </div>
      <div className="filter-group search-group">
        <label>搜索</label>
        <input
          type="text"
          placeholder="关键词搜索..."
          value={filters.q}
          onChange={e => handleChange('q', e.target.value)}
        />
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import FilterBar from './components/FilterBar';
import PolicyCard from './components/PolicyCard';
import Timeline from './components/Timeline';
import LiquidityTools from './components/LiquidityTools';
import LegendaryStocks from './components/LegendaryStocks';
import DataManager from './components/DataManager';
import { fetchPolicies, fetchStats, triggerCollect } from './services/api';

export default function App() {
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({ country: '', source: '', category: '', q: '' });
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [policyData, statsData] = await Promise.all([
        fetchPolicies({ ...filters, page }),
        fetchStats(),
      ]);
      setPolicies(policyData.items);
      setTotal(policyData.total);
      setStats(statsData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (viewMode === 'list' || viewMode === 'timeline') {
      loadData();
    }
  }, [loadData, viewMode]);

  const handleCollect = async () => {
    await triggerCollect();
    setTimeout(() => loadData(), 3000);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>中美经济政策追踪</h1>
        <span className="subtitle">中美经济政策追踪 | China-US Economic Policy Tracker</span>
        <div className="header-actions">
          <button className="btn-collect" onClick={handleCollect} title="手动触发采集">立即采集</button>
          <div className="view-toggle">
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>列表</button>
            <button className={viewMode === 'timeline' ? 'active' : ''} onClick={() => setViewMode('timeline')}>时间线</button>
            <button className={viewMode === 'tools' ? 'active' : ''} onClick={() => setViewMode('tools')}>货币政策工具</button>
            <button className={viewMode === 'legendary' ? 'active' : ''} onClick={() => setViewMode('legendary')}>历史上的妖股</button>
            <button className={viewMode === 'manage' ? 'active' : ''} onClick={() => setViewMode('manage')}>数据管理</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {viewMode !== 'legendary' && stats && <Dashboard stats={stats} />}

        {(viewMode === 'list' || viewMode === 'timeline') && (
          <FilterBar filters={filters} onChange={setFilters} onPageReset={() => setPage(1)} />
        )}

        {viewMode === 'manage' ? (
          <DataManager />
        ) : viewMode === 'legendary' ? (
          <LegendaryStocks />
        ) : viewMode === 'tools' ? (
          <LiquidityTools />
        ) : loading ? (
          <div className="loading">加载中...</div>
        ) : viewMode === 'list' ? (
          <>
            <div className="policy-list">
              {policies.map(p => <PolicyCard key={p.id} policy={p} />)}
              {policies.length === 0 && <div className="empty">暂无数据，请点击"立即采集"获取数据</div>}
            </div>
            <Pagination total={total} page={page} limit={20} onChange={setPage} />
          </>
        ) : (
          <Timeline policies={policies} />
        )}
      </main>
    </div>
  );
}

function Pagination({ total, page, limit, onChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>上一页</button>
      <span>{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>下一页</button>
    </div>
  );
}

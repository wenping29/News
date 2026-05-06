import { useState, useEffect } from 'react';
import { fetchSources } from '../services/api';

export default function Dashboard({ stats }) {
  const cnTotal = stats.total?.find(t => t.country === 'cn')?.count || 0;
  const usTotal = stats.total?.find(t => t.country === 'us')?.count || 0;

  return (
    <div className="dashboard">
      <div className="stat-card cn">
        <div className="stat-number">{cnTotal}</div>
        <div className="stat-label">中国政策</div>
      </div>
      <div className="stat-card us">
        <div className="stat-number">{usTotal}</div>
        <div className="stat-label">美国政策</div>
      </div>
      <div className="stat-card total">
        <div className="stat-number">{cnTotal + usTotal}</div>
        <div className="stat-label">总计</div>
      </div>
      {stats.lastCollectedAt && (
        <div className="stat-info">
          最近采集: {new Date(stats.lastCollectedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

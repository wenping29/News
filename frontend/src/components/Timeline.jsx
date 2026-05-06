import { COUNTRY_MAP, getSourceDisplay } from '../constants';

export default function Timeline({ policies }) {
  if (policies.length === 0) {
    return <div className="empty">暂无数据</div>;
  }

  // 按日期分组
  const grouped = {};
  policies.forEach(p => {
    const date = p.publish_date || '未知日期';
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(p);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="timeline">
      {sortedDates.map(date => (
        <div key={date} className="timeline-group">
          <div className="timeline-date">{date}</div>
          <div className="timeline-items">
            {grouped[date].map(p => (
              <div key={p.id} className={`timeline-item ${p.country}`}>
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-meta">
                    <span className={`badge country-badge ${p.country}`}>{COUNTRY_MAP[p.country]}</span>
                    <span className="source">{getSourceDisplay(p.source)}</span>
                  </div>
                  <h4>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                  </h4>
                  {p.summary && <p>{p.summary}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

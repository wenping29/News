import { COUNTRY_MAP, CATEGORY_MAP, getSourceDisplay } from '../constants';

export default function PolicyCard({ policy }) {
  const countryLabel = COUNTRY_MAP[policy.country] || policy.country;
  const categoryLabel = CATEGORY_MAP[policy.category] || policy.category;

  return (
    <div className={`policy-card ${policy.country}`}>
      <div className="card-header">
        <span className={`badge country-badge ${policy.country}`}>{countryLabel}</span>
        <span className="badge category-badge">{categoryLabel}</span>
        <span className="source">{getSourceDisplay(policy.source)}</span>
        {policy.publish_date && <span className="date">{policy.publish_date}</span>}
      </div>
      <h3 className="card-title">
        <a href={policy.url} target="_blank" rel="noopener noreferrer">{policy.title}</a>
      </h3>
      {policy.summary && <p className="card-summary">{policy.summary}</p>}
    </div>
  );
}

import Skeleton from '../common/Skeleton';

const CareersSkeleton = () => {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Skeleton width="150px" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="260px" height="14px" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="career-summary">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="career-stat-card">
            <Skeleton width="36px" height="36px" radius="12px" />
            <div>
              <Skeleton width="40px" height="20px" style={{ marginBottom: '6px' }} />
              <Skeleton width="80px" height="11px" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="career-filters">
        <Skeleton width="200px" height="32px" radius="8px" />
        <div className="filter-tabs">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} width="76px" height="30px" radius="100px" />
          ))}
        </div>
        <Skeleton width="150px" height="32px" radius="8px" />
      </div>

      {/* Career cards grid */}
      <div className="careers-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="career-card" style={{ cursor: 'default' }}>
            <div className="career-card-header">
              <Skeleton width="38px" height="38px" radius="12px" />
              <Skeleton width="64px" height="64px" radius="50%" />
            </div>
            <Skeleton width="70%" height="18px" style={{ marginBottom: '10px' }} />
            <div className="career-meta">
              <Skeleton width="80px" height="20px" radius="100px" />
            </div>
            <Skeleton width="100%" height="12px" style={{ marginBottom: '6px' }} />
            <Skeleton width="80%" height="12px" style={{ marginBottom: '12px' }} />
            <div className="career-match-bar-wrap">
              <Skeleton height="6px" radius="100px" style={{ flex: 1 }} />
              <Skeleton width="50px" height="11px" />
            </div>
            <Skeleton width="60%" height="11px" style={{ margin: '10px auto 0' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareersSkeleton;
import Skeleton from '../common/Skeleton';

const GoalsSkeleton = () => {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Skeleton width="160px" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="320px" height="14px" />
        </div>
        <Skeleton width="110px" height="38px" radius="10px" />
      </div>

      {/* Stat cards */}
      <div className="goals-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="goal-stat-card" style={{ cursor: 'default' }}>
            <Skeleton width="36px" height="36px" radius="12px" />
            <div>
              <Skeleton width="30px" height="22px" style={{ marginBottom: '6px' }} />
              <Skeleton width="70px" height="11px" />
            </div>
          </div>
        ))}
      </div>

      {/* Goal cards grid */}
      <div className="goals-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="goal-card-new" style={{ cursor: 'default' }}>
            <Skeleton height="4px" radius="0" />
            <div className="goal-card-inner">
              <div className="goal-card-head">
                <Skeleton width="70%" height="16px" />
              </div>
              <div className="goal-card-badges">
                <Skeleton width="70px" height="20px" radius="100px" />
                <Skeleton width="90px" height="20px" radius="100px" />
              </div>
              <Skeleton width="90%" height="12px" style={{ marginBottom: '6px' }} />
              <Skeleton width="60%" height="12px" style={{ marginBottom: '12px' }} />
              <div className="goal-steps-mini">
                <div className="goal-steps-mini-top">
                  <Skeleton width="90px" height="10px" />
                  <Skeleton width="30px" height="10px" />
                </div>
                <Skeleton height="6px" radius="100px" />
              </div>
              <div className="goal-card-footer">
                <Skeleton width="100px" height="11px" />
                <Skeleton width="34px" height="12px" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalsSkeleton;
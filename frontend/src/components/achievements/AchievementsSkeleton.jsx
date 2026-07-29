import Skeleton from '../common/Skeleton';

const AchievementsSkeleton = () => {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Skeleton width="180px" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="260px" height="14px" />
        </div>
      </div>

      {/* XP Banner */}
      <div className="xp-banner">
        <div className="xp-banner-left">
          <Skeleton width="54px" height="54px" radius="14px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <div>
            <Skeleton width="120px" height="18px" style={{ marginBottom: '6px', background: 'rgba(255,255,255,0.2)' }} />
            <Skeleton width="200px" height="12px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          </div>
        </div>
        <div className="xp-banner-right">
          <Skeleton height="10px" radius="100px" style={{ marginBottom: '6px', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton width="40px" height="10px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <Skeleton width="30px" height="10px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <Skeleton width="40px" height="10px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="ach-summary">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ach-sum-card">
            <Skeleton width="32px" height="32px" radius="9px" />
            <div>
              <Skeleton width="40px" height="20px" style={{ marginBottom: '6px' }} />
              <Skeleton width="50px" height="10px" />
            </div>
          </div>
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ach-rarity-box">
            <Skeleton width="40px" height="10px" style={{ marginBottom: '4px' }} />
            <Skeleton width="50px" height="10px" style={{ marginBottom: '4px' }} />
            <Skeleton width="30px" height="12px" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ach-toolbar">
        <div className="ach-view-btns">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width="90px" height="34px" radius="0" />
          ))}
        </div>
        <div className="ach-filters">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width="130px" height="31px" radius="8px" />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="ach-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="ach-card">
            <Skeleton height="4px" radius="0" />
            <div className="ach-icon-wrap">
              <Skeleton width="49px" height="49px" radius="14px" />
            </div>
            <div className="ach-body">
              <Skeleton width="70%" height="14px" style={{ margin: '0 auto 8px' }} />
              <Skeleton width="90%" height="11px" style={{ margin: '0 auto' }} />
            </div>
            <div className="ach-foot">
              <Skeleton width="60px" height="18px" radius="100px" />
              <Skeleton width="50px" height="16px" radius="100px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsSkeleton;
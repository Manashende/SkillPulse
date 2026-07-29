import Skeleton from '../common/Skeleton';

const SkillsSkeleton = () => {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Skeleton width="140px" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="220px" height="14px" />
        </div>
        <Skeleton width="120px" height="38px" radius="10px" />
      </div>

      <div className="skills-top">
        {/* Radar card */}
        <div className="card skills-radar-card">
          <div className="card-header">
            <Skeleton width="100px" height="16px" />
            <Skeleton width="70px" height="20px" radius="100px" />
          </div>
          <div className="radar-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Skeleton width="260px" height="260px" radius="50%" />
          </div>
        </div>

        {/* By Category breakdown */}
        <div className="card">
          <div className="card-header">
            <Skeleton width="110px" height="16px" />
          </div>
          <div className="breakdown-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="breakdown-row">
                <div className="breakdown-info">
                  <Skeleton width="90px" height="13px" />
                  <Skeleton width="50px" height="11px" />
                </div>
                <div className="breakdown-bar-wrap">
                  <Skeleton height="7px" radius="100px" style={{ flex: 1 }} />
                  <Skeleton width="30px" height="11px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="skills-filter-bar">
        <div className="filter-tabs">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width="80px" height="30px" radius="100px" />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Skeleton width="29px" height="29px" radius="8px" />
          <Skeleton width="29px" height="29px" radius="8px" />
        </div>
      </div>

      {/* Skills grid */}
      <div className="skills-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skill-card">
            <div className="skill-card-top">
              <Skeleton width="65%" height="16px" />
            </div>
            <div className="skill-meta">
              <Skeleton width="70px" height="20px" radius="100px" />
              <Skeleton width="60px" height="20px" radius="100px" />
            </div>
            <div className="skill-level-row">
              {Array.from({ length: 5 }).map((_, di) => (
                <Skeleton key={di} width="8px" height="8px" radius="50%" />
              ))}
              <Skeleton width="60px" height="11px" style={{ marginLeft: '6px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsSkeleton;
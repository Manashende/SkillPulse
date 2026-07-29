import Skeleton from '../common/Skeleton';

const DashboardSkeleton = () => {
  return (
    <div className="page-content">
      {/* Welcome banner */}
      <div className="dash-welcome">
        <div className="dash-welcome-left">
          <Skeleton width="220px" height="24px" style={{ marginBottom: '0.5rem', background: 'rgba(255,255,255,0.12)' }} />
          <Skeleton width="160px" height="14px" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.08)' }} />
          <div className="dash-xp-bar-wrap">
            <Skeleton width="240px" height="7px" radius="100px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <Skeleton width="90px" height="12px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
        </div>
        <div className="dash-welcome-stats">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="dash-hero-stat">
              <Skeleton width="40px" height="28px" style={{ margin: '0 auto 4px', background: 'rgba(255,255,255,0.12)' }} />
              <Skeleton width="50px" height="10px" style={{ margin: '0 auto', background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Career highlight */}
      <div className="dash-career-highlight" style={{ cursor: 'default' }}>
        <Skeleton width="34px" height="34px" radius="10px" style={{ background: 'rgba(255,255,255,0.25)' }} />
        <div className="dash-career-highlight-body">
          <Skeleton width="280px" height="16px" style={{ marginBottom: '6px', background: 'rgba(255,255,255,0.25)' }} />
          <Skeleton width="200px" height="12px" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <Skeleton width="52px" height="52px" radius="50%" style={{ background: 'rgba(255,255,255,0.2)' }} />
      </div>

      {/* Stat cards */}
      <div className="dash-stat-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-stat-card">
            <Skeleton width="38px" height="38px" radius="12px" />
            <div style={{ flex: 1 }}>
              <Skeleton width="36px" height="22px" style={{ marginBottom: '6px' }} />
              <Skeleton width="70px" height="11px" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="dash-charts-row">
        {/* Skill Profile (radar) */}
        <div className="dash-chart-card">
          <Skeleton width="100px" height="14px" style={{ marginBottom: '1rem' }} />
          <div className="dash-radar-container" style={{ alignItems: 'center' }}>
            <Skeleton width="200px" height="200px" radius="50%" />
          </div>
        </div>

        {/* Goal Progress (doughnut) */}
        <div className="dash-chart-card">
          <Skeleton width="110px" height="14px" style={{ marginBottom: '1rem' }} />
          <div className="dash-doughnut-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Skeleton width="150px" height="150px" radius="50%" />
          </div>
          <div className="dash-goal-summary">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width="64px" height="20px" radius="100px" />
            ))}
          </div>
        </div>

        {/* Top Skills (bar) */}
        <div className="dash-chart-card">
          <Skeleton width="80px" height="14px" style={{ marginBottom: '1rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
            {[90, 78, 85, 60, 70, 55, 65, 45].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Skeleton width="60px" height="10px" />
                <Skeleton width={w + '%'} height="14px" radius="4px" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="dash-bottom-row">
        {/* Recent Achievements */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <Skeleton width="150px" height="14px" />
            <Skeleton width="50px" height="12px" />
          </div>
          <div className="dash-ach-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dash-ach-item">
                <Skeleton width="32px" height="32px" radius="10px" />
                <div className="dash-ach-body">
                  <Skeleton width="65%" height="13px" style={{ marginBottom: '5px' }} />
                  <Skeleton width="85%" height="11px" />
                </div>
                <Skeleton width="42px" height="12px" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dash-section-card">
          <div className="dash-section-header">
            <Skeleton width="110px" height="14px" />
          </div>
          <div className="dash-quick-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="dash-quick-btn" style={{ cursor: 'default' }}>
                <Skeleton width="36px" height="36px" radius="12px" />
                <Skeleton width="60%" height="10px" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Goals */}
      <div className="dash-section-card" style={{ marginTop: '1.25rem' }}>
        <div className="dash-section-header">
          <Skeleton width="100px" height="14px" />
          <Skeleton width="50px" height="12px" />
        </div>
        <div className="dash-goals-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="dash-goal-item" style={{ cursor: 'default' }}>
              <div className="dash-goal-left">
                <Skeleton width="55%" height="14px" style={{ marginBottom: '6px' }} />
                <Skeleton width="35%" height="11px" />
              </div>
              <div className="dash-goal-right">
                <Skeleton width="100px" height="6px" radius="100px" />
                <Skeleton width="28px" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
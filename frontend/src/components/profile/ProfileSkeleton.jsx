import Skeleton from '../common/Skeleton';

const ProfileSkeleton = () => {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Skeleton width="90px" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="220px" height="14px" />
        </div>
      </div>

      <div className="profile-layout">
        <div className="profile-avatar-card">
          <div className="profile-avatar-ring" style={{ padding: 0 }}>
            <Skeleton width="84px" height="84px" radius="50%" />
          </div>
          <Skeleton width="140px" height="18px" style={{ margin: '0 auto 6px' }} />
          <Skeleton width="180px" height="12px" style={{ margin: '0 auto 20px' }} />

          <div className="profile-level-section">
            <Skeleton width="90px" height="24px" radius="100px" style={{ marginBottom: '10px' }} />
            <div className="profile-level-row">
              <Skeleton width="60px" height="11px" />
              <Skeleton width="50px" height="11px" />
            </div>
            <Skeleton height="7px" radius="100px" style={{ marginBottom: '6px' }} />
            <Skeleton width="120px" height="10px" />
          </div>

          <div className="profile-stats-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="profile-mini-stat">
                <Skeleton width="30px" height="20px" style={{ margin: '0 auto 4px' }} />
                <Skeleton width="40px" height="10px" style={{ margin: '0 auto' }} />
              </div>
            ))}
          </div>

          <Skeleton width="130px" height="12px" style={{ margin: '12px auto' }} />
          <Skeleton width="90%" height="11px" style={{ margin: '0 auto 4px' }} />
          <Skeleton width="70%" height="11px" style={{ margin: '0 auto 16px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton width="70%" height="12px" />
            <Skeleton width="65%" height="12px" />
          </div>

          <Skeleton width="150px" height="11px" style={{ margin: '16px auto 0' }} />
        </div>

        <div className="profile-settings">
          <div className="profile-tabs">
            <Skeleton width="100px" height="46px" radius="0" />
            <Skeleton width="140px" height="46px" radius="0" />
            <Skeleton width="130px" height="46px" radius="0" />
          </div>
          <div className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <Skeleton width="80px" height="10px" style={{ marginBottom: '6px' }} />
                <Skeleton height="38px" radius="8px" />
              </div>
              <div className="form-group">
                <Skeleton width="60px" height="10px" style={{ marginBottom: '6px' }} />
                <Skeleton height="38px" radius="8px" />
              </div>
            </div>
            <div className="form-group">
              <Skeleton width="40px" height="10px" style={{ marginBottom: '6px' }} />
              <Skeleton height="70px" radius="8px" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <Skeleton width="70px" height="10px" style={{ marginBottom: '6px' }} />
                <Skeleton height="38px" radius="8px" />
              </div>
              <div className="form-group">
                <Skeleton width="120px" height="10px" style={{ marginBottom: '6px' }} />
                <Skeleton height="38px" radius="8px" />
              </div>
            </div>
            <Skeleton width="130px" height="40px" radius="10px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
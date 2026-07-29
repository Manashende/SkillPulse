import Skeleton from '../common/Skeleton';

const LearningSkeleton = () => {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Skeleton width="160px" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="320px" height="14px" />
        </div>
      </div>

      <div className="learning-tabs">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="140px" height="40px" radius="0" style={{ marginRight: '4px' }} />
        ))}
      </div>

      <div className="lp-profile-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="lp-profile-card">
            <Skeleton width="24px" height="24px" style={{ margin: '0 auto 8px' }} />
            <Skeleton width="30px" height="22px" style={{ margin: '0 auto 6px' }} />
            <Skeleton width="70px" height="10px" style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>

      <div className="lp-ai-section">
        <Skeleton width="240px" height="18px" style={{ marginBottom: '8px' }} />
        <Skeleton width="90%" height="13px" style={{ marginBottom: '4px' }} />
        <Skeleton width="60%" height="13px" style={{ marginBottom: '16px' }} />
        <div className="lp-ai-input-row">
          <Skeleton height="36px" radius="10px" style={{ flex: 1, minWidth: '200px' }} />
          <Skeleton width="160px" height="36px" radius="10px" />
        </div>
      </div>
    </div>
  );
};

export default LearningSkeleton;
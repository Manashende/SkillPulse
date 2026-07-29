import Skeleton from '../common/Skeleton';

const CareerAgentSkeleton = () => {
  return (
    <div className="ca-page">
      <div className="ca-header">
        <div className="ca-header-text">
          <Skeleton width="200px" height="22px" style={{ marginBottom: '6px' }} />
          <Skeleton width="360px" height="12px" />
        </div>
        <div className="ca-header-actions">
          <Skeleton width="80px" height="28px" radius="100px" />
        </div>
      </div>

      <div className="ca-container">
        <div className="ca-messages">
          <div className="ca-msg ca-msg-agent" style={{ width: '100%' }}>
            <div className="ca-agent-msg">
              <Skeleton width="120px" height="11px" />
              <Skeleton width="80%" height="60px" radius="4px 16px 16px 16px" />
            </div>
          </div>
          <div className="ca-msg ca-msg-user">
            <Skeleton width="55%" height="44px" radius="18px 18px 4px 18px" />
          </div>
          <div className="ca-msg ca-msg-agent" style={{ width: '100%' }}>
            <div className="ca-agent-msg">
              <Skeleton width="120px" height="11px" />
              <Skeleton width="90%" height="90px" radius="4px 16px 16px 16px" />
            </div>
          </div>
        </div>

        <div className="ca-inputbar">
          <div className="ca-inputbar-btns">
            <Skeleton width="80px" height="30px" radius="100px" />
            <Skeleton width="90px" height="30px" radius="100px" />
          </div>
          <div className="ca-inputrow">
            <Skeleton height="52px" radius="12px" style={{ flex: 1 }} />
            <Skeleton width="37px" height="37px" radius="10px" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerAgentSkeleton;
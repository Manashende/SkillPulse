import Skeleton from '../common/Skeleton';

const ResumeBuilderSkeleton = () => {
  return (
    <div className="resume-builder">
      <div className="resume-editor-outer">
        <div className="resume-editor">
          <div className="resume-editor-header">
            <Skeleton width="160px" height="20px" style={{ marginBottom: '6px' }} />
            <Skeleton width="260px" height="12px" />
          </div>

          <div className="resume-template-row">
            <Skeleton width="70px" height="11px" style={{ marginBottom: '8px' }} />
            <div className="resume-template-btns">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width="90px" height="34px" radius="8px" />
              ))}
            </div>
          </div>

          <div className="resume-section-nav">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} width="70px" height="26px" radius="100px" />
            ))}
          </div>

          <div className="resume-form-section">
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
            <div className="form-row">
              <div className="form-group">
                <Skeleton width="70px" height="10px" style={{ marginBottom: '6px' }} />
                <Skeleton height="38px" radius="8px" />
              </div>
              <div className="form-group">
                <Skeleton width="70px" height="10px" style={{ marginBottom: '6px' }} />
                <Skeleton height="38px" radius="8px" />
              </div>
            </div>
          </div>

          <div className="ats-score-section">
            <Skeleton width="140px" height="16px" style={{ marginBottom: '8px' }} />
            <Skeleton width="90%" height="11px" style={{ marginBottom: '16px' }} />
            <Skeleton height="34px" radius="10px" />
          </div>

          <div className="resume-print-row">
            <Skeleton height="42px" radius="10px" />
          </div>
        </div>
      </div>

      <div className="resume-preview-wrap">
        <Skeleton width="100px" height="11px" style={{ marginBottom: '12px' }} />
        <div style={{
          width: '210mm', maxWidth: '100%', minHeight: '297mm', boxSizing: 'border-box',
          padding: '1.5cm', background: '#fff', borderRadius: '4px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)', margin: '0 auto',
        }}>
          <Skeleton width="240px" height="28px" style={{ marginBottom: '10px' }} />
          <Skeleton width="70%" height="12px" style={{ marginBottom: '24px' }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              <Skeleton width="120px" height="13px" style={{ marginBottom: '10px' }} />
              <Skeleton width="100%" height="10px" style={{ marginBottom: '6px' }} />
              <Skeleton width="95%" height="10px" style={{ marginBottom: '6px' }} />
              <Skeleton width="80%" height="10px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilderSkeleton;
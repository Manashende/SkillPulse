import './Skeleton.css';

const Skeleton = ({ width = '100%', height = '16px', radius = '8px', style = {}, className = '' }) => (
  <div
    className={'skeleton-block ' + className}
    style={{ width, height, borderRadius: radius, ...style }}
  />
);

export default Skeleton;
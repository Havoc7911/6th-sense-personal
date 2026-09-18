export default function Skeleton({ className = '', style = {} }) {
  return (
    <div 
      className={`skeleton-base ${className}`} 
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s infinite ease-in-out',
        borderRadius: '8px',
        ...style
      }}
    />
  );
}

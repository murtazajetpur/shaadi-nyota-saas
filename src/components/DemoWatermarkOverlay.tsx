import './DemoWatermarkOverlay.css';

export default function DemoWatermarkOverlay() {
  return (
    <div className="demo-watermark-overlay" aria-hidden="true">
      <div className="demo-watermark-pattern">
        {Array.from({ length: 36 }, (_, index) => (
          <span key={index}>SHAADI NYOTA DEMO</span>
        ))}
      </div>
      <div className="demo-watermark-badge">Demo Preview · Shaadi Nyota</div>
    </div>
  );
}

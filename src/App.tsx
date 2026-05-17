import { useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import InviteExperience from './components/InviteExperience';
import { defaultWeddingSlug, getWeddingBySlug } from './data/sampleWeddingData';

function NotFound() {
  useEffect(() => {
    document.title = 'Wedding Not Found | Shaadi Nyota';
  }, []);

  return (
    <>
      <div className="desktop-bg-blur" />
      <div className="desktop-vignette" />
      <div className="app-container">
        <div className="phone-canvas">
          <section className="section-wrapper not-found-section">
            <h1>Wedding invite not found</h1>
            <p>Please check the invitation link and try again.</p>
          </section>
        </div>
      </div>
    </>
  );
}

function App() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];
  const isDashboard = firstSegment === 'dashboard';
  const slug = firstSegment ?? defaultWeddingSlug;
  const data = getWeddingBySlug(slug);

  useEffect(() => {
    if (!isDashboard && data) {
      document.title = data.wedding.pageTitle;
    }
  }, [data, isDashboard]);

  if (isDashboard) {
    return <Dashboard />;
  }

  if (!data) {
    return <NotFound />;
  }

  return <InviteExperience data={data} />;
}

export default App;

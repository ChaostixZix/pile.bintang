import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

const wrapperStyle = {
  background: window.electron?.isMac ? 'transparent' : 'var(--bg)',
};

root.render(
  <Router>
    <div className="uiChrome flatEdgy" style={wrapperStyle}>
      <App />
    </div>
  </Router>,
);

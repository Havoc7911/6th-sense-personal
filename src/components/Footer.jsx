import { Link } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <img src={logo} alt="6th Sense Personal Logo" style={{ height: '32px', width: 'auto', marginBottom: '1rem' }} />
          <p>Premium Tech Support & Consultant Services</p>
          <p>Serving Confluence, PA</p>
        </div>
        <div className="footer-section">
          <h4>Contact & Info</h4>
          <p><a href="mailto:jmcc5271@gmail.com" style={{color: 'inherit', textDecoration: 'none'}}>Contact</a></p>
          <p>(724) 780-3223</p>
          <p style={{ marginTop: '0.5rem' }}>
            <Link to="/policies" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Client Guidelines & Policies</Link>
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} 6th Sense Personal. All rights reserved.</p>
      </div>
    </footer>
  );
}

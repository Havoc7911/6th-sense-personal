import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import './TechDashboard.css'; // Reuse table/panel styles

export default function TechLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (email.trim().toLowerCase() !== 'jmcc5271@gmail.com') {
        throw new Error('Access denied. This portal is for technicians only.');
      }
      await signInWithPassword(email, password);
      navigate('/tech');
    } catch (err) {
      setError(err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in flex items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <div className="service-icon-small" style={{ margin: '0 auto 1rem', width: '48px', height: '48px' }}>
            <Shield size={24} />
          </div>
          <h1 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Tech Portal</h1>
          <p className="text-muted">Secure access for 6th Sense Personal</p>
        </div>

        {error && (
          <div className="form-error mb-6 flex items-center gap-2" style={{ color: '#fca5a5', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="intake-form">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Mail size={14} /> Email Address
            </label>
            <input 
              type="email" 
              className="form-input" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tech@6thsense.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Lock size={14} /> Password
            </label>
            <input 
              type="password" 
              className="form-input" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="button submit-button w-full mt-4" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
        
        <p className="text-center text-muted text-sm mt-6">
          Authorized personnel only. All access attempts are logged.
        </p>
      </div>
    </div>
  );
}

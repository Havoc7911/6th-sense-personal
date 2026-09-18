import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Shield, AlertCircle, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  // Basic check: Supabase recovery links log you in automatically.
  // If there's no session, they shouldn't be on this page.
  useEffect(() => {
    if (!session) {
      // We wait a second to account for the hash-to-session transition
      const timer = setTimeout(() => {
        if (!session) {
          setError('Invalid or expired reset session. Please request a new link.');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in flex items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <div className="service-icon-small" style={{ margin: '0 auto 1rem', width: '48px', height: '48px' }}>
            <KeyRound size={24} />
          </div>
          <h1 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Set New Password</h1>
          <p className="text-muted">Secure your technician account</p>
        </div>

        {success ? (
          <div className="text-center animate-fade-in">
            <div className="flex justify-center mb-4 text-green-400">
              <CheckCircle size={48} />
            </div>
            <h2 className="mb-2">Password Updated!</h2>
            <p className="text-muted text-sm">Redirecting to login...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="form-error mb-6 flex items-center gap-2" style={{ color: '#fca5a5', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="intake-form">
              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <Shield size={14} /> New Password
                </label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <Shield size={14} /> Confirm Password
                </label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>

              <button type="submit" className="button submit-button w-full mt-4" disabled={loading || !!error.includes('expired')}>
                {loading ? 'Updating...' : 'Save New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import './Auth.css';

const RESEND_COOLDOWN_S = 60;

const ForgotPassword = () => {
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [requesting, setRequesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Enter your email'); return; }
    setRequesting(true);
    try {
      await authAPI.forgotPassword({ email: email.trim() });
      toast.success('Check your email for a reset code');
      setStep('reset');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not send reset code');
    } finally { setRequesting(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success('New code sent');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not resend code');
    } finally { setResending(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setResetting(true);
    try {
      await authAPI.resetPassword({ email, otp: otp.trim(), newPassword });
      toast.success('Password reset! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Reset failed');
    } finally { setResetting(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-blob" />
      <div className="auth-card">

        <div className="auth-logo-wrap">
          <div className="auth-logo-icon">
            <img src="/skillpulse-logo.png" alt="SkillPulse" className="auth-logo-img" />
          </div>
          <div className="auth-logo-name">SkillPulse</div>
          <div className="auth-logo-tagline">
            {step === 'request' ? 'Reset your password.' : 'Enter your code and a new password.'}
          </div>
        </div>

        {step === 'request' ? (
          <>
            <form onSubmit={handleRequestCode} className="auth-form">
              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Email Address</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" /></svg>
                  </span>
                  <input className="auth-input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoFocus />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={requesting}>
                {requesting ? 'Sending code…' : <>Send Reset Code <span className="auth-submit-arrow">→</span></>}
              </button>
            </form>

            <div className="auth-divider">or</div>
            <p className="auth-switch">Remembered it? <Link to="/login">Sign in</Link></p>
          </>
        ) : (
          <>
            <form onSubmit={handleReset} className="auth-form">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              </p>

              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Reset Code</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" /></svg>
                  </span>
                  <input
                    className="auth-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    style={{ letterSpacing: '4px', fontWeight: 700 }}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">New Password</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                  <input className="auth-input" type="password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters" required minLength={6} />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Confirm New Password</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                  <input className="auth-input" type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password" required />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={resetting}>
                {resetting ? 'Resetting…' : <>Reset Password <span className="auth-submit-arrow">→</span></>}
              </button>
            </form>

            <div className="auth-divider">or</div>
            <p className="auth-switch">
              Didn't get a code?{' '}
              {cooldown > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {cooldown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{ background: 'none', border: 'none', color: 'var(--orange)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </p>
            <p className="auth-switch" style={{ marginTop: '0.5rem' }}>
              <button
                onClick={() => setStep('request')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '0.82rem' }}
              >
                ← Use a different email
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
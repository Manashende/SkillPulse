import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const RESEND_COOLDOWN_S = 60;

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // ── Step 2: OTP entry ──
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password);
      setPendingEmail(data.email || form.email);
      setStep('otp');
      setCooldown(RESEND_COOLDOWN_S);
      toast.success('Check your email for a verification code');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setVerifying(true);
    try {
      await verifyOtp(pendingEmail, otp.trim());
      toast.success('Account verified! Please sign in to continue.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Verification failed');
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await resendOtp(pendingEmail);
      toast.success('New code sent');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not resend code');
    } finally { setResending(false); }
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
            {step === 'form' ? 'Start your personalized growth journey.' : 'One last step — verify your email.'}
          </div>
        </div>

        {step === 'form' ? (
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Full Name</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                  </span>
                  <input className="auth-input" type="text" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe" required />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Email Address</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" /></svg>
                  </span>
                  <input className="auth-input" type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com" required />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Password</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                  <input className="auth-input" type="password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="At least 6 characters" required minLength={6} />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Confirm Password</label></div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                  <input className="auth-input" type="password" value={form.confirm}
                    onChange={e => setForm({ ...form, confirm: e.target.value })}
                    placeholder="Repeat your password" required />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Creating account…' : <>Create Account <span className="auth-submit-arrow">→</span></>}
              </button>
            </form>

            <div className="auth-divider">or</div>
            <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          </>
        ) : (
          <>
            <form onSubmit={handleVerify} className="auth-form">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{pendingEmail}</strong>. Enter it below to finish creating your account.
              </p>

              <div className="auth-field">
                <div className="auth-field-header"><label className="auth-label">Verification Code</label></div>
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
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={verifying || otp.length !== 6}>
                {verifying ? 'Verifying…' : <>Verify & Continue <span className="auth-submit-arrow">→</span></>}
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
                onClick={() => setStep('form')}
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

export default Register;
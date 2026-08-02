import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const RESEND_COOLDOWN_S = 60;

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // ── Self-service verification, for accounts that were never verified
  // (pre-dates the OTP feature, or someone abandoned signup mid-flow) ──
  const [step, setStep] = useState('login'); // 'login' | 'otp'
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
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        // This account was never verified — send it a fresh code right
        // now (it may never have gotten one, e.g. pre-dates this feature)
        // and drop them into the same OTP step Register.jsx uses.
        setLoading(false);
        try {
          await resendOtp(form.email);
          toast.success('Your account needs verification — a code was just sent to your email');
        } catch (resendErr) {
          toast.error(resendErr.response?.data?.message || resendErr.message || 'Could not send a verification code');
        }
        setStep('otp');
        setCooldown(RESEND_COOLDOWN_S);
        return;
      }
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setVerifying(true);
    try {
      await verifyOtp(form.email, otp.trim());
      // verifyOtp only confirms the account, it doesn't log in (same
      // contract as the Register flow) — so finish by logging in for
      // real with the credentials already entered on this page.
      await login(form.email, form.password);
      toast.success('Account verified — welcome!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Verification failed');
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await resendOtp(form.email);
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
            {step === 'login' ? 'Resume your personalized learning roadmap.' : 'One last step — verify your email.'}
          </div>
        </div>

        {step === 'login' ? (
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <div className="auth-field-header">
                  <label className="auth-label">Email Address</label>
                </div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
                  </span>
                  <input
                    className="auth-input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-header">
                  <label className="auth-label">Password</label>
                  <Link to="/forgot-password" className="auth-forgot">Forgot?</Link>
                </div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    className="auth-input"
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Signing in…' : <>Access Roadmap <span className="auth-submit-arrow">→</span></>}
              </button>
            </form>

            <div className="auth-divider">or</div>
            <p className="auth-switch">
              Starting from scratch? <Link to="/register">Create an account</Link>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleVerify} className="auth-form">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{form.email}</strong>. Enter it below to verify your account and sign in.
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
                {verifying ? 'Verifying…' : <>Verify & Sign In <span className="auth-submit-arrow">→</span></>}
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
                onClick={() => setStep('login')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '0.82rem' }}
              >
                ← Back to sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
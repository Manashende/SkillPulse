import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';

export const AuthContext = createContext(null);

const initialState = {
  user: JSON.parse(localStorage.getItem('sp_user')) || null,
  token: localStorage.getItem('sp_token') || null,
  loading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      localStorage.setItem('sp_token', action.payload.token);
      localStorage.setItem('sp_user', JSON.stringify(action.payload.user));
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
    case 'UPDATE_USER':
      localStorage.setItem('sp_user', JSON.stringify(action.payload));
      return { ...state, user: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('sp_token');
      localStorage.removeItem('sp_user');
      return { user: null, token: null, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

// Helper — fetch full user data (with level, xp, counts) from dashboard endpoint
const fetchRichUser = async () => {
  try {
    const { data } = await userAPI.getDashboard();
    return data.user; // includes level, xp, xpToNextLevel, skillCount, goalCount, achievementCount
  } catch {
    // Fallback to /api/auth/me
    const { data } = await authAPI.getMe();
    return data.user;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On app mount — verify token and load FULL user data
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('sp_token');
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        const user = await fetchRichUser();
        dispatch({ type: 'AUTH_SUCCESS', payload: { token, user } });
      } catch {
        dispatch({ type: 'LOGOUT' });
      }
    };
    init();
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { data } = await authAPI.login({ email, password });
    // After login, fetch rich user data with level/xp/counts
    const token = data.token;
    localStorage.setItem('sp_token', token);
    try {
      const richUser = await fetchRichUser();
      dispatch({ type: 'AUTH_SUCCESS', payload: { token, user: richUser } });
      return { ...data, user: richUser };
    } catch {
      dispatch({ type: 'AUTH_SUCCESS', payload: { token, user: data.user } });
      return data;
    }
  };

  // register() no longer logs anyone in — it just creates the (unverified)
  // account and triggers the OTP email. The actual "log them in" moment is
  // verifyOtp(), once they prove the email is theirs.
  const register = async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    return data; // { success, needsVerification: true, email }
  };

  // Verifying the OTP only confirms the account — it deliberately does NOT
  // log the user in. The backend still returns a token here (kept for a
  // future "auto-login after verify" option if ever wanted), but the
  // frontend ignores it and sends them to /login to sign in normally.
  const verifyOtp = async (email, otp) => {
    const { data } = await authAPI.verifyOtp({ email, otp });
    return data;
  };

  const resendOtp = async (email) => {
    const { data } = await authAPI.resendOtp({ email });
    return data;
  };

  // Call this whenever XP/level/counts might have changed (after skill/goal updates)
  const refreshUser = async () => {
    const token = localStorage.getItem('sp_token');
    if (!token) return;
    try {
      const user = await fetchRichUser();
      dispatch({ type: 'UPDATE_USER', payload: user });
    } catch (err) {
      console.error('refreshUser failed:', err.message);
    }
  };

  const logout = () => dispatch({ type: 'LOGOUT' });
  const updateUser = (user) => dispatch({ type: 'UPDATE_USER', payload: user });

  return (
    <AuthContext.Provider value={{ ...state, login, register, verifyOtp, resendOtp, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
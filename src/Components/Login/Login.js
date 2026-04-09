import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from 'react-router-dom';
import { supabase } from 'backend/config';
import { ToastContext } from '../../contextStore/ToastContext';
import OverlaySpinner from '../Loading/OverlaySpinner';
import { validateEmail, validatePassword } from '../../utils/validation';
import './Login.css';

const Logo = `${process.env.PUBLIC_URL || ''}/assets/images/nit1.png`;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const history = useHistory();
  const { addToast } = useContext(ToastContext);

  const from = history.location.state?.from?.pathname || '/';

  const handleSocialLogin = async (providerName) => {
    setLoading(true);
    setErrors({});
    const { error } = await supabase.auth.signInWithOAuth({
      provider: providerName,
      options: {
        redirectTo: window.location.origin + from,
      },
    });

    if (error) {
      setLoading(false);
      setErrors({ form: error.message || 'Something went wrong. Please try again.' });
    }
    // Note: session will be handled by AuthContext on redirect
  };

  const handleGuestContinue = () => {
    addToast('Browsing as guest. Sign in to post ads or chat.', 'info');
    history.replace('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    const eErr = validateEmail(email);
    if (eErr) err.email = eErr;
    const pErr = validatePassword(password, { requireStrength: false, minLength: 1 });
    if (pErr) err.password = pErr;
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrors({ form: error.message || 'Invalid login credentials.' });
    } else {
      addToast('Welcome back!', 'success');
      history.replace(from);
    }
  };

  return (
    <>
      {loading && <OverlaySpinner />}
      <div className="loginPageWrapper">
        <Link to="/" className="loginHomeLink">
          ← Back to Home
        </Link>
        <div className="loginParentDiv">
          <Link to="/" className="loginLogoLink">
            <img width="80" height="80" src={Logo} alt="NIT" />
          </Link>
          <form onSubmit={handleSubmit}>
            <div className="loginFormGroup">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="user@example.com"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <span className="formError">{errors.email}</span>
              )}
            </div>
            <div className="loginFormGroup">
              <label>Password</label>
              <input
                className="input"
                type="password"
                name="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && (
                <span className="formError">{errors.password}</span>
              )}
              {errors.form && <span className="formError">{errors.form}</span>}
            </div>
            <Link to="/forgot-password" className="loginForgotLink">
              Forgot password?
            </Link>
            <button type="submit">Login</button>
          </form>
          <div className="loginDivider">or</div>
          <button
            type="button"
            className="loginGoogleBtn"
            onClick={() => handleSocialLogin('google')}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="loginGuestBtn"
            onClick={handleGuestContinue}
          >
            Continue as Guest
          </button>
          <Link to="/signup" className="loginSignupLink">
            Signup
          </Link>
        </div>
      </div>
    </>
  );
}

export default Login;

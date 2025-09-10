import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import guideOpsLogo from '../../assets/guideops-logo.png';
import './Login.css';

interface LoginProps {
  onLogin: (credentials: { userId: string; password: string }) => void;
  onGoogleLogin: (credential: string) => void;
  onSwitchToRegister: () => void;
  loading?: boolean;
  error?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onGoogleLogin, onSwitchToRegister, loading, error }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ userId, password });
  };

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      onGoogleLogin(credentialResponse.credential);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
    alert('Google login failed. Please check browser console for details.');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src={guideOpsLogo} alt="GuideOps" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </div>
          <h1>GuideOps</h1>
          <p>Sign in to your team workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="userId">Email or User ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="your.email@company.com or username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <div className="google-login-container">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            text="signin_with"
            theme="outline"
            size="large"
            auto_select={false}
          />
        </div>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <button 
              type="button" 
              className="switch-auth-button" 
              onClick={onSwitchToRegister}
              disabled={loading}
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// @ts-check
import { Toast } from "react-bootstrap";
import React, { useState, useRef } from "react";
import Logo from "../Logo";
import "./style.css";
import { useEffect } from "react";

export default function Login({ onLogIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    onLogIn(username, password, setError);
  };

  const onRegisterSubmit = async (event) => {
    event.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    try {
      const { register } = await import("../../api");
      const result = await register({
        name: registerData.name,
        email: registerData.email,
        phone: registerData.phone,
        password: registerData.password
      });
      
      // Show success message for account owner
      if (result.is_account_owner) {
        setError(`🎉 ${result.message}`);
        setTimeout(() => setError(null), 5000);
      }
      
      // Auto-login after successful registration
      onLogIn(registerData.email, registerData.password, setError);
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="login-form text-center login-page">
        <div
          className="rounded"
          style={{
            boxShadow: "0 0.75rem 1.5rem rgba(18,38,63,.03)",
          }}
        >
          <div className="position-relative">
            <div
              className="row no-gutters align-items-center"
              style={{
                maxWidth: 400,
                backgroundColor: "rgba(85, 110, 230, 0.25)",
                paddingLeft: 20,
                paddingRight: 20,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }}
            >
              <div className="col text-primary text-left">
                <h3 className="font-size-15">
                  {showRegister ? "Join GuideOps!" : "Welcome Back!"}
                </h3>
                <p>{showRegister ? "Create your account" : "Sign in to continue"}</p>
              </div>
              <div className="col align-self-end">
                <img
                  alt="welcome"
                  style={{ maxWidth: "100%" }}
                  src={`${process.env.PUBLIC_URL}/welcome-back.png`}
                />
              </div>
            </div>
            <div
              className="position-absolute"
              style={{ bottom: -36, left: 20 }}
            >
              <div
                style={{
                  backgroundColor: "rgb(239, 242, 247)",
                  width: 72,
                  height: 72,
                }}
                className="rounded-circle d-flex align-items-center justify-content-center"
              >
                <Logo width={34} height={34} />
              </div>
            </div>
          </div>

          {!showRegister ? (
            // Login Form
            <form
              className="bg-white text-left px-4"
              style={{
                paddingTop: 58,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
              }}
              onSubmit={onSubmit}
            >
              <label className="font-size-12">Email</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                type="email"
                className="form-control mb-3"
                placeholder="Enter your email"
                required
              />

              <label htmlFor="inputPassword" className="font-size-12">
                Password
              </label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                id="inputPassword"
                className="form-control"
                placeholder="Password"
                required
              />
              <div style={{ height: 30 }} />
              <button className="btn btn-lg btn-primary btn-block" type="submit">
                Sign In
              </button>
              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => setShowRegister(true)}
                >
                  Don't have an account? Create Account
                </button>
              </div>
            </form>
          ) : (
            // Registration Form
            <form
              className="bg-white text-left px-4"
              style={{
                paddingTop: 58,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
              }}
              onSubmit={onRegisterSubmit}
            >
              <label className="font-size-12">Full Name</label>
              <input
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                type="text"
                className="form-control mb-3"
                placeholder="Enter your full name"
                required
              />

              <label className="font-size-12">Email</label>
              <input
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                type="email"
                className="form-control mb-3"
                placeholder="Enter your email"
                required
              />

              <label className="font-size-12">Phone (Optional)</label>
              <input
                value={registerData.phone}
                onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                type="tel"
                className="form-control mb-3"
                placeholder="+1 (555) 123-4567"
              />

              <label className="font-size-12">Password</label>
              <input
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                type="password"
                className="form-control mb-3"
                placeholder="Create password (min 6 chars)"
                required
                minLength={6}
              />

              <label className="font-size-12">Confirm Password</label>
              <input
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                type="password"
                className="form-control"
                placeholder="Confirm your password"
                required
                minLength={6}
              />
              
              <div style={{ height: 30 }} />
              <button className="btn btn-lg btn-primary btn-block" type="submit">
                Create Account
              </button>
              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => setShowRegister(false)}
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}
          
          <div className="login-error-anchor">
            <div className="toast-box">
              <Toast
                style={{ minWidth: 277 }}
                onClose={() => setError(null)}
                show={error !== null}
                delay={5000}
                autohide={!error?.includes("🎉")}
              >
                <Toast.Body>
                  <div className={error?.includes("🎉") ? "text-success" : "text-danger"}>
                    {error}
                  </div>
                </Toast.Body>
              </Toast>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

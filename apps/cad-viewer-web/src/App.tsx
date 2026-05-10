import React, { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './components/auth/LoginPage';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));

  if (!token) {
    return <LoginPage onLogin={(t) => { localStorage.setItem('accessToken', t); setToken(t); }} />;
  }

  return <AppLayout />;
}

export default App;

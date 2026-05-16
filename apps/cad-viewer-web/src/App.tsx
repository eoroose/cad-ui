import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './components/auth/LoginPage';

const queryClient = new QueryClient();

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));

  if (!token) {
    return <LoginPage onLogin={(t) => { localStorage.setItem('accessToken', t); setToken(t); }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}

export default App;

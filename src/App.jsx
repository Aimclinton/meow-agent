import { useEffect, useState } from 'react';
import { useDocumentStore } from './store/documentStore';
import PasswordSetup from './pages/PasswordSetup';
import PasswordLogin from './pages/PasswordLogin';
import MainApp from './pages/MainApp';
import { QuotaBar } from './components/ui';
import { watchMonthlyReset } from './store/quotaStore';

function App() {
  const { isAuthenticated, passwordSet, initStore } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => watchMonthlyReset(), []);

  useEffect(() => {
    const init = async () => {
      try {
        await initStore();
        setLoading(false);
      } catch {
        setError('Failed to initialize app');
        setLoading(false);
      }
    };
    init();
  }, [initStore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-paper">
        <p className="font-pixel text-sm uppercase text-ink/60">Loading<span className="caret">▌</span></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-paper p-6 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  let screen;
  if (!isAuthenticated) screen = passwordSet ? <PasswordLogin /> : <PasswordSetup />;
  else screen = <MainApp />;

  return (
    <>
      <QuotaBar />
      {screen}
    </>
  );
}

export default App;

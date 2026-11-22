import { useEffect, useState } from 'react';
import { useDocumentStore } from './store/documentStore';
import PasswordSetup from './pages/PasswordSetup';
import PasswordLogin from './pages/PasswordLogin';
import MainApp from './pages/MainApp';
import { QuotaBar } from './components/ui';
import { watchQuotaReset } from './store/quotaStore';

function App() {
  const { isAuthenticated, passwordSet, initStore } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => watchQuotaReset(), []);

  useEffect(() => {
    const init = async () => {
      try {
        await initStore();
      } catch {
        setError('เปิดแอปไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง');
      } finally {
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
  if (isAuthenticated) screen = <MainApp />;
  else screen = passwordSet ? <PasswordLogin /> : <PasswordSetup />;

  return (
    <>
      <QuotaBar />
      {screen}
    </>
  );
}

export default App;

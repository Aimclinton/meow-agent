import { useEffect, useState } from 'react';
import { useDocumentStore } from './store/documentStore';
import PasswordSetup from './pages/PasswordSetup';
import PasswordLogin from './pages/PasswordLogin';
import CloudAuth from './pages/CloudAuth';
import MainApp from './pages/MainApp';
import { QuotaBar } from './components/ui';
import { watchQuotaReset, useQuota } from './store/quotaStore';
import { supabase, supabaseEnabled } from './lib/supabase';

function App() {
  const { isAuthenticated, passwordSet, initStore } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => watchQuotaReset(), []);

  useEffect(() => {
    const init = async () => {
      try {
        await initStore();
        if (supabaseEnabled) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            useDocumentStore.getState().authenticate();
            useDocumentStore.getState().syncFromCloud();
          }
        }
      } catch {
        setError('เปิดแอปไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [initStore]);

  // Cloud mode: follow Supabase sign-in / sign-out / password-recovery links.
  useEffect(() => {
    if (!supabaseEnabled) return undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true);
        return;
      }
      if (event === 'SIGNED_IN' && session) {
        useDocumentStore.getState().authenticate();
        useDocumentStore.getState().syncFromCloud();
        useQuota.getState().refresh();
      }
      if (event === 'SIGNED_OUT') useDocumentStore.setState({ isAuthenticated: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

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
  if (supabaseEnabled && recovery) screen = <CloudAuth recovery onRecovered={() => setRecovery(false)} />;
  else if (isAuthenticated) screen = <MainApp />;
  else if (supabaseEnabled) screen = <CloudAuth />;
  else screen = passwordSet ? <PasswordLogin /> : <PasswordSetup />;

  return (
    <>
      <QuotaBar />
      {screen}
    </>
  );
}

export default App;

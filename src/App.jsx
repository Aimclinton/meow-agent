import { useEffect, useState } from 'react';
import { useDocumentStore } from './store/documentStore';
import PasswordSetup from './pages/PasswordSetup';
import PasswordLogin from './pages/PasswordLogin';
import MainApp from './pages/MainApp';

function App() {
  const { isAuthenticated, passwordSet, initStore } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initStore();
        setLoading(false);
      } catch (err) {
        setError('Failed to initialize app');
        setLoading(false);
      }
    };
    init();
  }, [initStore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (!passwordSet) {
      return <PasswordSetup />;
    }
    return <PasswordLogin />;
  }

  // Authenticated
  return <MainApp />;
}

export default App;

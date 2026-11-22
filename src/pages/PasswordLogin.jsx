import { useState } from 'react';
import { useDocumentStore, verifyPassword } from '../store/documentStore';

export default function PasswordLogin() {
  const [password, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { authenticate } = useDocumentStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const isValid = await verifyPassword(password);
      if (isValid) {
        authenticate(password);
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Error verifying password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-800">
        <h1 className="text-4xl font-bold text-center text-white mb-2">🐱 MEOW Agent</h1>
        <p className="text-center text-gray-400 mb-10">Enter your password to continue</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-white outline-none transition-all disabled:opacity-50"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-600 text-black font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl mt-6"
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-8">
          Your documents are protected with password security.
        </p>
      </div>
    </div>
  );
}

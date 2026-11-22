import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';

export default function PasswordSetup() {
  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPasswordInput] = useState('');
  const [error, setError] = useState('');
  const { setPassword: storeSetPassword } = useDocumentStore();

  const handleSetPassword = (e) => {
    e.preventDefault();

    if (!password) {
      setError('Password cannot be empty');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    storeSetPassword(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-800">
        <h1 className="text-4xl font-bold text-center text-white mb-2">🐱 MEOW Agent</h1>
        <p className="text-center text-gray-400 mb-10">Create a password to protect your documents</p>

        <form onSubmit={handleSetPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Create Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-white outline-none transition-all"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPasswordInput(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-white focus:border-white outline-none transition-all"
              placeholder="Confirm password"
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl mt-6"
          >
            Set Password
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-8">
          Your password protects your documents and 7-day history. Store it safely.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, FileText } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden px-4 py-6">
      {/* Background Orbs */}
      <div className="bg-orb w-48 sm:w-[400px] h-48 sm:h-[400px] bg-primary-600 top-[-10%] left-[-5%]" />
      <div className="bg-orb w-40 sm:w-[350px] h-40 sm:h-[350px] bg-accent-600 bottom-[-10%] right-[-5%]" style={{ animationDelay: '-10s' }} />

      <div className="max-w-md w-full space-y-6 sm:space-y-8 relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-glow mb-4 sm:mb-6"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
            <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-surface-100">Welcome back</h2>
          <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-surface-500">Sign in to your DocTalk account</p>
        </div>

        {/* Login Form */}
        <div className="card animate-slide-up">
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-surface-300 mb-1 sm:mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-surface-600" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-surface-300 mb-1 sm:mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-surface-600" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 rounded-xl flex items-center justify-center space-x-2 font-semibold text-xs sm:text-sm text-white transition-all duration-300 disabled:opacity-40 hover:shadow-glow"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 sm:mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs">
                <span className="px-3 bg-surface-800 text-surface-500 rounded">
                  Don't have an account?
                </span>
              </div>
            </div>
            <div className="mt-4 sm:mt-5">
              <Link to="/register" className="w-full btn-secondary flex items-center justify-center text-xs sm:text-sm">
                Create new account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

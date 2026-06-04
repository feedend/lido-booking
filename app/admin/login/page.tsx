'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.user) {
        // Login riuscito, reindirizziamo alla dashboard di gestione
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Email o password errate. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Lido Control Panel
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Area riservata alla gestione dello stabilimento
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-slate-700 mx-4 sm:mx-0">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {/* Messaggio di Errore */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Indirizzo Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="admin@lidosantasevera.it"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Pulsante di Invio */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifica credenziali...' : 'Accedi al Gestionale'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

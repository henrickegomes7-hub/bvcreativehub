import React, { useState } from 'react';
import { LockKeyhole, LogIn, UserPlus } from 'lucide-react';

interface AuthViewProps {
  configured: boolean;
  adminSetupRequired: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onBootstrapAdmin: (name: string, email: string, password: string, token: string) => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({
  configured,
  adminSetupRequired,
  error,
  onLogin,
  onRegister,
  onBootstrapAdmin,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'admin'>(
    adminSetupRequired ? 'admin' : 'login',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (mode === 'admin') await onBootstrapAdmin(name, email, password, bootstrapToken);
      else if (mode === 'register') await onRegister(name, email, password);
      else await onLogin(email, password);
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : 'Não foi possível concluir o acesso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F6F8] dark:bg-[#070D1E] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E172E] border border-slate-200 dark:border-[#1F3057] shadow-xl p-8">
        <div className="w-12 h-12 rounded-xl bg-[#083181] text-white flex items-center justify-center mb-5">
          {mode === 'login' ? <LogIn /> : mode === 'admin' ? <LockKeyhole /> : <UserPlus />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">BV Creative Hub</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {mode === 'admin' ? 'Configuração inicial da conta administrativa' : mode === 'register' ? 'Crie sua conta de funcionário' : 'Entre para acompanhar suas solicitações'}
        </p>

        {!configured && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            O banco PostgreSQL ainda não está configurado. Configure <code>DATABASE_URL</code> e aplique a migração do projeto para habilitar o login.
          </div>
        )}

        {(error || submitError) && (
          <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError || error}
          </div>
        )}

        {configured && (
          <>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {(mode === 'register' || mode === 'admin') && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nome completo
                  <input required minLength={2} maxLength={150} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131F3D] px-3 py-2.5 text-sm" />
                </label>
              )}
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                E-mail
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131F3D] px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Senha (mínimo 12 caracteres)
                <input required type="password" minLength={12} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131F3D] px-3 py-2.5 text-sm" />
              </label>
              {mode === 'admin' && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Chave de configuração inicial
                  <input required type="password" autoComplete="off" value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131F3D] px-3 py-2.5 text-sm" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Definida no servidor como ADMIN_BOOTSTRAP_TOKEN; não compartilhe essa chave.</span>
                </label>
              )}
              <button disabled={isSubmitting} className="w-full rounded-lg bg-[#083181] px-4 py-3 text-sm font-semibold text-white hover:bg-[#062666] disabled:opacity-60">
                {isSubmitting ? 'Aguarde...' : mode === 'admin' ? 'Criar conta administrativa' : mode === 'register' ? 'Criar conta de funcionário' : 'Entrar'}
              </button>
            </form>

            {!adminSetupRequired && (
              <div className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
                {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
                <button className="font-semibold text-[#083181] dark:text-blue-300 hover:underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                  {mode === 'login' ? 'Cadastre-se' : 'Fazer login'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

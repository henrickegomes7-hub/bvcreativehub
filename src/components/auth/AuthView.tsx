import React, { useState } from 'react';
import { ArrowLeft, KeyRound, LockKeyhole, LogIn, Moon, Sun, UserPlus } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'admin' | 'forgot' | 'verify-code' | 'reset-password';

interface AuthViewProps {
  configured: boolean;
  adminSetupRequired: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onBootstrapAdmin: (name: string, email: string, password: string, token: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onVerifyPasswordResetCode: (email: string, code: string) => Promise<string>;
  onCompletePasswordReset: (resetToken: string, password: string) => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({
  configured,
  adminSetupRequired,
  error,
  theme,
  onToggleTheme,
  onLogin,
  onRegister,
  onBootstrapAdmin,
  onRequestPasswordReset,
  onVerifyPasswordResetCode,
  onCompletePasswordReset,
}) => {
  const [mode, setMode] = useState<AuthMode>(adminSetupRequired ? 'admin' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isRecovery = mode === 'forgot' || mode === 'verify-code' || mode === 'reset-password';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setNotice(null);
    try {
      if (mode === 'admin') {
        await onBootstrapAdmin(name, email, password, bootstrapToken);
      } else if (mode === 'register') {
        await onRegister(name, email, password);
      } else if (mode === 'login') {
        await onLogin(email, password);
      } else if (mode === 'forgot') {
        await onRequestPasswordReset(email);
        setMode('verify-code');
        setNotice('Se o e-mail estiver cadastrado, enviaremos um código de redefinição em instantes.');
      } else if (mode === 'verify-code') {
        const verifiedToken = await onVerifyPasswordResetCode(email, code);
        setResetToken(verifiedToken);
        setMode('reset-password');
      } else {
        if (password !== confirmPassword) {
          setSubmitError('As senhas não coincidem.');
          return;
        }
        await onCompletePasswordReset(resetToken, password);
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setCode('');
        setResetToken('');
        setNotice('Senha redefinida com sucesso. Faça login com sua nova senha.');
      }
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : 'Não foi possível concluir a solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setResetToken('');
  };

  const title = mode === 'forgot'
    ? 'Esqueceu a senha?'
    : mode === 'verify-code'
      ? 'Verifique seu e-mail'
      : mode === 'reset-password'
        ? 'Crie uma nova senha'
        : 'BV Creative Hub';
  const description = mode === 'admin'
    ? 'Configuração inicial da conta administrativa'
    : mode === 'register'
      ? 'Crie sua conta de colaborador'
      : mode === 'login'
        ? 'Entre para acompanhar suas solicitações'
        : mode === 'forgot'
          ? 'Informe o e-mail cadastrado para receber um código de redefinição.'
          : mode === 'verify-code'
            ? 'Digite o código de seis dígitos enviado para seu e-mail.'
            : 'Escolha uma senha nova para sua conta.';
  const fieldClassName = `mt-1 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
    theme === 'dark'
      ? 'border-white/50 bg-white text-[#083181] focus:border-white focus:ring-white/30'
      : 'border-slate-300 bg-white text-slate-900 focus:border-[#083181] focus:ring-[#083181]/20'
  }`;
  const labelClassName = `block text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`;

  return (
    <main className={`min-h-screen flex items-center justify-center px-4 py-10 transition-colors duration-200 ${theme === 'dark' ? 'bg-white' : 'bg-[#083181]'}`}>
      <section className={`relative w-full max-w-md rounded-2xl border shadow-xl p-8 transition-colors duration-200 ${
        theme === 'dark'
          ? 'border-[#3159A4] bg-[#083181] text-white'
          : 'border-slate-200 bg-white text-slate-900'
      }`}>
        <button
          type="button"
          onClick={onToggleTheme}
          className={`absolute right-5 top-5 rounded-lg p-2 transition-colors ${
            theme === 'dark'
              ? 'text-white hover:bg-white/15 hover:text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
          aria-label="Alternar tema claro e escuro"
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-white" />
            : <Moon className="h-4 w-4 text-[#083181]" />}
        </button>
        <div className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${
          theme === 'dark' ? 'bg-white text-[#083181]' : 'bg-[#083181] text-white'
        }`}>
          {isRecovery ? <KeyRound /> : mode === 'login' ? <LogIn /> : mode === 'admin' ? <LockKeyhole /> : <UserPlus />}
        </div>
        <h1 className={`text-center text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
        <p className={`mt-2 text-center text-sm ${theme === 'dark' ? 'text-white/75' : 'text-slate-500'}`}>{description}</p>

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
        {notice && (
          <div role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </div>
        )}

        {configured && (
          <>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {(mode === 'register' || mode === 'admin') && (
                <label className={labelClassName}>
                  Nome completo
                  <input required minLength={2} maxLength={150} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} />
                </label>
              )}

              {mode !== 'reset-password' && (
                <label className={labelClassName}>
                  E-mail
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    readOnly={mode === 'verify-code'}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={`${fieldClassName} ${mode === 'verify-code' ? 'opacity-75' : ''}`}
                  />
                </label>
              )}

              {mode === 'verify-code' && (
                <label className={labelClassName}>
                  Código de verificação
                  <input required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className={fieldClassName} />
                </label>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'admin' || mode === 'reset-password') && (
                <label className={labelClassName}>
                  {mode === 'reset-password' ? 'Nova senha (mínimo 12 caracteres)' : 'Senha (mínimo 12 caracteres)'}
                  <input required type="password" minLength={12} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClassName} />
                </label>
              )}

              {mode === 'reset-password' && (
                <label className={labelClassName}>
                  Confirme a nova senha
                  <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={fieldClassName} />
                </label>
              )}

              {mode === 'admin' && (
                <label className={labelClassName}>
                  Chave de configuração inicial
                  <input required type="password" autoComplete="off" value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} className={fieldClassName} />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Definida no servidor como ADMIN_BOOTSTRAP_TOKEN; não compartilhe essa chave.</span>
                </label>
              )}

              <button disabled={isSubmitting} className={`w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60 ${
                theme === 'dark'
                  ? 'bg-white text-[#083181] hover:bg-slate-100'
                  : 'bg-[#083181] text-white hover:bg-[#062666]'
              }`}>
                {isSubmitting
                  ? 'Aguarde...'
                  : mode === 'admin'
                    ? 'Criar conta administrativa'
                    : mode === 'register'
                      ? 'Criar conta de colaborador'
                      : mode === 'login'
                        ? 'Entrar'
                        : mode === 'forgot'
                          ? 'Enviar código'
                          : mode === 'verify-code'
                            ? 'Validar código'
                            : 'Redefinir senha'}
              </button>
            </form>

            {!adminSetupRequired && (
              <div className={`mt-5 space-y-3 text-center text-sm ${theme === 'dark' ? 'text-white/75' : 'text-slate-600'}`}>
                {mode === 'login' && (
                  <>
                    <button className={`block w-full font-semibold hover:underline ${theme === 'dark' ? 'text-white' : 'text-[#083181]'}`} onClick={() => changeMode('forgot')}>
                      Esqueceu a senha?
                    </button>
                    <span>
                      Ainda não tem uma conta?{' '}
                      <button className={`font-semibold hover:underline ${theme === 'dark' ? 'text-white' : 'text-[#083181]'}`} onClick={() => changeMode('register')}>Cadastre-se</button>
                    </span>
                  </>
                )}
                {mode === 'register' && (
                  <span>
                    Já tem uma conta?{' '}
                    <button className={`font-semibold hover:underline ${theme === 'dark' ? 'text-white' : 'text-[#083181]'}`} onClick={() => changeMode('login')}>Fazer login</button>
                  </span>
                )}
                {isRecovery && (
                  <button
                    className={`inline-flex items-center gap-1 font-semibold hover:underline ${theme === 'dark' ? 'text-white' : 'text-[#083181]'}`}
                    onClick={() => changeMode(mode === 'verify-code' ? 'forgot' : 'login')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {mode === 'verify-code' ? 'Usar outro e-mail' : 'Voltar para o login'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
        <nav aria-label="Informações legais" className={`mt-6 flex justify-center gap-4 text-xs ${theme === 'dark' ? 'text-white/70' : 'text-slate-500'}`}>
          <a className="hover:underline" href="/politica-de-privacidade">Política de Privacidade</a>
          <a className="hover:underline" href="/termos-de-servico">Termos de Serviço</a>
        </nav>
      </section>
    </main>
  );
};

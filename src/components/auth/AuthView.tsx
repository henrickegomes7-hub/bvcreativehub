import React, { useState } from 'react';
import { ArrowLeft, KeyRound, LockKeyhole, LogIn, UserPlus } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'admin' | 'forgot' | 'verify-code' | 'reset-password';

interface AuthViewProps {
  configured: boolean;
  adminSetupRequired: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onBootstrapAdmin: (name: string, email: string, password: string, token: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onVerifyPasswordResetCode: (email: string, code: string) => Promise<string>;
  onCompletePasswordReset: (resetToken: string, password: string) => Promise<void>;
}

const fieldClassName = 'mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131F3D] px-3 py-2.5 text-sm';
const labelClassName = 'block text-sm font-medium text-slate-700 dark:text-slate-200';

export const AuthView: React.FC<AuthViewProps> = ({
  configured,
  adminSetupRequired,
  error,
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
      ? 'Crie sua conta de funcionário'
      : mode === 'login'
        ? 'Entre para acompanhar suas solicitações'
        : mode === 'forgot'
          ? 'Informe o e-mail cadastrado para receber um código de redefinição.'
          : mode === 'verify-code'
            ? 'Digite o código de seis dígitos enviado para seu e-mail.'
            : 'Escolha uma senha nova para sua conta.';

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F6F8] dark:bg-[#070D1E] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E172E] border border-slate-200 dark:border-[#1F3057] shadow-xl p-8">
        <div className="w-12 h-12 rounded-xl bg-[#083181] text-white flex items-center justify-center mb-5">
          {isRecovery ? <KeyRound /> : mode === 'login' ? <LogIn /> : mode === 'admin' ? <LockKeyhole /> : <UserPlus />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>

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

              <button disabled={isSubmitting} className="w-full rounded-lg bg-[#083181] px-4 py-3 text-sm font-semibold text-white hover:bg-[#062666] disabled:opacity-60">
                {isSubmitting
                  ? 'Aguarde...'
                  : mode === 'admin'
                    ? 'Criar conta administrativa'
                    : mode === 'register'
                      ? 'Criar conta de funcionário'
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
              <div className="mt-5 space-y-3 text-center text-sm text-slate-600 dark:text-slate-400">
                {mode === 'login' && (
                  <>
                    <button className="block w-full font-semibold text-[#083181] dark:text-blue-300 hover:underline" onClick={() => changeMode('forgot')}>
                      Esqueceu a senha?
                    </button>
                    <span>
                      Ainda não tem uma conta?{' '}
                      <button className="font-semibold text-[#083181] dark:text-blue-300 hover:underline" onClick={() => changeMode('register')}>Cadastre-se</button>
                    </span>
                  </>
                )}
                {mode === 'register' && (
                  <span>
                    Já tem uma conta?{' '}
                    <button className="font-semibold text-[#083181] dark:text-blue-300 hover:underline" onClick={() => changeMode('login')}>Fazer login</button>
                  </span>
                )}
                {isRecovery && (
                  <button
                    className="inline-flex items-center gap-1 font-semibold text-[#083181] dark:text-blue-300 hover:underline"
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
        <nav aria-label="Informações legais" className="mt-6 flex justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <a className="hover:underline" href="/politica-de-privacidade">Política de Privacidade</a>
          <a className="hover:underline" href="/termos-de-servico">Termos de Serviço</a>
        </nav>
      </section>
    </main>
  );
};

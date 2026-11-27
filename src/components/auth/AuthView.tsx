import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Gift, KeyRound, LockKeyhole, Moon, Sun, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';

type AuthMode = 'login' | 'register' | 'invite-register' | 'admin' | 'forgot' | 'verify-code' | 'reset-password';

const backgroundMarks = [
  { left: '3%', top: '7%', rotate: '-18deg', size: 44 },
  { left: '17%', top: '11%', rotate: '14deg', size: 36 },
  { left: '32%', top: '5%', rotate: '-12deg', size: 48 },
  { left: '49%', top: '12%', rotate: '18deg', size: 38 },
  { left: '66%', top: '6%', rotate: '-15deg', size: 44 },
  { left: '83%', top: '13%', rotate: '12deg', size: 40 },
  { left: '94%', top: '4%', rotate: '-20deg', size: 34 },
  { left: '9%', top: '31%', rotate: '12deg', size: 38 },
  { left: '24%', top: '37%', rotate: '-16deg', size: 46 },
  { left: '40%', top: '29%', rotate: '20deg', size: 36 },
  { left: '58%', top: '36%', rotate: '-10deg', size: 44 },
  { left: '75%', top: '29%', rotate: '16deg', size: 38 },
  { left: '91%', top: '39%', rotate: '-14deg', size: 46 },
  { left: '2%', top: '59%', rotate: '17deg', size: 42 },
  { left: '17%', top: '68%', rotate: '-11deg', size: 36 },
  { left: '34%', top: '62%', rotate: '15deg', size: 46 },
  { left: '66%', top: '64%', rotate: '-18deg', size: 38 },
  { left: '82%', top: '60%', rotate: '12deg', size: 46 },
  { left: '96%', top: '69%', rotate: '-12deg', size: 36 },
  { left: '8%', top: '87%', rotate: '-14deg', size: 38 },
  { left: '27%', top: '91%', rotate: '16deg', size: 44 },
  { left: '48%', top: '84%', rotate: '-10deg', size: 36 },
  { left: '72%', top: '90%', rotate: '14deg', size: 44 },
  { left: '89%', top: '85%', rotate: '-17deg', size: 38 },
];

interface AuthViewProps {
  configured: boolean;
  supportEmail?: string;
  adminSetupRequired: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string, token?: string) => Promise<void>;
  onBootstrapAdmin: (name: string, email: string, password: string, token: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onVerifyPasswordResetCode: (email: string, code: string) => Promise<string>;
  onCompletePasswordReset: (resetToken: string, password: string) => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({
  configured,
  supportEmail,
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
  const [invitation] = useState(() => new URLSearchParams(location.hash.slice(1)));
  const [mode, setMode] = useState<AuthMode>(invitation.has('invitation') ? 'invite-register' : adminSetupRequired ? 'admin' : 'login');
  React.useEffect(()=>{if(invitation.has('invitation')) history.replaceState(null,'',location.pathname);},[]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(invitation.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const confirmationInput = React.useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isRecovery = mode === 'forgot' || mode === 'verify-code' || mode === 'reset-password';
  const isRegistration = mode === 'register' || mode === 'invite-register';
  const requiresConfirmation = isRegistration || mode === 'reset-password';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setNotice(null);
    if (requiresConfirmation && password !== confirmPassword) {
      setPasswordMismatch(true);
      confirmationInput.current?.focus();
      return;
    }
    setPasswordMismatch(false);
    setIsSubmitting(true);
    try {
      if (mode === 'admin') {
        await onBootstrapAdmin(name, email, password, bootstrapToken);
      } else if (isRegistration) {
        await onRegister(name, email, password, mode === 'invite-register' ? invitation.get('invitation') ?? '' : undefined);
        changeMode('login');
        setNotice('Conta criada. Entre com seu e-mail e senha.');
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
        await onCompletePasswordReset(resetToken, password);
        changeMode('login');
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
    setShowPassword(false);
    setConfirmPassword('');
    setPasswordMismatch(false);
    setCode('');
    setResetToken('');
  };

  const title = mode === 'forgot'
    ? 'Esqueceu a senha?'
    : mode === 'verify-code'
      ? 'Verifique seu e-mail'
      : mode === 'reset-password'
        ? 'Crie uma nova senha'
        : isRegistration ? 'Criar conta' : 'BV Creative Hub';
  const description = mode === 'admin'
    ? 'Configuração inicial da conta administrativa'
    : isRegistration
      ? 'Informe seu nome, e-mail e uma senha para acessar o BV Creative Hub.'
      : mode === 'login'
        ? 'Solicite materiais criativos e acompanhe prazos e aprovações em um só lugar.'
        : mode === 'forgot'
          ? 'Informe o e-mail cadastrado para receber um código de redefinição.'
          : mode === 'verify-code'
            ? 'Digite o código de seis dígitos enviado para seu e-mail.'
            : 'Escolha uma senha nova para sua conta.';
  const fieldClassName = `mt-1.5 min-h-11 w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 sm:text-sm ${
    theme === 'dark'
      ? 'border-slate-600 bg-[#0b1525] text-white focus:border-blue-400 focus:ring-blue-400/35'
      : 'border-white bg-white text-[#083181] focus:ring-sky-300'
  }`;
  const labelClassName = 'block text-sm font-semibold';
  const muted = theme === 'light' ? 'text-blue-100' : 'text-slate-300';
  const link = 'rounded font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
  const cardLink = `${link} ${theme === 'light' ? 'text-white' : 'text-blue-300'}`;

  return (
    <main className={`hub-auth relative isolate flex min-h-dvh items-center justify-center px-4 py-6 sm:py-10 ${theme === 'light' ? 'hub-auth-light bg-[#eef2f7]' : 'bg-[#070c16]'}`}>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 select-none overflow-hidden ${theme === 'light' ? 'text-[#083181]/10' : 'text-white/20'}`}>
        {backgroundMarks.map((mark, index) => (
          <span
            key={`${mark.left}-${mark.top}`}
            className="absolute"
            style={{
              left: mark.left,
              top: mark.top,
              transform: `rotate(${mark.rotate})`,
            }}
          >
            {index % 2 === 0 ? (
              <span
                className="block"
                style={{
                  width: mark.size,
                  height: mark.size,
                  backgroundColor: theme === 'light' ? '#083181' : '#FFFFFF',
                  opacity: theme === 'light' ? 0.12 : 0.2,
                  maskImage: 'url("/assets/bv-mark.png")',
                  maskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  maskSize: 'contain',
                  WebkitMaskImage: 'url("/assets/bv-mark.png")',
                  WebkitMaskPosition: 'center',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                }}
              />
            ) : (
              <Gift
                strokeWidth={1.6}
                style={{
                  width: mark.size,
                  height: mark.size,
                  color: theme === 'light' ? '#083181' : '#FFFFFF',
                  opacity: theme === 'light' ? 0.12 : 0.2,
                }}
              />
            )}
          </span>
        ))}
      </div>
      <section className={`relative w-full max-w-md rounded-2xl border p-5 shadow-xl sm:p-8 ${
        theme === 'light'
          ? 'border-[#3159a4] bg-[#083181] text-white'
          : 'border-slate-700 bg-[#101a2b] text-slate-100'
      }`}>
        <button
          type="button"
          onClick={onToggleTheme}
          className={`absolute right-4 top-4 grid size-11 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 sm:right-5 sm:top-5 ${
            theme === 'light'
              ? 'text-blue-100 hover:bg-white/15'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
          aria-label="Alternar tema claro e escuro"
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-[#e8dda5]" />
            : <Moon className="h-4 w-4" />}
        </button>
        <div aria-hidden="true" className={`mb-4 grid size-12 place-items-center ${mode === 'login' ? 'mx-auto' : 'rounded-xl bg-[#083181] text-white'}`}>
          {mode === 'login' ? <img src="/assets/bv-mark.png" alt="" width="48" height="48" className="size-12 object-contain" />
            : isRecovery ? <KeyRound /> : mode === 'admin' ? <LockKeyhole /> : <UserPlus />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{description}</p>

        {!configured && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            O serviço está temporariamente indisponível. Tente novamente em alguns minutos.</div>
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
              {(isRegistration || mode === 'admin') && (
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
                    autoComplete={mode === 'login' ? 'username' : 'email'}
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

              {(mode === 'login' || isRegistration || mode === 'admin' || mode === 'reset-password') && (
                <div>
                  <label htmlFor="auth-password" className={labelClassName}>{mode === 'reset-password' ? 'Nova senha' : 'Senha'}</label>
                  <div className="relative">
                    <input id="auth-password" required type={showPassword ? 'text' : 'password'} minLength={12} maxLength={128}
                      aria-describedby={mode === 'login' ? undefined : 'auth-password-hint'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password}
                      onChange={(event) => { setPassword(event.target.value); setPasswordMismatch(false); }} className={`${fieldClassName} pr-12`} />
                    <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword(visible => !visible)}
                      className={`absolute inset-y-0 right-0 mt-1.5 grid w-11 place-items-center rounded-r-xl focus-visible:outline-2 focus-visible:outline-blue-500 ${theme === 'light' ? 'text-[#083181]' : muted}`}>
                      {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                    </button>
                  </div>
                  {mode !== 'login' && <p id="auth-password-hint" className={`mt-1 text-xs ${muted}`}>Use pelo menos 12 caracteres.</p>}
                  {mode === 'login' && <button type="button" disabled={isSubmitting}
                    className={`mt-2 py-1 text-sm ${cardLink}`} onClick={() => changeMode('forgot')}>Esqueceu a senha?</button>}
                </div>
              )}

              {requiresConfirmation && (
                <div>
                  <label htmlFor="auth-confirm-password" className={labelClassName}>
                    {mode === 'reset-password' ? 'Confirme a nova senha' : 'Confirme a senha'}
                  </label>
                  <input ref={confirmationInput} id="auth-confirm-password" required type="password" minLength={12} maxLength={128}
                    autoComplete="new-password" value={confirmPassword} aria-invalid={passwordMismatch}
                    aria-describedby={passwordMismatch ? 'auth-confirm-password-error' : undefined}
                    onChange={(event) => { setConfirmPassword(event.target.value); setPasswordMismatch(false); }}
                    className={`${fieldClassName} aria-invalid:border-rose-400`} />
                  {passwordMismatch && <p role="alert" id="auth-confirm-password-error"
                    className="mt-1 text-xs font-medium text-rose-200">As senhas não coincidem.</p>}
                </div>
              )}

              {mode === 'admin' && (
                <label className={labelClassName}>
                  Chave de configuração inicial
                  <input required type="password" autoComplete="off" value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} className={fieldClassName} />
                  <span className={`mt-1 block text-xs font-normal ${muted}`}>Use a chave de configuração inicial fornecida pela administração.</span>
                </label>
              )}

              <Button type="submit" loading={isSubmitting}
                className={`min-h-11 w-full ${theme === 'light' ? 'bg-white! text-[#083181]! hover:bg-blue-50!' : ''}`}>
                {isSubmitting
                  ? 'Aguarde...'
                  : mode === 'admin'
                    ? 'Criar conta administrativa'
                    : isRegistration
                      ? 'Criar conta'
                      : mode === 'login'
                        ? 'Entrar'
                        : mode === 'forgot'
                          ? 'Enviar código'
                          : mode === 'verify-code'
                            ? 'Validar código'
                            : 'Redefinir senha'}
              </Button>
            </form>

            {!adminSetupRequired && (
              <div className={`mt-5 text-sm ${muted}`}>
                {mode === 'login' && (
                  <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 ${theme === 'light' ? 'bg-white text-[#083181]' : 'bg-slate-800/70'}`}>
                    <p>Ainda não tem conta?</p>
                    <button type="button" disabled={isSubmitting} onClick={() => changeMode('register')} className={`${link} ${theme === 'light' ? 'text-[#083181]' : 'text-blue-300'}`}>Criar conta</button>
                  </div>
                )}
                {isRegistration && (
                  <span>
                    Já tem uma conta?{' '}
                    <button type="button" disabled={isSubmitting} className={cardLink} onClick={() => changeMode('login')}>Fazer login</button>
                  </span>
                )}
                {isRecovery && (
                  <button
                    type="button" disabled={isSubmitting} className={`inline-flex items-center gap-1 ${cardLink}`}
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
        <nav aria-label="Informações legais" className={`mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/25 pt-4 text-xs dark:border-slate-700 ${muted}`}>
          <a className="underline-offset-4 hover:underline" href="/politica-de-privacidade">Privacidade</a>
          <a className="underline-offset-4 hover:underline" href="/termos-de-servico">Termos de serviço</a>
          {supportEmail && <a className="underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>Suporte</a>}
        </nav>
      </section>
    </main>
  );
};

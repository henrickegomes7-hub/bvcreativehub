import React, { useState } from 'react';
import { ArrowLeft, Gift, KeyRound, LockKeyhole, LogIn, Moon, Sun, UserPlus } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'admin' | 'forgot' | 'verify-code' | 'reset-password';

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
  const labelClassName = `block text-sm font-medium ${theme === 'light' ? 'text-white' : 'text-slate-700'}`;

  return (
    <main className={`relative isolate min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 transition-colors duration-200 ${theme === 'light' ? 'bg-white' : 'bg-[#083181]'}`}>
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
              <img
                src="/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png"
                alt=""
                className={`block ${theme === 'light' ? '[filter:brightness(0)_saturate(100%)_invert(14%)_sepia(47%)_saturate(2384%)_hue-rotate(198deg)_brightness(91%)_contrast(103%)]' : '[filter:brightness(0)_invert(1)]'}`}
                style={{
                  width: mark.size,
                  height: mark.size,
                  objectFit: 'contain',
                  opacity: theme === 'light' ? 0.1 : 0.2,
                }}
              />
            ) : (
              <Gift
                strokeWidth={1.6}
                style={{ width: mark.size, height: mark.size }}
              />
            )}
          </span>
        ))}
      </div>
      <section className={`relative z-10 w-full max-w-md rounded-2xl border shadow-xl p-8 transition-colors duration-200 ${
        theme === 'light'
          ? 'border-[#3159A4] bg-[#083181] text-white'
          : 'border-slate-200 bg-white text-slate-900'
      }`}>
        <button
          type="button"
          onClick={onToggleTheme}
          className={`absolute right-5 top-5 rounded-lg p-2 transition-colors ${
            theme === 'light'
              ? 'text-white hover:bg-white/15 hover:text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
          aria-label="Alternar tema claro e escuro"
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-[#083181]" />
            : <Moon className="h-4 w-4 text-white" />}
        </button>
        <div className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${
          theme === 'light' ? 'bg-white text-[#083181]' : 'bg-[#083181] text-white'
        }`}>
          {isRecovery ? <KeyRound /> : mode === 'login' ? <LogIn /> : mode === 'admin' ? <LockKeyhole /> : <UserPlus />}
        </div>
        <h1 className={`text-center text-2xl font-bold ${theme === 'light' ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
        <p className={`mt-2 text-center text-sm ${theme === 'light' ? 'text-white/75' : 'text-slate-500'}`}>{description}</p>

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
                  <span className={`mt-1 block text-xs font-normal ${theme === 'light' ? 'text-white/70' : 'text-slate-500'}`}>Definida no servidor como ADMIN_BOOTSTRAP_TOKEN; não compartilhe essa chave.</span>
                </label>
              )}

              <button disabled={isSubmitting} className={`w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60 ${
                theme === 'light'
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
              <div className={`mt-5 space-y-3 text-center text-sm ${theme === 'light' ? 'text-white/75' : 'text-slate-600'}`}>
                {mode === 'login' && (
                  <>
                    <button className={`block w-full font-semibold hover:underline ${theme === 'light' ? 'text-white' : 'text-[#083181]'}`} onClick={() => changeMode('forgot')}>
                      Esqueceu a senha?
                    </button>
                    <span>
                      Ainda não tem uma conta?{' '}
                      <button className={`font-semibold hover:underline ${theme === 'light' ? 'text-white' : 'text-[#083181]'}`} onClick={() => changeMode('register')}>Cadastre-se</button>
                    </span>
                  </>
                )}
                {mode === 'register' && (
                  <span>
                    Já tem uma conta?{' '}
                    <button className={`font-semibold hover:underline ${theme === 'light' ? 'text-white' : 'text-[#083181]'}`} onClick={() => changeMode('login')}>Fazer login</button>
                  </span>
                )}
                {isRecovery && (
                  <button
                    className={`inline-flex items-center gap-1 font-semibold hover:underline ${theme === 'light' ? 'text-white' : 'text-[#083181]'}`}
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
        <nav aria-label="Informações legais" className={`mt-6 flex justify-center gap-4 text-xs ${theme === 'light' ? 'text-white/70' : 'text-slate-500'}`}>
          <a className="hover:underline" href="/politica-de-privacidade">Política de Privacidade</a>
          <a className="hover:underline" href="/termos-de-servico">Termos de Serviço</a>
        </nav>
      </section>
    </main>
  );
};

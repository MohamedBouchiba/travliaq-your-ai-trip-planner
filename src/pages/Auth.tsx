import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, Sparkles, Send } from 'lucide-react';
import { z } from 'zod';
import Navigation from '@/components/Navigation';
import { logger, LogCategory } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

const emailSchema = z.string().email();

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Dynamic password schema with translations
  const getPasswordSchema = () => z
    .string()
    .min(8, t('auth.passwordMinLength'))
    .regex(/[a-z]/, t('auth.passwordLowercase'))
    .regex(/[A-Z]/, t('auth.passwordUppercase'))
    .regex(/[0-9]/, t('auth.passwordNumber'));

  // Rediriger si l'utilisateur est déjà connecté
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleOAuthLogin = async (provider: 'google' | 'facebook' | 'linkedin_oidc') => {
    try {
      setLoading(true);
      
      logger.info(`Tentative de connexion avec ${provider}`, {
        category: LogCategory.AUTH
      });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
      
      logger.info(`Redirection vers ${provider} OAuth`, {
        category: LogCategory.AUTH
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la connexion ${provider}`, {
        category: LogCategory.AUTH,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      toast.error(error.message || t('auth.oauthError'));
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!magicLinkEmail) {
      toast.error(t('auth.fillAllFields'));
      return;
    }

    // Validation email
    try {
      emailSchema.parse(magicLinkEmail);
    } catch (error) {
      toast.error(t('auth.invalidEmail'));
      return;
    }

    try {
      setLoading(true);
      
      logger.info('Envoi de Magic Link', {
        category: LogCategory.AUTH
      });
      
      const { error } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
      
      logger.info('Magic Link envoyé avec succès', {
        category: LogCategory.AUTH
      });
      
      setMagicLinkSent(true);
      toast.success(t('auth.magicLinkSent'));
    } catch (error: any) {
      logger.error('Erreur lors de l\'envoi du Magic Link', {
        category: LogCategory.AUTH,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      toast.error(error.message || t('auth.magicLinkError'));
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    try {
      getPasswordSchema().parse(pwd);
      setPasswordErrors([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map(e => e.message);
        setPasswordErrors(msgs);
        return false;
      }
      return false;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error(t('auth.fillAllFields'));
      return;
    }

    // Validation email
    try {
      emailSchema.parse(email);
    } catch (error) {
      logger.warn('Email invalide lors de la tentative d\'authentification', {
        category: LogCategory.AUTH,
        metadata: { isLogin }
      });
      toast.error(t('auth.invalidEmail'));
      return;
    }

    // Validation mot de passe pour l'inscription
    if (!isLogin && !validatePassword(password)) {
      logger.warn('Mot de passe invalide lors de l\'inscription', {
        category: LogCategory.AUTH
      });
      toast.error(t('auth.passwordCriteria'));
      return;
    }

    try {
      setLoading(true);
      
      if (isLogin) {
        logger.info('Tentative de connexion par email', {
          category: LogCategory.AUTH
        });
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        
        if (error) {
          console.error('Erreur de connexion:', error);
          
          logger.error('Échec de connexion', {
            category: LogCategory.AUTH,
            error,
            metadata: { errorMessage: error.message }
          });
          
          if (error.message.includes('Invalid login credentials')) {
            throw new Error(t('auth.invalidCredentials'));
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error(t('auth.emailNotConfirmed'));
          }
          throw error;
        }
        
        if (!data.session) {
          logger.error('Session manquante après connexion', {
            category: LogCategory.AUTH
          });
          throw new Error(t('auth.sessionError'));
        }
        
        logger.info('Connexion réussie par email', {
          category: LogCategory.AUTH,
          metadata: { userId: data.user?.id }
        });
        
        toast.success(t('auth.loginSuccess'));
        navigate('/');
      } else {
        logger.info('Tentative d\'inscription par email', {
          category: LogCategory.AUTH
        });
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        
        if (error) {
          console.error('Erreur d\'inscription:', error);
          
          logger.error('Échec d\'inscription', {
            category: LogCategory.AUTH,
            error,
            metadata: { errorMessage: error.message }
          });
          
          if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            throw new Error(t('auth.emailAlreadyUsed'));
          }
          throw error;
        }
        
        // Vérifier si la confirmation email est requise
        if (data.user && !data.session) {
          logger.info('Inscription réussie - Confirmation email requise', {
            category: LogCategory.AUTH,
            metadata: { userId: data.user.id }
          });
          
          toast.success(t('auth.signupSuccess'), {
            duration: 6000,
          });
        } else if (data.session) {
          logger.info('Inscription réussie avec connexion automatique', {
            category: LogCategory.AUTH,
            metadata: { userId: data.user?.id }
          });
          
          toast.success(t('auth.signupAutoLogin'));
          navigate('/');
        }
      }
    } catch (error: any) {
      logger.error(`Erreur lors de ${isLogin ? 'la connexion' : "l'inscription"}`, {
        category: LogCategory.AUTH,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      toast.error(error.message || (isLogin ? t('auth.loginError') : t('auth.signupError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-travliaq-deep-blue via-travliaq-deep-blue/95 to-travliaq-turquoise/20 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10">
            {/* Header with welcome message */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-travliaq-turquoise/20 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-travliaq-turquoise" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {t('auth.welcome')}
              </h1>
              <p className="text-white/70 text-lg">
                {t('auth.subtitle')}
              </p>
            </div>

            <div className="space-y-3">
              {/* Google Sign-in - Primary option */}
              <Button
                type="button"
                size="lg"
                className="w-full bg-white hover:bg-white/90 text-travliaq-deep-blue border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span className="font-medium">{t('auth.continueWithGoogle')}</span>
              </Button>

              {/* LinkedIn Sign-in */}
              <Button
                type="button"
                size="lg"
                className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 h-12"
                onClick={() => handleOAuthLogin('linkedin_oidc')}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                )}
                <span className="font-medium">{t('auth.continueWithLinkedIn')}</span>
              </Button>

              {/* Facebook Sign-in */}
              <Button
                type="button"
                size="lg"
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 h-12"
                onClick={() => handleOAuthLogin('facebook')}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span className="font-medium">{t('auth.continueWithFacebook')}</span>
              </Button>

              {/* Magic Link toggle */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMagicLink(!showMagicLink);
                      setShowEmailForm(false);
                      setMagicLinkSent(false);
                    }}
                    className="bg-travliaq-deep-blue px-4 py-1 text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {showMagicLink ? t('auth.hideMagicLink') : t('auth.useMagicLink')}
                  </button>
                </div>
              </div>

              {/* Magic Link form */}
              {showMagicLink && (
                <div className="space-y-3 animate-fade-in">
                  <div className="bg-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2 pb-2">
                      <div className="h-px bg-white/20 flex-1" />
                      <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        {t('auth.magicLinkTitle')}
                      </span>
                      <div className="h-px bg-white/20 flex-1" />
                    </div>

                    {!magicLinkSent ? (
                      <form onSubmit={handleMagicLinkSend} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="magic-email" className="text-white text-sm">
                            {t('auth.email')}
                          </Label>
                          <Input
                            id="magic-email"
                            type="email"
                            placeholder={t('auth.emailPlaceholder')}
                            value={magicLinkEmail}
                            onChange={(e) => setMagicLinkEmail(e.target.value)}
                            className="bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-travliaq-turquoise h-11"
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full bg-travliaq-turquoise hover:bg-travliaq-turquoise/90 text-white h-11 font-medium"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          {t('auth.sendMagicLink')}
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-2">
                          <Mail className="w-6 h-6 text-green-400" />
                        </div>
                        <p className="text-white text-sm">
                          {t('auth.magicLinkSentMessage')}
                        </p>
                        <p className="text-white/60 text-xs">
                          {magicLinkEmail}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMagicLinkSent(false);
                            setMagicLinkEmail('');
                          }}
                          className="text-travliaq-turquoise hover:text-travliaq-turquoise/80"
                        >
                          {t('auth.sendAnotherLink')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Divider with email option toggle */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(!showEmailForm)}
                    className="bg-travliaq-deep-blue px-4 py-1 text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {showEmailForm ? t('auth.hideEmailOption') : t('auth.useEmail')}
                  </button>
                </div>
              </div>

              {/* Email/Password form - Collapsible secondary option */}
              {showEmailForm && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2 pb-2">
                      <div className="h-px bg-white/20 flex-1" />
                      <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
                        {isLogin ? t('auth.loginWithEmail') : t('auth.signupWithEmail')}
                      </span>
                      <div className="h-px bg-white/20 flex-1" />
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white text-sm">
                          {t('auth.email')}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('auth.emailPlaceholder')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-travliaq-turquoise h-11"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white text-sm">
                          {t('auth.password')}
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (!isLogin) {
                                validatePassword(e.target.value);
                              }
                            }}
                            className="bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-travliaq-turquoise pr-10 h-11"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        
                        {!isLogin && passwordErrors.length > 0 && (
                          <ul className="text-xs text-red-300 space-y-1 mt-2 bg-red-900/20 rounded-lg p-3">
                            {passwordErrors.map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                          </ul>
                        )}
                        
                        {!isLogin && password && passwordErrors.length === 0 && (
                          <p className="text-xs text-green-300 mt-2 flex items-center gap-1">
                            <span className="text-green-400">✓</span> {t('auth.passwordSecure')}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-travliaq-turquoise hover:bg-travliaq-turquoise/90 text-white h-11 font-medium"
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {isLogin ? t('auth.login') : t('auth.signup')}
                      </Button>
                    </form>

                    {isLogin && (
                      <div className="text-center pt-2">
                        <Link
                          to="/forgot-password"
                          className="text-white/70 hover:text-travliaq-turquoise text-sm transition-colors"
                        >
                          {t('auth.forgotPassword')}
                        </Link>
                      </div>
                    )}

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setPasswordErrors([]);
                          setPassword('');
                        }}
                        className="text-white/70 hover:text-white text-sm transition-colors"
                      >
                        {isLogin ? (
                          <>
                            {t('auth.noAccount')}{' '}
                            <span className="font-semibold text-travliaq-turquoise">{t('auth.signupLink')}</span>
                          </>
                        ) : (
                          <>
                            {t('auth.hasAccount')}{' '}
                            <span className="font-semibold text-travliaq-turquoise">{t('auth.loginLink')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer note */}
            <p className="text-center text-white/50 text-xs mt-6">
              {t('auth.footerNote')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
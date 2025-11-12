import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import Navigation from '@/components/Navigation';
import { logger, LogCategory } from '@/utils/logger';

const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

const emailSchema = z.string().email('Email invalide');

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Rediriger si l'utilisateur est déjà connecté
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      
      logger.info('Tentative de connexion avec Google', {
        category: LogCategory.AUTH
      });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
      
      logger.info('Redirection vers Google OAuth', {
        category: LogCategory.AUTH
      });
    } catch (error: any) {
      logger.error('Erreur lors de la connexion Google', {
        category: LogCategory.AUTH,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      toast.error(error.message || 'Erreur lors de la connexion avec Google');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    try {
      passwordSchema.parse(pwd);
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
      toast.error('Veuillez remplir tous les champs');
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
      toast.error('Adresse email invalide');
      return;
    }

    // Validation mot de passe pour l'inscription
    if (!isLogin && !validatePassword(password)) {
      logger.warn('Mot de passe invalide lors de l\'inscription', {
        category: LogCategory.AUTH
      });
      toast.error('Le mot de passe ne respecte pas les critères de sécurité');
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
            throw new Error('Email ou mot de passe incorrect. Vérifiez que vous avez bien confirmé votre email si vous venez de vous inscrire.');
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail.');
          }
          throw error;
        }
        
        if (!data.session) {
          logger.error('Session manquante après connexion', {
            category: LogCategory.AUTH
          });
          throw new Error('Erreur de session. Veuillez réessayer.');
        }
        
        logger.info('Connexion réussie par email', {
          category: LogCategory.AUTH,
          metadata: { userId: data.user?.id }
        });
        
        toast.success('Connexion réussie');
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
            throw new Error('Cette adresse email est déjà utilisée. Si vous vous êtes inscrit avec Google, veuillez vous connecter avec Google.');
          }
          throw error;
        }
        
        // Vérifier si la confirmation email est requise
        if (data.user && !data.session) {
          logger.info('Inscription réussie - Confirmation email requise', {
            category: LogCategory.AUTH,
            metadata: { userId: data.user.id }
          });
          
          toast.success('Inscription réussie ! Vérifiez votre email pour confirmer votre compte avant de vous connecter.', {
            duration: 6000,
          });
        } else if (data.session) {
          logger.info('Inscription réussie avec connexion automatique', {
            category: LogCategory.AUTH,
            metadata: { userId: data.user?.id }
          });
          
          toast.success('Inscription réussie ! Connexion automatique...');
          navigate('/');
        }
      }
    } catch (error: any) {
      logger.error(`Erreur lors de ${isLogin ? 'la connexion' : "l'inscription"}`, {
        category: LogCategory.AUTH,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      toast.error(error.message || `Erreur lors de ${isLogin ? 'la connexion' : "l'inscription"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-travliaq-deep-blue via-travliaq-deep-blue/95 to-travliaq-turquoise/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Connexion' : 'Inscription'}
            </h1>
            <p className="text-white/80">
              {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
            </p>
          </div>

          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white hover:bg-white/90 text-travliaq-deep-blue border-0"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
              Continuer avec Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-travliaq-deep-blue px-2 text-white/60">Ou</span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Mot de passe
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
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {!isLogin && passwordErrors.length > 0 && (
                  <ul className="text-xs text-red-300 space-y-1 mt-2">
                    {passwordErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                )}
                
                {!isLogin && password && passwordErrors.length === 0 && (
                  <p className="text-xs text-green-300 mt-2">✓ Mot de passe sécurisé</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-travliaq-turquoise hover:bg-travliaq-turquoise/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLogin ? 'Se connecter' : "S'inscrire"}
              </Button>
            </form>

            {isLogin && (
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-white/80 hover:text-travliaq-turquoise text-sm transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPasswordErrors([]);
                  setPassword('');
                }}
                className="text-white/80 hover:text-white text-sm transition-colors"
              >
                {isLogin ? (
                  <>
                    Pas encore de compte ?{' '}
                    <span className="font-semibold text-travliaq-turquoise">S'inscrire</span>
                  </>
                ) : (
                  <>
                    Déjà un compte ?{' '}
                    <span className="font-semibold text-travliaq-turquoise">Se connecter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Auth;
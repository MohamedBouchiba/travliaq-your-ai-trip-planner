import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger, LogCategory, setUser as setSentryUser } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Logger les événements d'authentification
        if (event === 'SIGNED_IN' && session?.user) {
          logger.info('Utilisateur connecté', {
            category: LogCategory.AUTH,
            metadata: {
              userId: session.user.id,
              email: session.user.email,
              provider: session.user.app_metadata?.provider
            }
          });
          setSentryUser(session.user.id, session.user.email);
        } else if (event === 'SIGNED_OUT') {
          logger.info('Utilisateur déconnecté', {
            category: LogCategory.AUTH
          });
          setSentryUser(); // Clear user
        } else if (event === 'USER_UPDATED') {
          logger.info('Profil utilisateur mis à jour', {
            category: LogCategory.AUTH,
            metadata: { userId: session?.user?.id }
          });
        } else if (event === 'TOKEN_REFRESHED') {
          logger.debug('Token rafraîchi', {
            category: LogCategory.AUTH
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setSentryUser(session.user.id, session.user.email);
      }
    }).catch((error) => {
      logger.error('Erreur lors de la récupération de la session', {
        category: LogCategory.AUTH,
        error
      });
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      logger.debug('Tentative de déconnexion', { category: LogCategory.AUTH });
      
      const { error } = await supabase.auth.signOut();
      // Ignorer l'erreur "session_not_found" car l'utilisateur est déjà déconnecté
      if (error && !error.message?.includes('session_not_found')) {
        throw error;
      }
      
      logger.info('Déconnexion réussie', { category: LogCategory.AUTH });
      toast.success('Déconnexion réussie');
    } catch (error) {
      logger.error('Erreur lors de la déconnexion', {
        category: LogCategory.AUTH,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      if (import.meta.env.DEV) {
        console.error('Sign out error:', error);
      }
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

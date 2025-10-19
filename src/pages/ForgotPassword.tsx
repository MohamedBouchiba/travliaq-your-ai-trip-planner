import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import Navigation from '@/components/Navigation';

const emailSchema = z.string().email('Email invalide');

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Veuillez entrer votre adresse email');
      return;
    }

    try {
      emailSchema.parse(email);
    } catch (error) {
      toast.error('Adresse email invalide');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setEmailSent(true);
      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-travliaq-deep-blue via-travliaq-deep-blue/95 to-travliaq-turquoise/20">
      <Navigation variant="minimal" />
      
      <div className="flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <Link 
              to="/auth" 
              className="inline-flex items-center text-white/80 hover:text-white text-sm transition-colors mb-4"
            >
              <ArrowLeft size={16} className="mr-2" />
              Retour à la connexion
            </Link>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Mot de passe oublié ?
            </h1>
            <p className="text-white/80">
              Entrez votre adresse email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
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

              <Button
                type="submit"
                className="w-full bg-travliaq-turquoise hover:bg-travliaq-turquoise/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Envoyer le lien de réinitialisation
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                <p className="text-white">
                  Un email a été envoyé à <strong>{email}</strong>
                </p>
                <p className="text-white/80 text-sm mt-2">
                  Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe.
                </p>
              </div>
              
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="text-travliaq-turquoise hover:text-travliaq-turquoise/80 text-sm transition-colors"
              >
                Renvoyer l'email
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

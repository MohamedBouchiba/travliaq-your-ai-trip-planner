import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoogleLoginPopupProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const GoogleLoginPopup = ({ onClose, onSuccess }: GoogleLoginPopupProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        toast.error('Erreur de connexion: ' + error.message);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 pb-24 animate-fade-in">
      <Card className="max-w-md w-full bg-white p-8 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fermer"
        >
          <X size={24} />
        </button>

        <div className="text-center space-y-6">
          <div className="text-6xl">✨</div>
          
          <h2 className="text-2xl font-bold text-travliaq-deep-blue">
            Merci pour votre confiance !
          </h2>
          
          <p className="text-gray-600 leading-relaxed">
            Vous souhaitez rester en contact facilement et recevoir des mises à jour sur votre voyage ?
          </p>

          <div className="space-y-3 pt-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold py-6 text-base shadow-sm"
              size="lg"
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? "Connexion..." : "Continuer avec Google"}
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-700"
              size="lg"
            >
              Non merci, peut-être plus tard
            </Button>
          </div>

          <p className="text-xs text-gray-400 pt-2">
            Vous pourrez toujours vous connecter plus tard depuis votre email
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GoogleLoginPopup;
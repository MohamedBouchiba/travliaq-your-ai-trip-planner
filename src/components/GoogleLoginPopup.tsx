import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Chrome } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoogleLoginPopupProps {
  onClose: () => void;
}

const GoogleLoginPopup = ({ onClose }: GoogleLoginPopupProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error('Erreur de connexion: ' + error.message);
      }
    } catch (error) {
      toast.error('Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-up">
      <Card className="w-80 shadow-adventure border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Chrome className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Connexion rapide</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Connectez-vous avec Google pour une expérience personnalisée
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            size="lg"
          >
            <Chrome className="w-5 h-5 mr-2" />
            {isLoading ? "Connexion..." : "Se connecter avec Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleLoginPopup;
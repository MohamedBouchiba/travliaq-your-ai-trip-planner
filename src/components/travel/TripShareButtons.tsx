import { Button } from "@/components/ui/button";
import { Share2, Facebook, Send, MessageCircle, Instagram, Copy } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { FaXTwitter } from "react-icons/fa6";

type TripShareButtonsProps = {
  title: string;
  destination: string;
  totalDays: number;
  url?: string;
};

export const TripShareButtons = ({ 
  title, 
  destination, 
  totalDays,
  url = window.location.href 
}: TripShareButtonsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const shareText = `Découvrez mon itinéraire de ${totalDays} jours à ${destination} ! 🌍✨`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
    setIsOpen(false);
    toast({
      title: "Partage en cours",
      description: `Ouverture de ${platform}...`,
    });
  };

  const handleInstagramShare = async () => {
    // Instagram ne supporte pas le partage direct via URL
    // On utilise l'API Web Share si disponible, sinon on copie le lien
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: url,
        });
        toast({
          title: "Partagé !",
          description: "Itinéraire partagé avec succès",
        });
      } catch (err) {
        console.log("Partage annulé");
      }
    } else {
      // Copier le lien dans le presse-papier
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      toast({
        title: "Lien copié !",
        description: "Collez-le dans votre story Instagram",
      });
    }
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié !",
      description: "Vous pouvez maintenant le partager",
    });
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="xl"
          className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          <Share2 className="mr-2 h-5 w-5" />
          Partager cet itinéraire
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-travliaq-deep-blue/95 backdrop-blur-md border-travliaq-turquoise/30 shadow-glow z-[100]"
      >
        <DropdownMenuItem 
          onClick={() => handleShare("twitter")}
          className="text-white hover:bg-travliaq-turquoise/20 hover:text-travliaq-turquoise focus:bg-travliaq-turquoise/20 focus:text-travliaq-turquoise cursor-pointer py-3 px-4 font-inter transition-all duration-200"
        >
          <FaXTwitter className="h-5 w-5 mr-3" />
          <span className="font-medium">X (Twitter)</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare("facebook")}
          className="text-white hover:bg-travliaq-turquoise/20 hover:text-travliaq-turquoise focus:bg-travliaq-turquoise/20 focus:text-travliaq-turquoise cursor-pointer py-3 px-4 font-inter transition-all duration-200"
        >
          <Facebook className="h-5 w-5 mr-3" />
          <span className="font-medium">Facebook</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare("whatsapp")}
          className="text-white hover:bg-travliaq-turquoise/20 hover:text-travliaq-turquoise focus:bg-travliaq-turquoise/20 focus:text-travliaq-turquoise cursor-pointer py-3 px-4 font-inter transition-all duration-200"
        >
          <MessageCircle className="h-5 w-5 mr-3" />
          <span className="font-medium">WhatsApp</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleShare("telegram")}
          className="text-white hover:bg-travliaq-turquoise/20 hover:text-travliaq-turquoise focus:bg-travliaq-turquoise/20 focus:text-travliaq-turquoise cursor-pointer py-3 px-4 font-inter transition-all duration-200"
        >
          <Send className="h-5 w-5 mr-3" />
          <span className="font-medium">Telegram</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleInstagramShare}
          className="text-white hover:bg-travliaq-golden-sand/20 hover:text-travliaq-golden-sand focus:bg-travliaq-golden-sand/20 focus:text-travliaq-golden-sand cursor-pointer py-3 px-4 font-inter transition-all duration-200"
        >
          <Instagram className="h-5 w-5 mr-3" />
          <span className="font-medium">Instagram</span>
        </DropdownMenuItem>
        <div className="h-px bg-white/10 my-1" />
        <DropdownMenuItem 
          onClick={handleCopyLink}
          className="text-travliaq-golden-sand hover:bg-travliaq-golden-sand/20 focus:bg-travliaq-golden-sand/20 cursor-pointer py-3 px-4 font-inter transition-all duration-200"
        >
          <Copy className="h-5 w-5 mr-3" />
          <span className="font-medium">Copier le lien</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

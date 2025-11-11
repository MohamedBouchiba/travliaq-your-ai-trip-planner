import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  MapPin, 
  Users, 
  Wallet, 
  Palmtree, 
  Calendar as CalendarIcon, 
  Bed, 
  Plane, 
  ChevronLeft,
  Mail,
  User,
  Loader2,
  Info,
  Trash2,
  AlertTriangle
} from "lucide-react";
import confetti from 'canvas-confetti';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import GoogleLoginPopup from "@/components/GoogleLoginPopup";
import Navigation from "@/components/Navigation";
import { z } from "zod";
import { TRAVEL_GROUPS, YES_NO, DATES_TYPE, HELP_WITH, normalizeTravelGroup, normalizeYesNo, normalizeDatesType, normalizeHelpWithArray } from "@/lib/questionnaireValues";
import DateRangePicker from "@/components/DateRangePicker";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfToday, addMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { SecurityStep } from "@/components/questionnaire/SecurityStep";
import { RhythmStep } from "@/components/questionnaire/RhythmStep";
import { TravelersStep } from "@/components/questionnaire/TravelersStep";
import { CitySearch } from "@/components/questionnaire/CitySearch";
import { ReviewStep } from "@/components/questionnaire/ReviewStep";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type LuggageChoice = {
  [travelerIndex: number]: string;
};

interface Traveler {
  type: 'adult' | 'child';
  age?: number;
}

type Answer = {
  travelGroup?: string;
  numberOfTravelers?: number;
  travelers?: Traveler[]; // Nouveau système de voyageurs
  children?: Array<{ age: number }>; // Ancien système - pour compatibilité
  hasDestination?: string;
  helpWith?: string[]; // Comment Travliaq peut aider (vols, hébergement, activités)
  destination?: string;
  departureLocation?: string;
  climatePreference?: string[];
  travelAffinities?: string[];
  travelAmbiance?: string;
  datesType?: string;
  departureDate?: string;
  returnDate?: string;
  flexibility?: string;
  hasApproximateDepartureDate?: string; // "Oui" ou "Non"
  approximateDepartureDate?: string; // Date approximative si "Oui"
  duration?: string;
  exactNights?: number;
  budgetPerPerson?: string;
  budgetType?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  styles?: string[];
  rhythm?: string; // Nouveau: relaxed | balanced | intense
  schedulePrefs?: string[]; // Nouveau: early_bird, night_owl, etc.
  flightPreference?: string;
  luggage?: LuggageChoice;
  mobility?: string[];
  accommodationType?: string[];
  hotelPreferences?: string[]; // Nouveau: all_inclusive, half_board, etc.
  comfort?: string;
  neighborhood?: string;
  amenities?: string[];
  security?: string[]; // Contraintes de sécurité et phobies
  constraints?: string[];
  additionalInfo?: string;
  email?: string;
};

const majorCities = [
  // Europe - France
  "Paris, France 🇫🇷", "Lyon, France 🇫🇷", "Marseille, France 🇫🇷", "Toulouse, France 🇫🇷", "Nice, France 🇫🇷", 
  "Nantes, France 🇫🇷", "Strasbourg, France 🇫🇷", "Montpellier, France 🇫🇷", "Bordeaux, France 🇫🇷", "Lille, France 🇫🇷",
  
  // Royaume-Uni
  "Londres, Royaume-Uni 🇬🇧", "Manchester, Royaume-Uni 🇬🇧", "Birmingham, Royaume-Uni 🇬🇧", "Liverpool, Royaume-Uni 🇬🇧", 
  "Leeds, Royaume-Uni 🇬🇧", "Newcastle, Royaume-Uni 🇬🇧", "Sheffield, Royaume-Uni 🇬🇧", "Bristol, Royaume-Uni 🇬🇧",
  "Édimbourg, Écosse 🇬🇧", "Glasgow, Écosse 🇬🇧", "Cardiff, Pays de Galles 🇬🇧", "Belfast, Irlande du Nord 🇬🇧",
  
  // Italie
  "Rome, Italie 🇮🇹", "Milan, Italie 🇮🇹", "Naples, Italie 🇮🇹", "Turin, Italie 🇮🇹", "Palerme, Italie 🇮🇹",
  "Gênes, Italie 🇮🇹", "Bologne, Italie 🇮🇹", "Florence, Italie 🇮🇹", "Venise, Italie 🇮🇹", "Vérone, Italie 🇮🇹",
  
  // Espagne
  "Madrid, Espagne 🇪🇸", "Barcelone, Espagne 🇪🇸", "Valence, Espagne 🇪🇸", "Séville, Espagne 🇪🇸", "Saragosse, Espagne 🇪🇸",
  "Malaga, Espagne 🇪🇸", "Murcie, Espagne 🇪🇸", "Palma de Majorque, Espagne 🇪🇸", "Bilbao, Espagne 🇪🇸", "Grenade, Espagne 🇪🇸",
  
  // Portugal
  "Lisbonne, Portugal 🇵🇹", "Porto, Portugal 🇵🇹", "Braga, Portugal 🇵🇹", "Coimbra, Portugal 🇵🇹", "Faro, Portugal 🇵🇹",
  
  // Allemagne
  "Berlin, Allemagne 🇩🇪", "Hambourg, Allemagne 🇩🇪", "Munich, Allemagne 🇩🇪", "Cologne, Allemagne 🇩🇪", "Francfort, Allemagne 🇩🇪",
  "Stuttgart, Allemagne 🇩🇪", "Düsseldorf, Allemagne 🇩🇪", "Dortmund, Allemagne 🇩🇪", "Essen, Allemagne 🇩🇪", "Leipzig, Allemagne 🇩🇪",
  
  // Pays-Bas
  "Amsterdam, Pays-Bas 🇳🇱", "Rotterdam, Pays-Bas 🇳🇱", "La Haye, Pays-Bas 🇳🇱", "Utrecht, Pays-Bas 🇳🇱", "Eindhoven, Pays-Bas 🇳🇱",
  
  // Belgique
  "Bruxelles, Belgique 🇧🇪", "Anvers, Belgique 🇧🇪", "Gand, Belgique 🇧🇪", "Charleroi, Belgique 🇧🇪", "Liège, Belgique 🇧🇪", "Bruges, Belgique 🇧🇪",
  
  // Suisse
  "Zurich, Suisse 🇨🇭", "Genève, Suisse 🇨🇭", "Bâle, Suisse 🇨🇭", "Lausanne, Suisse 🇨🇭", "Berne, Suisse 🇨🇭",
  
  // Autriche
  "Vienne, Autriche 🇦🇹", "Graz, Autriche 🇦🇹", "Linz, Autriche 🇦🇹", "Salzbourg, Autriche 🇦🇹", "Innsbruck, Autriche 🇦🇹",
  
  // Autres Europe
  "Prague, Tchéquie 🇨🇿", "Brno, Tchéquie 🇨🇿", "Ostrava, Tchéquie 🇨🇿",
  "Budapest, Hongrie 🇭🇺", "Debrecen, Hongrie 🇭🇺", "Szeged, Hongrie 🇭🇺",
  "Varsovie, Pologne 🇵🇱", "Cracovie, Pologne 🇵🇱", "Łódź, Pologne 🇵🇱", "Wrocław, Pologne 🇵🇱", "Poznań, Pologne 🇵🇱",
  "Athènes, Grèce 🇬🇷", "Thessalonique, Grèce 🇬🇷", "Patras, Grèce 🇬🇷", "Santorin, Grèce 🇬🇷", "Mykonos, Grèce 🇬🇷",
  "Istanbul, Turquie 🇹🇷", "Ankara, Turquie 🇹🇷", "Izmir, Turquie 🇹🇷", "Bursa, Turquie 🇹🇷", "Antalya, Turquie 🇹🇷", "Cappadoce, Turquie 🇹🇷",
  "Copenhague, Danemark 🇩🇰", "Aarhus, Danemark 🇩🇰", "Odense, Danemark 🇩🇰",
  "Stockholm, Suède 🇸🇪", "Göteborg, Suède 🇸🇪", "Malmö, Suède 🇸🇪",
  "Oslo, Norvège 🇳🇴", "Bergen, Norvège 🇳🇴", "Trondheim, Norvège 🇳🇴",
  "Helsinki, Finlande 🇫🇮", "Espoo, Finlande 🇫🇮", "Tampere, Finlande 🇫🇮",
  "Reykjavik, Islande 🇮🇸", "Dublin, Irlande 🇮🇪", "Cork, Irlande 🇮🇪",
  "Tallinn, Estonie 🇪🇪", "Riga, Lettonie 🇱🇻", "Vilnius, Lituanie 🇱🇹",
  "Dubrovnik, Croatie 🇭🇷", "Split, Croatie 🇭🇷", "Zagreb, Croatie 🇭🇷", "Rijeka, Croatie 🇭🇷",
  "Belgrade, Serbie 🇷🇸", "Novi Sad, Serbie 🇷🇸",
  "Bucarest, Roumanie 🇷🇴", "Cluj-Napoca, Roumanie 🇷🇴", "Timișoara, Roumanie 🇷🇴",
  "Sofia, Bulgarie 🇧🇬", "Plovdiv, Bulgarie 🇧🇬", "Varna, Bulgarie 🇧🇬",
  
  // Asie - Japon
  "Tokyo, Japon 🇯🇵", "Yokohama, Japon 🇯🇵", "Osaka, Japon 🇯🇵", "Nagoya, Japon 🇯🇵", "Sapporo, Japon 🇯🇵",
  "Fukuoka, Japon 🇯🇵", "Kobe, Japon 🇯🇵", "Kyoto, Japon 🇯🇵", "Hiroshima, Japon 🇯🇵", "Nara, Japon 🇯🇵",
  
  // Chine
  "Shanghai, Chine 🇨🇳", "Pékin, Chine 🇨🇳", "Guangzhou, Chine 🇨🇳", "Shenzhen, Chine 🇨🇳", "Chengdu, Chine 🇨🇳",
  "Chongqing, Chine 🇨🇳", "Tianjin, Chine 🇨🇳", "Wuhan, Chine 🇨🇳", "Xi'an, Chine 🇨🇳", "Hangzhou, Chine 🇨🇳",
  "Hong Kong 🇭🇰", "Macao 🇲🇴",
  
  // Corée du Sud
  "Séoul, Corée du Sud 🇰🇷", "Busan, Corée du Sud 🇰🇷", "Incheon, Corée du Sud 🇰🇷", "Daegu, Corée du Sud 🇰🇷", "Daejeon, Corée du Sud 🇰🇷",
  
  // Thaïlande
  "Bangkok, Thaïlande 🇹🇭", "Chiang Mai, Thaïlande 🇹🇭", "Phuket, Thaïlande 🇹🇭", "Pattaya, Thaïlande 🇹🇭", "Koh Samui, Thaïlande 🇹🇭",
  "Krabi, Thaïlande 🇹🇭", "Hua Hin, Thaïlande 🇹🇭",
  
  // Singapour & Malaisie
  "Singapour 🇸🇬",
  "Kuala Lumpur, Malaisie 🇲🇾", "George Town, Malaisie 🇲🇾", "Ipoh, Malaisie 🇲🇾", "Johor Bahru, Malaisie 🇲🇾", "Langkawi, Malaisie 🇲🇾",
  
  // Indonésie
  "Jakarta, Indonésie 🇮🇩", "Surabaya, Indonésie 🇮🇩", "Bandung, Indonésie 🇮🇩", "Medan, Indonésie 🇮🇩", "Bali, Indonésie 🇮🇩",
  "Yogyakarta, Indonésie 🇮🇩", "Semarang, Indonésie 🇮🇩",
  
  // Vietnam
  "Hô Chi Minh, Vietnam 🇻🇳", "Hanoi, Vietnam 🇻🇳", "Da Nang, Vietnam 🇻🇳", "Haiphong, Vietnam 🇻🇳", "Hoi An, Vietnam 🇻🇳",
  "Hue, Vietnam 🇻🇳", "Nha Trang, Vietnam 🇻🇳",
  
  // Philippines
  "Manille, Philippines 🇵🇭", "Quezon City, Philippines 🇵🇭", "Davao, Philippines 🇵🇭", "Cebu, Philippines 🇵🇭", "Boracay, Philippines 🇵🇭",
  
  // Autres Asie
  "Phnom Penh, Cambodge 🇰🇭", "Siem Reap, Cambodge 🇰🇭", "Sihanoukville, Cambodge 🇰🇭",
  "Vientiane, Laos 🇱🇦", "Luang Prabang, Laos 🇱🇦",
  "Yangon, Myanmar 🇲🇲", "Mandalay, Myanmar 🇲🇲", "Bagan, Myanmar 🇲🇲",
  
  // Inde
  "Mumbai, Inde 🇮🇳", "Delhi, Inde 🇮🇳", "Bangalore, Inde 🇮🇳", "Hyderabad, Inde 🇮🇳", "Chennai, Inde 🇮🇳",
  "Kolkata, Inde 🇮🇳", "Pune, Inde 🇮🇳", "Jaipur, Inde 🇮🇳", "Agra, Inde 🇮🇳", "Goa, Inde 🇮🇳",
  
  // Pakistan
  "Karachi, Pakistan 🇵🇰", "Lahore, Pakistan 🇵🇰", "Islamabad, Pakistan 🇵🇰", "Rawalpindi, Pakistan 🇵🇰", "Faisalabad, Pakistan 🇵🇰",
  
  // Autres Asie du Sud
  "Katmandou, Népal 🇳🇵", "Pokhara, Népal 🇳🇵", "Lalitpur, Népal 🇳🇵",
  "Colombo, Sri Lanka 🇱🇰", "Kandy, Sri Lanka 🇱🇰", "Galle, Sri Lanka 🇱🇰",
  "Dhaka, Bangladesh 🇧🇩", "Chittagong, Bangladesh 🇧🇩",
  "Malé, Maldives 🇲🇻",
  
  // Moyen-Orient
  "Dubaï, Émirats 🇦🇪", "Abu Dhabi, Émirats 🇦🇪", "Sharjah, Émirats 🇦🇪", "Ajman, Émirats 🇦🇪",
  "Doha, Qatar 🇶🇦",
  "Riyad, Arabie Saoudite 🇸🇦", "Djeddah, Arabie Saoudite 🇸🇦", "La Mecque, Arabie Saoudite 🇸🇦", "Médine, Arabie Saoudite 🇸🇦",
  "Tel Aviv, Israël 🇮🇱", "Jérusalem, Israël 🇮🇱", "Haïfa, Israël 🇮🇱",
  "Beyrouth, Liban 🇱🇧", "Tripoli, Liban 🇱🇧",
  "Amman, Jordanie 🇯🇴", "Zarqa, Jordanie 🇯🇴", "Irbid, Jordanie 🇯🇴", "Petra, Jordanie 🇯🇴", "Aqaba, Jordanie 🇯🇴",
  "Damas, Syrie 🇸🇾", "Alep, Syrie 🇸🇾",
  "Bagdad, Irak 🇮🇶", "Bassora, Irak 🇮🇶", "Mossoul, Irak 🇮🇶",
  "Téhéran, Iran 🇮🇷", "Mashhad, Iran 🇮🇷", "Isfahan, Iran 🇮🇷", "Shiraz, Iran 🇮🇷",
  "Mascate, Oman 🇴🇲", "Salalah, Oman 🇴🇲",
  "Sanaa, Yémen 🇾🇪", "Aden, Yémen 🇾🇪",
  "Koweït, Koweït 🇰🇼",
  "Manama, Bahreïn 🇧🇭",
  
  // Afrique du Nord
  "Le Caire, Égypte 🇪🇬", "Alexandrie, Égypte 🇪🇬", "Gizeh, Égypte 🇪🇬", "Louxor, Égypte 🇪🇬", "Assouan, Égypte 🇪🇬",
  "Hurghada, Égypte 🇪🇬", "Sharm el-Sheikh, Égypte 🇪🇬",
  
  "Alger, Algérie 🇩🇿", "Oran, Algérie 🇩🇿", "Constantine, Algérie 🇩🇿", "Annaba, Algérie 🇩🇿", "Blida, Algérie 🇩🇿",
  "Batna, Algérie 🇩🇿", "Sétif, Algérie 🇩🇿", "Sidi Bel Abbès, Algérie 🇩🇿", "Tlemcen, Algérie 🇩🇿", "Béjaïa, Algérie 🇩🇿",
  
  "Casablanca, Maroc 🇲🇦", "Rabat, Maroc 🇲🇦", "Fès, Maroc 🇲🇦", "Marrakech, Maroc 🇲🇦", "Tanger, Maroc 🇲🇦",
  "Agadir, Maroc 🇲🇦", "Meknès, Maroc 🇲🇦", "Oujda, Maroc 🇲🇦", "Tétouan, Maroc 🇲🇦", "Essaouira, Maroc 🇲🇦",
  
  "Tunis, Tunisie 🇹🇳", "Sfax, Tunisie 🇹🇳", "Sousse, Tunisie 🇹🇳", "Kairouan, Tunisie 🇹🇳", "Bizerte, Tunisie 🇹🇳",
  "Djerba, Tunisie 🇹🇳", "Hammamet, Tunisie 🇹🇳",
  
  "Tripoli, Libye 🇱🇾", "Benghazi, Libye 🇱🇾", "Misrata, Libye 🇱🇾",
  
  // Afrique de l'Ouest
  "Lagos, Nigéria 🇳🇬", "Kano, Nigéria 🇳🇬", "Ibadan, Nigéria 🇳🇬", "Abuja, Nigéria 🇳🇬", "Port Harcourt, Nigéria 🇳🇬",
  "Accra, Ghana 🇬🇭", "Kumasi, Ghana 🇬🇭", "Tamale, Ghana 🇬🇭",
  "Abidjan, Côte d'Ivoire 🇨🇮", "Yamoussoukro, Côte d'Ivoire 🇨🇮", "Bouaké, Côte d'Ivoire 🇨🇮",
  "Dakar, Sénégal 🇸🇳", "Touba, Sénégal 🇸🇳", "Thiès, Sénégal 🇸🇳", "Saint-Louis, Sénégal 🇸🇳",
  "Bamako, Mali 🇲🇱", "Sikasso, Mali 🇲🇱", "Tombouctou, Mali 🇲🇱",
  "Ouagadougou, Burkina Faso 🇧🇫", "Bobo-Dioulasso, Burkina Faso 🇧🇫",
  "Conakry, Guinée 🇬🇳", "Nzérékoré, Guinée 🇬🇳",
  "Lomé, Togo 🇹🇬", "Sokodé, Togo 🇹🇬",
  "Cotonou, Bénin 🇧🇯", "Porto-Novo, Bénin 🇧🇯",
  "Niamey, Niger 🇳🇪", "Zinder, Niger 🇳🇪",
  "Nouakchott, Mauritanie 🇲🇷", "Nouadhibou, Mauritanie 🇲🇷",
  "Freetown, Sierra Leone 🇸🇱", "Bo, Sierra Leone 🇸🇱",
  "Monrovia, Liberia 🇱🇷",
  
  // Afrique de l'Est
  "Nairobi, Kenya 🇰🇪", "Mombasa, Kenya 🇰🇪", "Kisumu, Kenya 🇰🇪", "Nakuru, Kenya 🇰🇪",
  "Dar es Salaam, Tanzanie 🇹🇿", "Dodoma, Tanzanie 🇹🇿", "Arusha, Tanzanie 🇹🇿", "Mwanza, Tanzanie 🇹🇿", "Zanzibar, Tanzanie 🇹🇿",
  "Kampala, Ouganda 🇺🇬", "Gulu, Ouganda 🇺🇬", "Lira, Ouganda 🇺🇬",
  "Kigali, Rwanda 🇷🇼", "Butare, Rwanda 🇷🇼",
  "Addis-Abeba, Éthiopie 🇪🇹", "Dire Dawa, Éthiopie 🇪🇹", "Mekele, Éthiopie 🇪🇹", "Gondar, Éthiopie 🇪🇹", "Lalibela, Éthiopie 🇪🇹",
  "Mogadiscio, Somalie 🇸🇴", "Hargeisa, Somalie 🇸🇴",
  "Djibouti, Djibouti 🇩🇯",
  "Asmara, Érythrée 🇪🇷",
  "Khartoum, Soudan 🇸🇩", "Omdurman, Soudan 🇸🇩", "Port-Soudan, Soudan 🇸🇩",
  
  // Afrique Centrale
  "Kinshasa, RD Congo 🇨🇩", "Lubumbashi, RD Congo 🇨🇩", "Mbuji-Mayi, RD Congo 🇨🇩", "Goma, RD Congo 🇨🇩",
  "Brazzaville, Congo 🇨🇬", "Pointe-Noire, Congo 🇨🇬",
  "Yaoundé, Cameroun 🇨🇲", "Douala, Cameroun 🇨🇲", "Garoua, Cameroun 🇨🇲",
  "Libreville, Gabon 🇬🇦", "Port-Gentil, Gabon 🇬🇦",
  "Bangui, Centrafrique 🇨🇫",
  "N'Djamena, Tchad 🇹🇩",
  "Malabo, Guinée équatoriale 🇬🇶",
  
  // Afrique Australe
  "Johannesburg, Afrique du Sud 🇿🇦", "Cape Town, Afrique du Sud 🇿🇦", "Durban, Afrique du Sud 🇿🇦", "Pretoria, Afrique du Sud 🇿🇦", "Port Elizabeth, Afrique du Sud 🇿🇦",
  "Luanda, Angola 🇦🇴", "Huambo, Angola 🇦🇴", "Lobito, Angola 🇦🇴",
  "Maputo, Mozambique 🇲🇿", "Matola, Mozambique 🇲🇿", "Beira, Mozambique 🇲🇿",
  "Lusaka, Zambie 🇿🇲", "Kitwe, Zambie 🇿🇲", "Ndola, Zambie 🇿🇲",
  "Harare, Zimbabwe 🇿🇼", "Bulawayo, Zimbabwe 🇿🇼", "Victoria Falls, Zimbabwe 🇿🇼",
  "Windhoek, Namibie 🇳🇦", "Walvis Bay, Namibie 🇳🇦", "Swakopmund, Namibie 🇳🇦",
  "Gaborone, Botswana 🇧🇼", "Francistown, Botswana 🇧🇼", "Maun, Botswana 🇧🇼",
  "Mbabane, Eswatini 🇸🇿", "Manzini, Eswatini 🇸🇿",
  "Maseru, Lesotho 🇱🇸",
  
  // Îles Afrique
  "Antananarivo, Madagascar 🇲🇬", "Toamasina, Madagascar 🇲🇬", "Antsirabe, Madagascar 🇲🇬", "Nosy Be, Madagascar 🇲🇬",
  "Port-Louis, Maurice 🇲🇺", "Curepipe, Maurice 🇲🇺",
  "Victoria, Seychelles 🇸🇨", "Mahé, Seychelles 🇸🇨",
  "Moroni, Comores 🇰🇲",
  "Praia, Cap-Vert 🇨🇻", "Mindelo, Cap-Vert 🇨🇻",
  "São Tomé, Sao Tomé-et-Principe 🇸🇹",
  
  // Amériques - États-Unis
  "New York, États-Unis 🇺🇸", "Los Angeles, États-Unis 🇺🇸", "Chicago, États-Unis 🇺🇸", "Houston, États-Unis 🇺🇸", "Phoenix, États-Unis 🇺🇸",
  "Philadelphie, États-Unis 🇺🇸", "San Antonio, États-Unis 🇺🇸", "San Diego, États-Unis 🇺🇸", "Dallas, États-Unis 🇺🇸", "San José, États-Unis 🇺🇸",
  "San Francisco, États-Unis 🇺🇸", "Las Vegas, États-Unis 🇺🇸", "Miami, États-Unis 🇺🇸", "Boston, États-Unis 🇺🇸", "Seattle, États-Unis 🇺🇸",
  "Washington DC, États-Unis 🇺🇸", "Nouvelle-Orléans, États-Unis 🇺🇸", "Honolulu, Hawaï 🇺🇸", "Orlando, États-Unis 🇺🇸", "Atlanta, États-Unis 🇺🇸",
  
  // Canada
  "Toronto, Canada 🇨🇦", "Montréal, Canada 🇨🇦", "Vancouver, Canada 🇨🇦", "Calgary, Canada 🇨🇦", "Edmonton, Canada 🇨🇦",
  "Ottawa, Canada 🇨🇦", "Winnipeg, Canada 🇨🇦", "Québec, Canada 🇨🇦", "Halifax, Canada 🇨🇦",
  
  // Mexique
  "Mexico, Mexique 🇲🇽", "Guadalajara, Mexique 🇲🇽", "Monterrey, Mexique 🇲🇽", "Puebla, Mexique 🇲🇽", "Tijuana, Mexique 🇲🇽",
  "Cancún, Mexique 🇲🇽", "Playa del Carmen, Mexique 🇲🇽", "Tulum, Mexique 🇲🇽", "Puerto Vallarta, Mexique 🇲🇽",
  
  // Amérique Centrale
  "La Havane, Cuba 🇨🇺", "Santiago de Cuba, Cuba 🇨🇺", "Varadero, Cuba 🇨🇺",
  "Saint-Domingue, République Dominicaine 🇩🇴", "Santiago, République Dominicaine 🇩🇴", "Punta Cana, République Dominicaine 🇩🇴",
  "Kingston, Jamaïque 🇯🇲", "Montego Bay, Jamaïque 🇯🇲",
  "San José, Costa Rica 🇨🇷", "Alajuela, Costa Rica 🇨🇷", "Manuel Antonio, Costa Rica 🇨🇷",
  "Panama City, Panama 🇵🇦", "Colón, Panama 🇵🇦",
  "San Salvador, Salvador 🇸🇻",
  "Guatemala City, Guatemala 🇬🇹", "Antigua, Guatemala 🇬🇹",
  "Tegucigalpa, Honduras 🇭🇳", "San Pedro Sula, Honduras 🇭🇳",
  "Managua, Nicaragua 🇳🇮", "León, Nicaragua 🇳🇮",
  "Belize City, Belize 🇧🇿",
  
  // Amérique du Sud
  "São Paulo, Brésil 🇧🇷", "Rio de Janeiro, Brésil 🇧🇷", "Brasília, Brésil 🇧🇷", "Salvador, Brésil 🇧🇷", "Fortaleza, Brésil 🇧🇷",
  "Belo Horizonte, Brésil 🇧🇷", "Manaus, Brésil 🇧🇷", "Recife, Brésil 🇧🇷", "Porto Alegre, Brésil 🇧🇷",
  
  "Buenos Aires, Argentine 🇦🇷", "Córdoba, Argentine 🇦🇷", "Rosario, Argentine 🇦🇷", "Mendoza, Argentine 🇦🇷", "Ushuaia, Argentine 🇦🇷",
  
  "Lima, Pérou 🇵🇪", "Arequipa, Pérou 🇵🇪", "Trujillo, Pérou 🇵🇪", "Cusco, Pérou 🇵🇪", "Machu Picchu, Pérou 🇵🇪",
  
  "Bogotá, Colombie 🇨🇴", "Medellín, Colombie 🇨🇴", "Cali, Colombie 🇨🇴", "Barranquilla, Colombie 🇨🇴", "Carthagène, Colombie 🇨🇴",
  
  "Santiago, Chili 🇨🇱", "Valparaíso, Chili 🇨🇱", "Concepción, Chili 🇨🇱", "La Serena, Chili 🇨🇱",
  
  "Caracas, Venezuela 🇻🇪", "Maracaibo, Venezuela 🇻🇪", "Valencia, Venezuela 🇻🇪",
  
  "Quito, Équateur 🇪🇨", "Guayaquil, Équateur 🇪🇨", "Cuenca, Équateur 🇪🇨", "Galápagos, Équateur 🇪🇨",
  
  "La Paz, Bolivie 🇧🇴", "Santa Cruz, Bolivie 🇧🇴", "Cochabamba, Bolivie 🇧🇴", "Sucre, Bolivie 🇧🇴",
  
  "Asunción, Paraguay 🇵🇾", "Ciudad del Este, Paraguay 🇵🇾",
  
  "Montevideo, Uruguay 🇺🇾", "Salto, Uruguay 🇺🇾",
  
  "Georgetown, Guyana 🇬🇾",
  "Paramaribo, Suriname 🇸🇷",
  "Cayenne, Guyane française 🇬🇫",
  
  // Océanie - Australie
  "Sydney, Australie 🇦🇺", "Melbourne, Australie 🇦🇺", "Brisbane, Australie 🇦🇺", "Perth, Australie 🇦🇺", "Adélaïde, Australie 🇦🇺",
  "Gold Coast, Australie 🇦🇺", "Canberra, Australie 🇦🇺", "Hobart, Australie 🇦🇺", "Darwin, Australie 🇦🇺",
  
  // Nouvelle-Zélande
  "Auckland, Nouvelle-Zélande 🇳🇿", "Wellington, Nouvelle-Zélande 🇳🇿", "Christchurch, Nouvelle-Zélande 🇳🇿", "Hamilton, Nouvelle-Zélande 🇳🇿", "Queenstown, Nouvelle-Zélande 🇳🇿",
  
  // Îles Pacifique
  "Suva, Fidji 🇫🇯", "Nadi, Fidji 🇫🇯",
  "Port Moresby, Papouasie-Nouvelle-Guinée 🇵🇬",
  "Nouméa, Nouvelle-Calédonie 🇳🇨",
  "Papeete, Tahiti 🇵🇫", "Bora Bora, Polynésie française 🇵🇫", "Moorea, Polynésie française 🇵🇫",
  "Apia, Samoa 🇼🇸",
  "Port-Vila, Vanuatu 🇻🇺",
  "Honiara, Îles Salomon 🇸🇧"
];

const Questionnaire = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answer>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [approximateDatePickerOpen, setApproximateDatePickerOpen] = useState(false);
  const [baseMonth, setBaseMonth] = useState<Date>(startOfMonth(new Date()));
  const cityInputRef = useRef<HTMLInputElement>(null);
  const departureInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [, forceUpdate] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [returnToReviewStep, setReturnToReviewStep] = useState<number | null>(null);
  
  // Force re-render when language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      forceUpdate({});
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  // Normaliser automatiquement les réponses pour qu'elles utilisent toujours des codes internes
  useEffect(() => {
    if (!answers || Object.keys(answers).length === 0) return;
    
    let hasChanges = false;
    const updates: any = {};
    
    // Normaliser travelGroup
    if (answers.travelGroup) {
      const normalized = normalizeTravelGroup(answers.travelGroup);
      if (normalized && normalized !== answers.travelGroup) {
        updates.travelGroup = normalized;
        hasChanges = true;
      }
    }
    
    // Normaliser hasDestination
    if (answers.hasDestination) {
      const normalized = normalizeYesNo(answers.hasDestination);
      if (normalized && normalized !== answers.hasDestination) {
        updates.hasDestination = normalized;
        hasChanges = true;
      }
    }
    
    // Normaliser datesType
    if (answers.datesType) {
      const normalized = normalizeDatesType(answers.datesType);
      if (normalized && normalized !== answers.datesType) {
        updates.datesType = normalized;
        hasChanges = true;
      }
    }
    
    // Normaliser hasApproximateDepartureDate
    if (answers.hasApproximateDepartureDate) {
      const normalized = normalizeYesNo(answers.hasApproximateDepartureDate);
      if (normalized && normalized !== answers.hasApproximateDepartureDate) {
        updates.hasApproximateDepartureDate = normalized;
        hasChanges = true;
      }
    }
    
    // Normaliser helpWith array
    if (answers.helpWith && Array.isArray(answers.helpWith)) {
      const normalized = normalizeHelpWithArray(answers.helpWith);
      
      // Comparer les tableaux de manière sûre
      const isDifferent = normalized.length !== answers.helpWith.length ||
        normalized.some((v: string, i: number) => v !== answers.helpWith[i]);
        
      if (isDifferent) {
        updates.helpWith = normalized;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      setAnswers((prev: any) => ({ ...prev, ...updates }));
    }
    // Ne dépendre que des valeurs brutes, pas de l'objet answers complet
  }, [answers.travelGroup, answers.hasDestination, answers.datesType, answers.hasApproximateDepartureDate, JSON.stringify(answers.helpWith)]);
  
  // ⚠️ PROTECTION AUTH: Require authentication to start questionnaire
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: t('questionnaire.connectionRequired'),
        description: t('questionnaire.mustBeConnected'),
        variant: "destructive",
        duration: 6000
      });
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate, t, toast]);
  
  // 💾 AUTOSAVE: Save draft to localStorage with debounce
  useEffect(() => {
    if (!user) return;
    
    const timer = setTimeout(() => {
      const draftKey = `travliaq:qv2:${user.id}`;
      const draft = {
        version: 2,
        timestamp: Date.now(),
        step,
        answers
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [answers, step, user]);
  
  // 📋 LOAD DRAFT: Restore from localStorage on mount (automatically)
  useEffect(() => {
    if (!user) return;
    
    const draftKey = `travliaq:qv2:${user.id}`;
    const saved = localStorage.getItem(draftKey);
    
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.version === 2 && draft.answers && draft.step) {
          // Auto-restore without confirmation
          setAnswers(draft.answers);
          setStep(draft.step);
          toast({
            title: t('questionnaire.draftRestored'),
            description: t('questionnaire.draftRestoredDesc'),
            duration: 4000
          });
        }
      } catch (error) {
        localStorage.removeItem(draftKey);
      }
    }
  }, [user, t, toast]);
  
  // 📧 INITIALIZE EMAIL: Set user's email as default if not already set
  useEffect(() => {
    if (user?.email && !answers.email) {
      setAnswers(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email, answers.email]);
  
  // 🧮 INFERENCE: Auto-calculate numberOfTravelers
  useEffect(() => {
    if (!answers.travelGroup) return;
    
    const normalizedGroup = normalizeTravelGroup(answers.travelGroup);
    let inferred = answers.numberOfTravelers;
    
    if (normalizedGroup === TRAVEL_GROUPS.SOLO) {
      inferred = 1;
    } else if (normalizedGroup === TRAVEL_GROUPS.DUO) {
      inferred = 2;
    } else if (answers.travelers && answers.travelers.length > 0) {
      inferred = answers.travelers.length;
    }
    
    if (inferred && inferred !== answers.numberOfTravelers) {
      setAnswers(prev => ({ ...prev, numberOfTravelers: inferred }));
    }
  }, [answers.travelGroup, answers.travelers]);
  
  // 🧮 INFERENCE: Auto-calculate duration from exact dates
  useEffect(() => {
    const normalizedDatesType = normalizeDatesType(answers.datesType);
    if (normalizedDatesType === DATES_TYPE.FIXED && 
        answers.departureDate && 
        answers.returnDate) {
      const start = new Date(answers.departureDate);
      const end = new Date(answers.returnDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Infer duration category
      let inferredDuration = '';
      if (diffDays <= 3) inferredDuration = t('questionnaire.duration.1to3');
      else if (diffDays <= 7) inferredDuration = t('questionnaire.duration.4to7');
      else if (diffDays <= 14) inferredDuration = t('questionnaire.duration.8to14');
      else inferredDuration = t('questionnaire.duration.more14');
      
      setAnswers(prev => ({ 
        ...prev, 
        duration: inferredDuration,
        exactNights: diffDays
      }));
    }
  }, [answers.datesType, answers.departureDate, answers.returnDate, t]);

  // Function to request geolocation
  const requestGeolocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { data, error } = await supabase.functions.invoke('geocode', {
              body: { lat: latitude, lon: longitude }
            });
            
            if (error) throw error;
            
            const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
            const country = data.address.country;
            
            if (city && country) {
              const detectedLocation = `${city}, ${country}`;
              setAnswers({ ...answers, departureLocation: detectedLocation });
              toast({
                title: "Position détectée",
                description: `Vous partez de ${detectedLocation}`,
              });
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error("Geocoding error:", error);
            }
            toast({
              title: "Erreur",
              description: "Impossible de détecter votre position",
              variant: "destructive"
            });
          } finally {
            setIsLoadingLocation(false);
          }
        },
        (error) => {
          setIsLoadingLocation(false);
          toast({
            title: "Position refusée",
            description: "Veuillez saisir votre ville manuellement",
          });
        }
      );
    }
  };

  // Sync dateRange with answers when dates are set
  useEffect(() => {
    if (answers.departureDate && answers.returnDate) {
      setDateRange({
        from: new Date(answers.departureDate),
        to: new Date(answers.returnDate)
      });
    }
  }, [answers.departureDate, answers.returnDate]);

  // Calculate dynamic total steps based on user choices
  const getTotalSteps = (): number => {
    let total = 1; // Step 1: Qui voyage
    
    const normalizedGroup = normalizeTravelGroup(answers.travelGroup);
    const normalizedHasDestination = normalizeYesNo(answers.hasDestination);
    const normalizedDatesType = normalizeDatesType(answers.datesType);
    
    if (normalizedGroup === TRAVEL_GROUPS.FAMILY || normalizedGroup === TRAVEL_GROUPS.GROUP35) total++; // Step 1b: Nombre exact
    if (normalizedGroup === TRAVEL_GROUPS.FAMILY) total++; // Step 1c: Détails enfants
    total++; // Step 2: Destination en tête
    total++; // Step 2b: Comment Travliaq peut aider (vols/hébergement/activités)
    
    if (normalizedHasDestination === YES_NO.YES) {
      total++; // Step 2c: Quelle destination
    } else if (normalizedHasDestination === YES_NO.NO) {
      total++; // Step 2d: Climat préféré
      total++; // Step 2e: Affinités de voyage
      total++; // Step 2f: Ambiance recherchée
      total++; // Step 2g: Ville de départ (pour destination flexible)
    }
    
    total++; // Step 3: Dates
    
    if (normalizedDatesType === DATES_TYPE.FIXED) {
      total++; // Step 3b: Dates précises
    } else if (normalizedDatesType === DATES_TYPE.FLEXIBLE) {
      total++; // Step 3c: Flexibilité
      total++; // Step 3d: Date de départ approximative
      const normalizedHasApproxDate = normalizeYesNo(answers.hasApproximateDepartureDate);
      if (normalizedHasApproxDate === YES_NO.YES) total++; // Step 3e: Saisie date approximative
      total++; // Step 4: Durée
      // Check for "Plus de 14 jours" in duration
      if (answers.duration && (
        answers.duration.includes('14') || 
        answers.duration.toLowerCase().includes('more') ||
        answers.duration.toLowerCase().includes('plus')
      )) {
        total++; // Step 4b: Nombre exact
      }
    }
    
    total++; // Step 5: Budget
    // Check for precise budget type
    if (answers.budgetType && (
      answers.budgetType.toLowerCase().includes('précis') ||
      answers.budgetType.toLowerCase().includes('precise')
    )) {
      total++; // Step 5b: Montant exact
    }
    
    const helpWith = answers.helpWith || [];
    const needsFlights = helpWith.includes(HELP_WITH.FLIGHTS);
    const needsAccommodation = helpWith.includes(HELP_WITH.ACCOMMODATION);
    const needsActivities = helpWith.includes(HELP_WITH.ACTIVITIES);
    
    // Step 6: Style (seulement si destination précise ET activités sélectionnées)
    if (normalizedHasDestination === YES_NO.YES && needsActivities) {
      total++; // Step 6: Style
    }
    
    // Step 8-9: Vols et bagages (seulement si vols sélectionnés)
    if (needsFlights) {
      total++; // Step 8: Vols
      total++; // Step 9: Bagages
    }
    
    total++; // Step 10: Mobilité
    
    // Step 11-14: Hébergement (seulement si hébergement sélectionné)
    if (needsAccommodation) {
      total++; // Step 11: Type hébergement
      // Check for hotel in accommodation type
      if (answers.accommodationType && Array.isArray(answers.accommodationType)) {
        const hasHotel = answers.accommodationType.some((type: string) => 
          type.toLowerCase().includes('hôtel') || 
          type.toLowerCase().includes('hotel')
        );
        if (hasHotel) total++; // Step 11b: Préférences hôtel
      }
      total++; // Step 12: Confort
      total++; // Step 13: Quartier
      total++; // Step 14: Équipements
    }
    
    // Step 15: Sécurité & Phobies (seulement si hébergement OU activités sélectionnés, pas juste vols)
    const needsSecurityStep = needsAccommodation || needsActivities;
    if (needsSecurityStep) {
      total++; // Step 15: Sécurité
    }
    
    // Step 16: Horloge biologique (seulement si activités sélectionnées)
    if (needsActivities) {
      total++; // Step 16: Horloge biologique
    }
    
    total++; // Step 17: Contraintes
    total++; // Step 18: Zone ouverte
    total++; // Step final: Review & confirm
    
    return total;
  };

  const totalSteps = getTotalSteps();
  const progress = (step / totalSteps) * 100;

  // Validation pour chaque étape avant de continuer
  const canProceedToNextStep = (): boolean => {
    let stepCounter = 0;

    // Step 1: Groupe de voyage
    stepCounter++;
    if (step === stepCounter) return !!answers.travelGroup;

    // Step 1b: Nombre exact de voyageurs (si Famille ou Groupe 3-5)
    const normalizedGroup = normalizeTravelGroup(answers.travelGroup);
    if (normalizedGroup === TRAVEL_GROUPS.FAMILY || normalizedGroup === TRAVEL_GROUPS.GROUP35) {
      stepCounter++;
      if (step === stepCounter) {
        return !!answers.numberOfTravelers && answers.numberOfTravelers > 0;
      }
    }

    // Step 2: Destination en tête ?
    stepCounter++;
    if (step === stepCounter) return !!answers.hasDestination;

    // Step 2b: Comment aider (multi)
    stepCounter++;
    if (step === stepCounter) return !!answers.helpWith && answers.helpWith.length > 0;

    const hasDest = normalizeYesNo(answers.hasDestination);

    // Branches selon la destination
    if (hasDest === YES_NO.YES) {
      // Step 2c: Trajet (ville départ + destination)
      stepCounter++;
      if (step === stepCounter) {
        return !!answers.destination && !!answers.departureLocation;
      }
    } else if (hasDest === YES_NO.NO) {
      // Step 2c: Climat (multi)
      stepCounter++;
      if (step === stepCounter) return !!answers.climatePreference && answers.climatePreference.length > 0;

      // Step 2d: Affinités (multi)
      stepCounter++;
      if (step === stepCounter) return !!answers.travelAffinities && answers.travelAffinities.length > 0;

      // Step 2e: Ambiance
      stepCounter++;
      if (step === stepCounter) return !!answers.travelAmbiance;

      // Step 2g: Ville de départ
      stepCounter++;
      if (step === stepCounter) return !!answers.departureLocation;
    }

    // Step 3: Type de dates
    stepCounter++;
    if (step === stepCounter) return !!answers.datesType;

    const normalizedDatesType = normalizeDatesType(answers.datesType);

    // Dates précises
    if (normalizedDatesType === DATES_TYPE.FIXED) {
      stepCounter++;
      if (step === stepCounter) return !!answers.departureDate && !!answers.returnDate;
    }

    // Dates flexibles
    if (normalizedDatesType === DATES_TYPE.FLEXIBLE) {
      // Avez-vous une période approximative ?
      stepCounter++;
      if (step === stepCounter) return !!answers.hasApproximateDepartureDate;

      if (normalizeYesNo(answers.hasApproximateDepartureDate) === YES_NO.YES) {
        // Vers quand ?
        stepCounter++;
        if (step === stepCounter) return !!answers.approximateDepartureDate;
      }

      // Niveau de flexibilité
      stepCounter++;
      if (step === stepCounter) return !!answers.flexibility;
    }

    // Durée (seulement si dates flexibles - si dates précises, la durée est calculée automatiquement)
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE) {
      stepCounter++;
      if (step === stepCounter) return !!answers.duration;

      // Si >14 nuits, exiger le nombre exact
      if (answers.duration === t('questionnaire.duration.more14')) {
        stepCounter++;
        if (step === stepCounter) return !!answers.exactNights && (answers.exactNights as number) > 0;
      }
    }

    // Budget: soit une plage par personne, soit "budget précis"
    stepCounter++;
    if (step === stepCounter) return !!answers.budgetPerPerson || !!answers.budgetType;

    // Si budget précis, vérifier montant + devise
    if (answers.budgetType === t('questionnaire.budget.precise')) {
      stepCounter++;
      if (step === stepCounter) return !!answers.budgetAmount && !!answers.budgetCurrency;
    }

    // Autres étapes: validation locale ou optionnelles
    return true;
  };

  const nextStep = (skipValidation: boolean = false) => {
    // Validation avant de continuer (sauf si on skip la validation)
    if (!skipValidation && !canProceedToNextStep()) {
      toast({
        title: t('questionnaire.pleaseAnswer'),
        description: t('questionnaire.answerRequired'),
        variant: "destructive",
      });
      return;
    }
    
    // Si on est en mode édition et qu'on veut retourner au récapitulatif
    if (isEditMode && returnToReviewStep !== null) {
      setStep(returnToReviewStep);
      setIsEditMode(false);
      setReturnToReviewStep(null);
    } else {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleChoice = (field: keyof Answer, value: any) => {
    setAnswers({ ...answers, [field]: value });
    // Skip validation car on vient de définir la valeur
    setTimeout(() => nextStep(true), 300);
  };

  const handleMultiChoice = (field: keyof Answer, value: string, maxLimit?: number, autoAdvanceWhenComplete?: number) => {
    const current = (answers[field] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : maxLimit && current.length >= maxLimit
      ? current
      : [...current, value];
    setAnswers({ ...answers, [field]: updated });
    
    // Auto-advance when all options are selected (if autoAdvanceWhenComplete is provided)
    if (autoAdvanceWhenComplete && updated.length === autoAdvanceWhenComplete) {
      setTimeout(() => nextStep(true), 400);
    }
  };

  // Handler pour les choix multiples avec option "Peu importe" exclusive
  const handleMultiChoiceWithDontMind = (field: keyof Answer, value: string, dontMindLabel: string, autoNext: boolean = false) => {
    const current = (answers[field] as string[]) || [];
    
    // Si on clique sur "Peu importe"
    if (value === dontMindLabel) {
      // Remplacer toute la sélection par ["Peu importe"]
      setAnswers({ ...answers, [field]: [dontMindLabel] });
      if (autoNext) {
        setTimeout(() => nextStep(true), 300);
      }
    } else {
      // Si "Peu importe" est déjà sélectionné, le retirer
      const filteredSelection = current.filter(item => item !== dontMindLabel);
      
      // Toggle la nouvelle option
      const updated = filteredSelection.includes(value)
        ? filteredSelection.filter(v => v !== value)
        : [...filteredSelection, value];
      
      setAnswers({ ...answers, [field]: updated });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void, condition: boolean = true) => {
    if (e.key === "Enter" && condition) {
      e.preventDefault();
      action();
    }
  };

  const validateDates = () => {
    if (!answers.departureDate || !answers.returnDate) return false;
    const departure = new Date(answers.departureDate);
    const returnDate = new Date(answers.returnDate);
    return returnDate >= departure;
  };

  const getNumberOfTravelers = (): number => {
    if (answers.travelers && answers.travelers.length > 0) return answers.travelers.length;
    if (answers.numberOfTravelers) return answers.numberOfTravelers;
    
    switch(answers.travelGroup) {
      case t('questionnaire.solo'): return 1;
      case t('questionnaire.duo'): return 2;
      case t('questionnaire.group35'): return 4; // Default middle
      default: return 1;
    }
  };

  // Celebration animation
  const triggerCelebration = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleSubmitQuestionnaire = async () => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // CRITICAL: Require authentication before submission
      if (!user) {
        toast({
          title: t('questionnaire.connectionRequired'),
          description: t('questionnaire.mustBeConnected'),
          variant: "destructive",
          duration: 6000
        });
        setIsSubmitting(false);
        // Show Google login popup
        setShowGoogleLogin(true);
        return;
      }
      
      // Comprehensive validation schema
      const questionnaireSchema = z.object({
        user_id: z.string().uuid().nullable(),
        email: z.string().trim().email({ message: "Email invalide" }).max(255, { message: "Email trop long" }),
        langue: z.enum(['fr', 'en']),
        travel_group: z.string().max(100).optional().nullable(),
        number_of_travelers: z.number().int().min(1).max(50).optional().nullable(),
        has_destination: z.string().max(50).optional().nullable(),
        destination: z.string().trim().max(200).optional().nullable(),
        departure_location: z.string().trim().max(200).optional().nullable(),
        climate_preference: z.any().optional().nullable(),
        travel_affinities: z.array(z.string().max(200)).max(50).optional().nullable(),
        travel_ambiance: z.string().max(100).optional().nullable(),
        dates_type: z.string().max(50).optional().nullable(),
        departure_date: z.string().optional().nullable(),
        return_date: z.string().optional().nullable(),
        flexibility: z.string().max(50).optional().nullable(),
        has_approximate_departure_date: z.string().max(50).optional().nullable(),
        approximate_departure_date: z.string().optional().nullable(),
        duration: z.string().max(50).optional().nullable(),
        exact_nights: z.number().int().min(1).max(365).optional().nullable(),
        budget: z.string().max(100).optional().nullable(),
        budget_type: z.string().max(50).optional().nullable(),
        budget_amount: z.number().min(0).max(10000000).optional().nullable(),
        budget_currency: z.string().max(50).optional().nullable(),
        styles: z.any().optional().nullable(),
        rhythm: z.string().max(100).optional().nullable(),
        flight_preference: z.string().max(100).optional().nullable(),
        luggage: z.any().optional().nullable(),
        mobility: z.array(z.string().max(200)).max(50).optional().nullable(),
        accommodation_type: z.array(z.string().max(100)).max(20).optional().nullable(),
        comfort: z.string().max(100).optional().nullable(),
        neighborhood: z.string().max(200).optional().nullable(),
        amenities: z.array(z.string().max(200)).max(50).optional().nullable(),
        children: z.array(z.object({ age: z.number().int().min(0).max(17) })).max(20).optional().nullable(),
        security: z.array(z.string().max(200)).max(20).optional().nullable(),
        biorhythm: z.array(z.string().max(200)).max(20).optional().nullable(),
        constraints: z.array(z.string().max(200)).max(50).optional().nullable(),
        additional_info: z.string().trim().max(2000).optional().nullable(),
        open_comments: z.string().trim().max(2000).optional().nullable(),
      });

      const responseData = {
        user_id: user?.id || null,
        email: answers.email || "",
        langue: i18n.language === 'en' ? 'en' : 'fr', // Capture the current language
        groupe_voyage: answers.travelGroup || null,
        nombre_voyageurs: answers.numberOfTravelers || getNumberOfTravelers(),
        a_destination: answers.hasDestination || null,
        destination: answers.destination || null,
        lieu_depart: answers.departureLocation || null,
        preference_climat: answers.climatePreference || null,
        affinites_voyage: answers.travelAffinities || null,
        ambiance_voyage: answers.travelAmbiance || null,
        type_dates: answers.datesType || null,
        date_depart: answers.departureDate || null,
        date_retour: answers.returnDate || null,
        flexibilite: answers.flexibility || null,
        a_date_depart_approximative: answers.hasApproximateDepartureDate || null,
        date_depart_approximative: answers.approximateDepartureDate || null,
        duree: answers.duration || null,
        nuits_exactes: answers.exactNights || null,
        budget_par_personne: answers.budgetPerPerson || null,
        type_budget: answers.budgetType || null,
        montant_budget: answers.budgetAmount || null,
        devise_budget: answers.budgetCurrency || null,
        styles: answers.styles || null,
        rythme: answers.rhythm || null,
        preferences_horaires: answers.schedulePrefs || null,
        preference_vol: answers.flightPreference || null,
        bagages: answers.luggage || null,
        mobilite: answers.mobility || null,
        type_hebergement: answers.accommodationType || null,
        preferences_hotel: answers.hotelPreferences || null,
        confort: answers.comfort || null,
        quartier: answers.neighborhood || null,
        equipements: answers.amenities || null,
        enfants: answers.children || null,
        securite: answers.security || null,
        aide_avec: answers.helpWith || null,
        contraintes: answers.constraints || null,
        infos_supplementaires: answers.additionalInfo || null
      };

      // Validate all inputs before submission
      const validatedData = questionnaireSchema.parse(responseData);

      // Use secure edge function with rate limiting
      const { data, error } = await supabase.functions.invoke('submit-questionnaire', {
        body: validatedData
      });

      if (error) throw error;

      setSubmittedResponseId(data.data.id);
      
      // Enqueue answer_id to SQS with retry logic
      const enqueueWithRetry = async (answerId: string, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const { data: sqsData, error: sqsError } = await supabase.functions.invoke('enqueue-answer', {
              body: { answer_id: answerId }
            });
            
            if (sqsError) throw sqsError;
            if (sqsData?.ok) {
              console.log(`[${new Date().toISOString()}] Answer enqueued successfully: ${answerId}`);
              return true;
            }
            throw new Error('Enqueue failed');
          } catch (err) {
            console.error(`[${new Date().toISOString()}] Enqueue attempt ${attempt}/${maxRetries} failed:`, err);
            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            } else {
              console.error(`[${new Date().toISOString()}] Failed to enqueue after ${maxRetries} attempts`);
              return false;
            }
          }
        }
        return false;
      };
      
      // Fire and forget - don't block user flow
      enqueueWithRetry(data.data.id).then(success => {
        if (success) {
          console.log('Answer successfully queued for processing');
        }
      });
      
      // Trigger celebration animation
      triggerCelebration();
      
      toast({
        title: t('questionnaire.submittedTitle'),
        description: t('questionnaire.submittedDescription'),
      });

      // 🗑️ Clear draft from localStorage after successful submission
      if (user) {
        const draftKey = `travliaq:qv2:${user.id}`;
        localStorage.removeItem(draftKey);
      }

      // If user is already authenticated, redirect to home after a few seconds
      // Otherwise, show Google login popup
      if (user) {
        setTimeout(() => {
          navigate('/');
        }, 3500);
      } else {
        setShowGoogleLogin(true);
      }

    } catch (error) {
      // Only log detailed errors in development
      if (import.meta.env.DEV) {
        console.error("Questionnaire submission error:", error);
      }
      
      // Check if it's a quota exceeded error
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('quota_exceeded')) {
        toast({
          title: t('questionnaire.quotaReached'),
          description: t('questionnaire.quotaExceeded'),
          variant: "destructive",
          duration: 5000
        });
        setTimeout(() => {
          navigate('/');
        }, 5000);
        return;
      }
      
      // Check if authentication is required
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('authentication_required')) {
        toast({
          title: t('questionnaire.connectionRequired'),
          description: t('questionnaire.mustBeConnected'),
          variant: "destructive",
          duration: 6000
        });
        setShowGoogleLogin(true);
        return;
      }
      
      if (error instanceof z.ZodError) {
        toast({
          title: t('questionnaire.validationError'),
          description: error.errors[0]?.message || t('questionnaire.invalidData'),
          variant: "destructive"
        });
      } else {
        toast({
          title: t('questionnaire.error'),
          description: t('questionnaire.submissionError'),
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetQuestionnaire = () => {
    // Effacer toutes les réponses
    setAnswers({});
    
    // Supprimer le draft du localStorage
    if (user) {
      const draftKey = `travliaq:qv2:${user.id}`;
      localStorage.removeItem(draftKey);
    }
    
    // Revenir à l'étape 1
    setStep(1);
    
    // Fermer le dialog
    setShowResetDialog(false);
    
    // Petit effet confetti pour célébrer le nouveau départ
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#38BDF8', '#F59E0B', '#10B981']
    });
    
    // Notification
    toast({
      title: '✨ Nouveau départ !',
      description: 'Votre questionnaire a été réinitialisé avec succès.',
      duration: 3000
    });
  };

  const handleGoogleLoginSuccess = async () => {
    // Link the submitted response to the newly authenticated user using secure RPC
    if (submittedResponseId) {
      try {
        const { error } = await supabase.rpc('claim_questionnaire_response', {
          response_id: submittedResponseId
        });
        
        if (error) {
          // Only log in development
          if (import.meta.env.DEV) {
            console.error("Error claiming questionnaire:", error);
          }
        }
      } catch (error) {
        // Only log in development
        if (import.meta.env.DEV) {
          console.error("Error in claim operation:", error);
        }
      }
    }
    setShowGoogleLogin(false);
    
    // Redirect to home page after successful login
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  const renderStep = () => {
    let stepCounter = 1;
    
    // Déclarer les variables helpWith au début pour qu'elles soient disponibles partout
    const helpWithFlights = answers.helpWith || [];
    const helpWithAccommodation = answers.helpWith || [];
    const helpWithActivities = answers.helpWith || [];

    // Step 1: Qui voyage
    if (step === stepCounter) {
      return (
        <div className="space-y-6 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-travliaq-deep-blue to-travliaq-turquoise bg-clip-text text-transparent">
            {t('questionnaire.whoTraveling')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { code: TRAVEL_GROUPS.SOLO, label: t('questionnaire.solo'), icon: "🧳" },
              { code: TRAVEL_GROUPS.DUO, label: t('questionnaire.duo'), icon: "👥" },
              { code: TRAVEL_GROUPS.GROUP35, label: t('questionnaire.group35'), icon: "👨‍👩‍👧" },
              { code: TRAVEL_GROUPS.FAMILY, label: t('questionnaire.family'), icon: "👨‍👩‍👧‍👦" }
            ].map((option) => (
              <Card
                key={option.code}
                className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                  normalizeTravelGroup(answers.travelGroup) === option.code
                    ? 'border-travliaq-turquoise bg-gradient-to-br from-travliaq-turquoise/10 to-travliaq-golden-sand/10 shadow-xl' 
                    : 'border-transparent hover:border-travliaq-turquoise/50 hover:shadow-lg'
                }`}
                onClick={() => {
                  handleChoice("travelGroup", option.code);
                }}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-5xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 1b: Nombre exact de voyageurs avec détails
    const normalizedGroup = normalizeTravelGroup(answers.travelGroup);
    
    // Pour GROUPE 3-5: Proposer de choisir 3, 4 ou 5 personnes
    if (normalizedGroup === TRAVEL_GROUPS.GROUP35 && step === stepCounter) {
      return (
        <div className="space-y-6 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-travliaq-deep-blue to-travliaq-turquoise bg-clip-text text-transparent">
            {t('questionnaire.numberOfPeople')}
          </h2>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[3, 4, 5].map((count) => (
              <Card
                key={count}
                className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                  answers.numberOfTravelers === count
                    ? 'border-travliaq-turquoise bg-gradient-to-br from-travliaq-turquoise/10 to-travliaq-golden-sand/10 shadow-xl' 
                    : 'border-transparent hover:border-travliaq-turquoise/50 hover:shadow-lg'
                }`}
                onClick={() => {
                  setAnswers({ 
                    ...answers, 
                    numberOfTravelers: count,
                    travelers: Array(count).fill(null).map(() => ({ type: 'adult' as const }))
                  });
                  setTimeout(() => nextStep(true), 300);
                }}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-5xl">
                    {count === 3 ? "👨‍👩‍👧" : count === 4 ? "👨‍👩‍👧‍👦" : "👨‍👩‍👧‍👦"}
                  </span>
                  <span className="text-2xl font-bold text-travliaq-deep-blue">
                    {count}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {count === 1 ? 'personne' : 'personnes'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    
    // Pour FAMILLE: Utiliser TravelersStep pour gérer adultes et enfants
    if (normalizedGroup === TRAVEL_GROUPS.FAMILY && step === stepCounter) {
      return (
        <TravelersStep
          travelers={answers.travelers || []}
          onUpdate={(travelers) => {
            setAnswers({ 
              ...answers, 
              travelers,
              numberOfTravelers: travelers.length,
              children: travelers.filter(t => t.type === 'child').map(t => ({ age: t.age || 0 }))
            });
          }}
          onNext={nextStep}
        />
      );
    }
    if (normalizedGroup === TRAVEL_GROUPS.FAMILY || normalizedGroup === TRAVEL_GROUPS.GROUP35) stepCounter++;

    // Step 2: Destination en tête ?
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.destinationInMind')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.destinationInMind.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.yes'), icon: "✅" },
              { label: t('questionnaire.no'), icon: "🤔" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("hasDestination", option.label)}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 2b: Comment Travliaq peut vous aider ?
    if (step === stepCounter) {
      return (
        <div className="space-y-3 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.howCanHelp')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.howCanHelp.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-w-3xl mx-auto">
            {[
              { code: HELP_WITH.FLIGHTS, label: t('questionnaire.flights'), icon: "✈️", desc: t('questionnaire.flights.desc') },
              { code: HELP_WITH.ACCOMMODATION, label: t('questionnaire.accommodation'), icon: "🏨", desc: t('questionnaire.accommodation.desc') },
              { code: HELP_WITH.ACTIVITIES, label: t('questionnaire.activities'), icon: "🎯", desc: t('questionnaire.activities.desc') }
            ].map((option) => {
              const isSelected = (answers.helpWith || []).includes(option.code);
              return (
                <Card
                  key={option.code}
                   className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => handleMultiChoice("helpWith", option.code, undefined, 3)}
                >
                  <div className="flex flex-col items-center space-y-1.5">
                    <span className="text-3xl">{option.icon}</span>
                    <span className="text-base font-semibold text-travliaq-deep-blue text-center">
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center">
                      {option.desc}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              disabled={!answers.helpWith || answers.helpWith.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 2c: Destination précise (si Oui)
    if (normalizeYesNo(answers.hasDestination) === YES_NO.YES && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            Ton trajet ✈️
          </h2>
          <div className="max-w-xl mx-auto space-y-3">
            {/* Departure Location */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-travliaq-deep-blue flex items-center gap-1.5">
                  {t('questionnaire.whereFrom')}
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="inline-flex items-center justify-center touch-manipulation"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Info className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground hover:text-travliaq-deep-blue transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs z-[100]" side="top" sideOffset={8}>
                        <p className="text-xs">
                          {t('questionnaire.cityTooltip')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestGeolocation}
                  disabled={isLoadingLocation}
                  className="text-xs"
                >
                  {isLoadingLocation ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      {t('questionnaire.detecting')}
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-1 h-3 w-3" />
                      {t('questionnaire.myPosition')}
                    </>
                  )}
                </Button>
              </div>
              <CitySearch
                value={answers.departureLocation || ""}
                onChange={(value) => setAnswers({ ...answers, departureLocation: value })}
                placeholder={t('questionnaire.departureCity')}
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium mb-2 text-travliaq-deep-blue flex items-center gap-1.5">
                {t('questionnaire.whereGoing')}
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        className="inline-flex items-center justify-center touch-manipulation"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Info className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground hover:text-travliaq-deep-blue transition-colors cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs z-[100]" side="top" sideOffset={8}>
                        <p className="text-xs">
                          {t('questionnaire.destinationTooltip')}
                        </p>
                      </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <CitySearch
                value={answers.destination || ""}
                onChange={(value) => setAnswers({ ...answers, destination: value })}
                placeholder={t('questionnaire.destinationCity')}
                onEnterPress={() => {
                  if (answers.destination && answers.destination.trim() !== "" && answers.departureLocation && answers.departureLocation.trim() !== "") {
                    nextStep();
                  }
                }}
              />
            </div>

            <div className="flex justify-center">
              <Button
                variant="hero"
                size="lg"
                onClick={() => nextStep()}
                disabled={!answers.destination || answers.destination.trim() === "" || !answers.departureLocation || answers.departureLocation.trim() === ""}
                className="bg-travliaq-deep-blue"
              >
                {t('questionnaire.continue')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (normalizeYesNo(answers.hasDestination) === YES_NO.YES) stepCounter++;

    // Step 2c: Climat préféré (si Non - pas de destination en tête) - MULTI-CHOIX
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.climatePreference')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.climatePreference.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { label: t('questionnaire.climate.dontMind'), icon: "🤷", desc: t('questionnaire.climate.dontMind.desc'), autoNext: true },
              { label: t('questionnaire.climate.hotSunny'), icon: "☀️", desc: t('questionnaire.climate.hotSunny.desc') },
              { label: t('questionnaire.climate.mildSweet'), icon: "🌤️", desc: t('questionnaire.climate.mildSweet.desc') },
              { label: t('questionnaire.climate.coldSnowy'), icon: "❄️", desc: t('questionnaire.climate.coldSnowy.desc') },
              { label: t('questionnaire.climate.tropicalHumid'), icon: "🌴", desc: t('questionnaire.climate.tropicalHumid.desc') },
              { label: t('questionnaire.climate.mountainAltitude'), icon: "⛰️", desc: t('questionnaire.climate.mountainAltitude.desc') }
            ].map((option) => {
              const isSelected = (answers.climatePreference || []).includes(option.label);
              return (
                <Card
                  key={option.label}
                  className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    handleMultiChoiceWithDontMind(
                      "climatePreference", 
                      option.label, 
                      t('questionnaire.climate.dontMind'),
                      (option as any).autoNext
                    );
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">{option.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-travliaq-deep-blue">
                        {option.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {option.desc}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              disabled={!answers.climatePreference || answers.climatePreference.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO) stepCounter++;

    // Step 2d: Affinités de voyage (si Non - multi-choix)
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.affinities.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.affinities.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { label: t('questionnaire.affinities.dontMind'), icon: "🤷", autoNext: true },
              { label: t('questionnaire.affinities.paradiseBeaches'), icon: "🏖️" },
              { label: t('questionnaire.affinities.historicCities'), icon: "🏛️" },
              { label: t('questionnaire.affinities.natureHiking'), icon: "🥾" },
              { label: t('questionnaire.affinities.skiWinterSports'), icon: "⛷️" },
              { label: t('questionnaire.affinities.safariAnimals'), icon: "🦁" },
              { label: t('questionnaire.affinities.localGastronomy'), icon: "🍽️" },
              { label: t('questionnaire.affinities.shoppingFashion'), icon: "🛍️" },
              { label: t('questionnaire.affinities.festivalsEvents'), icon: "🎭" },
              { label: t('questionnaire.affinities.modernArchitecture'), icon: "🏙️" },
              { label: t('questionnaire.affinities.templesSpirituality'), icon: "🕌" },
              { label: t('questionnaire.affinities.amusementParks'), icon: "🎢" },
              { label: t('questionnaire.affinities.divingSnorkeling'), icon: "🤿" },
              { label: t('questionnaire.affinities.roadTripFreedom'), icon: "🚗" },
              { label: t('questionnaire.affinities.vineyardsWine'), icon: "🍷" },
              { label: t('questionnaire.affinities.desertsLunar'), icon: "🏜️" },
              { label: t('questionnaire.affinities.islandsArchipelagos'), icon: "🏝️" }
            ].map((option) => {
              const isSelected = (answers.travelAffinities || []).includes(option.label);
              const isDisabled = !isSelected && (answers.travelAffinities || []).length >= 5;
              return (
                <Card
                  key={option.label}
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    if (!isDisabled || option.label === t('questionnaire.affinities.dontMind')) {
                      // Logique spéciale pour "Peu importe"
                      if (option.label === t('questionnaire.affinities.dontMind')) {
                        setAnswers({ ...answers, travelAffinities: [option.label] });
                        setTimeout(() => nextStep(true), 300);
                      } else {
                        // Retirer "Peu importe" si présent
                        const current = (answers.travelAffinities || []).filter(
                          a => a !== t('questionnaire.affinities.dontMind')
                        );
                        const updated = current.includes(option.label)
                          ? current.filter(a => a !== option.label)
                          : current.length < 5 ? [...current, option.label] : current;
                        
                        setAnswers({ ...answers, travelAffinities: updated });
                        
                        if (updated.length === 5) {
                          setTimeout(() => nextStep(true), 300);
                        }
                      }
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{option.icon}</span>
                    <span className="text-base font-semibold text-travliaq-deep-blue">
                      {option.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              disabled={!answers.travelAffinities || answers.travelAffinities.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO) stepCounter++;

    // Step 2e: Ambiance recherchée (si Non)
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO && step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.ambiance.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.ambiance.description')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.ambiance.adventureExotic'), icon: "🧭", desc: t('questionnaire.ambiance.adventureExotic.desc') },
              { label: t('questionnaire.ambiance.relaxation'), icon: "🧘", desc: t('questionnaire.ambiance.relaxation.desc') },
              { label: t('questionnaire.ambiance.romanceIntimacy'), icon: "💕", desc: t('questionnaire.ambiance.romanceIntimacy.desc') },
              { label: t('questionnaire.ambiance.culturalDiscovery'), icon: "🎭", desc: t('questionnaire.ambiance.culturalDiscovery.desc') },
              { label: t('questionnaire.ambiance.partyNightlife'), icon: "🎉", desc: t('questionnaire.ambiance.partyNightlife.desc') },
              { label: t('questionnaire.ambiance.familyConviviality'), icon: "👨‍👩‍👧‍👦", desc: t('questionnaire.ambiance.familyConviviality.desc') }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-3 md:p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("travelAmbiance", option.label)}
              >
                <div className="flex items-center space-x-2 md:space-x-4">
                  <span className="text-2xl md:text-4xl">{option.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs md:text-lg font-semibold text-travliaq-deep-blue">
                      {option.label}
                    </span>
                    <span className="text-[10px] md:text-sm text-muted-foreground">
                      {option.desc}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO) stepCounter++;

    // Step 2g: Ville de départ (si destination flexible)
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.whereFrom')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.whereFrom.description')}
          </p>
          <div className="max-w-xl mx-auto space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-travliaq-deep-blue flex items-center gap-1.5">
                  {t('questionnaire.whereFrom')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center justify-center">
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-travliaq-deep-blue transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          {t('questionnaire.cityTooltip')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestGeolocation}
                  disabled={isLoadingLocation}
                  className="text-xs"
                >
                  {isLoadingLocation ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      {t('questionnaire.detecting')}
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-1 h-3 w-3" />
                      {t('questionnaire.myPosition')}
                    </>
                  )}
                </Button>
              </div>
              <CitySearch
                value={answers.departureLocation || ""}
                onChange={(value) => setAnswers({ ...answers, departureLocation: value })}
                placeholder={t('questionnaire.departureCity')}
              />
            </div>

            <div className="flex justify-center pt-4">
              <Button
                variant="hero"
                size="lg"
                onClick={() => nextStep()}
                disabled={!answers.departureLocation || answers.departureLocation.trim() === ''}
                className="bg-travliaq-deep-blue"
              >
                {t('questionnaire.continue')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (normalizeYesNo(answers.hasDestination) === YES_NO.NO) stepCounter++;

    // Step 3: Dates
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.dates.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.dates.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { code: DATES_TYPE.FIXED, label: t('questionnaire.dates.fixed'), icon: "📆" },
              { code: DATES_TYPE.FLEXIBLE, label: t('questionnaire.dates.flexible'), icon: "🔄" }
            ].map((option) => (
              <Card
                key={option.code}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("datesType", option.code)}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 3b: Dates fixes - NOUVEAU SYSTEME RANGE
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FIXED && step === stepCounter) {
      const departureDate = answers.departureDate ? new Date(answers.departureDate) : undefined;
      const returnDate = answers.returnDate ? new Date(answers.returnDate) : undefined;
      
      const selectedRange: DateRange | undefined = departureDate && returnDate ? {
        from: departureDate,
        to: returnDate
      } : departureDate ? {
        from: departureDate,
        to: undefined
      } : undefined;

      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.dates.selectDates')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.dates.selectDates.description')}
          </p>
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-travliaq-deep-blue text-center">
                {t('questionnaire.dates.clickInstruction')}
              </label>
              <div className="flex flex-col items-center gap-3">
                <DateRangePicker
                  value={selectedRange}
                  onChange={(range) => {
                    if (range?.from) {
                      setAnswers({
                        ...answers,
                        departureDate: format(range.from, "yyyy-MM-dd"),
                        returnDate: range.to ? format(range.to, "yyyy-MM-dd") : undefined,
                      });
                      if (range.to && range.from.getTime() !== range.to.getTime()) {
                        setTimeout(() => setDatePickerOpen(false), 300);
                      }
                    }
                  }}
                  disabled={(date) => date < startOfToday()}
                  open={datePickerOpen}
                  onOpenChange={setDatePickerOpen}
                  className="w-full"
                />
                {(departureDate || returnDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setAnswers({
                        ...answers,
                        departureDate: undefined,
                        returnDate: undefined
                      });
                      setBaseMonth(startOfMonth(new Date()));
                    }}
                  >
                    <span className="mr-2">🔄</span>
                    {t('questionnaire.dates.reset')}
                  </Button>
                )}
              </div>
            </div>

            {/* Display duration if both dates are selected */}
            {departureDate && returnDate && (
              <div className="text-center p-4 bg-travliaq-sky-blue/10 rounded-lg border border-travliaq-deep-blue/20">
                <p className="text-lg text-travliaq-deep-blue">
                  <span className="font-semibold">{t('questionnaire.dates.duration')}</span>{" "}
                  {Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24))} {t('questionnaire.dates.days')}
                </p>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                variant="hero"
                size="lg"
                onClick={() => nextStep()}
                disabled={!departureDate || !returnDate}
                className="bg-travliaq-deep-blue"
              >
                {t('questionnaire.continue')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FIXED) stepCounter++;

    // Step 3c: Flexibilité (si flexible)
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.flexibility.souplesse')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.flexibility.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.flexibility.0days'), icon: "🎯" },
              { label: t('questionnaire.flexibility.3days'), icon: "📅" },
              { label: t('questionnaire.flexibility.7days'), icon: "🗓️" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("flexibility", option.label)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-4xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE) stepCounter++;

    // Step 3d: Date de départ approximative (si flexible)
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.flexibility.hasApproxDate')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.flexibility.hasApproxDate.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { code: YES_NO.YES, label: t('questionnaire.flexibility.hasApproxDate.yes'), icon: "✅" },
              { code: YES_NO.NO, label: t('questionnaire.flexibility.hasApproxDate.no'), icon: "❌" }
            ].map((option) => (
              <Card
                key={option.code}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("hasApproximateDepartureDate", option.code)}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE) stepCounter++;

    // Step 3e: Saisie date approximative (si l'utilisateur a dit "Oui")
    if (normalizeYesNo(answers.hasApproximateDepartureDate) === YES_NO.YES && step === stepCounter) {
      const approximateDate = answers.approximateDepartureDate 
        ? new Date(answers.approximateDepartureDate) 
        : undefined;

      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.flexibility.approxDate')}
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              {t('questionnaire.flexibility.clickDate')}
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <SimpleDatePicker
                selected={approximateDate}
                onSelect={(date) => {
                  setAnswers({
                    ...answers,
                    approximateDepartureDate: format(date, "yyyy-MM-dd"),
                  });
                }}
                minDate={startOfToday()}
              />

              {approximateDate && (
                  <div className="flex flex-col items-center gap-3 w-full max-w-md">
                    <div className="text-center p-4 bg-travliaq-sky-blue/10 rounded-lg border border-travliaq-deep-blue/20 w-full">
                      <p className="text-lg text-travliaq-deep-blue">
                        <span className="font-semibold">{t('questionnaire.flexibility.dateSelected')}</span>{" "}
                        {format(approximateDate, "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAnswers({
                        ...answers,
                        approximateDepartureDate: undefined
                      });
                    }}
                  >
                    <span className="mr-2">🔄</span>
                    Réinitialiser la date
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                variant="hero"
                size="lg"
                onClick={() => nextStep()}
                disabled={!answers.approximateDepartureDate}
                className="bg-travliaq-deep-blue"
              >
                {t('questionnaire.continue')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (normalizeYesNo(answers.hasApproximateDepartureDate) === YES_NO.YES) stepCounter++;

    // Step 4: Durée (only if flexible dates)
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE && step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.duration.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.duration.description')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 max-w-3xl mx-auto">
            {[
              { label: t('questionnaire.duration.2nights'), icon: "🌙" },
              { label: t('questionnaire.duration.3nights'), icon: "🌙🌙" },
              { label: t('questionnaire.duration.4nights'), icon: "🌃" },
              { label: t('questionnaire.duration.5nights'), icon: "🌃" },
              { label: t('questionnaire.duration.6nights'), icon: "🌆" },
              { label: t('questionnaire.duration.7nights'), icon: "🌆" },
              { label: t('questionnaire.duration.8to10'), icon: "🌇" },
              { label: t('questionnaire.duration.11to14'), icon: "🌇" },
              { label: t('questionnaire.duration.more14'), icon: "🌉" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-2 md:p-4 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("duration", option.label)}
              >
                <div className="flex flex-col items-center space-y-1 md:space-y-2">
                  <span className="text-xl md:text-2xl">{option.icon}</span>
                  <span className="text-center font-semibold text-travliaq-deep-blue text-xs md:text-sm">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE) stepCounter++;

    // Step 4b: Nombre exact de nuits (uniquement si dates FLEXIBLES et >14 nuits)
    if (
      normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE &&
      answers.duration === t('questionnaire.duration.more14') &&
      step === stepCounter
    ) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.duration.exactNights')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.duration.exactNights.description')}
          </p>
          <div className="max-w-xl mx-auto space-y-4">
            <Input
              type="number"
              min="15"
              max="90"
              placeholder="Ex: 21"
              className="h-12 text-base text-center text-2xl"
              value={answers.exactNights || ""}
              onChange={(e) => setAnswers({ ...answers, exactNights: parseInt(e.target.value) || 0 })}
              onKeyPress={(e) => handleKeyPress(e, nextStep, !!answers.exactNights && answers.exactNights >= 15)}
            />
            <div className="flex justify-center">
              <Button
                variant="hero"
                size="lg"
                onClick={() => nextStep()}
                disabled={!answers.exactNights || answers.exactNights < 15}
                className="bg-travliaq-deep-blue"
              >
                {t('questionnaire.continue')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (normalizeDatesType(answers.datesType) === DATES_TYPE.FLEXIBLE && answers.duration === t('questionnaire.duration.more14')) stepCounter++;

    // Step 5: Budget
    if (step === stepCounter) {
      return (
        <div className="space-y-3 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.budget.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.budget.description')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-3xl mx-auto">
            {[
              { label: t('questionnaire.budget.dontKnow'), icon: "🤷" },
              { label: t('questionnaire.budget.precise'), icon: "🎯" },
              { label: t('questionnaire.budget.less300'), icon: "💵" },
              { label: t('questionnaire.budget.300to600'), icon: "💶" },
              { label: t('questionnaire.budget.600to900'), icon: "💷" },
              { label: t('questionnaire.budget.900to1200'), icon: "💴" },
              { label: t('questionnaire.budget.1200to1800'), icon: "💸" },
              { label: t('questionnaire.budget.more1800'), icon: "💎" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-3 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => {
                  if (option.label === t('questionnaire.budget.precise')) {
                    setAnswers({ ...answers, budgetType: t('questionnaire.budget.precise') });
                    setTimeout(() => nextStep(true), 300);
                  } else {
                    setAnswers({ ...answers, budgetPerPerson: option.label, budgetType: undefined });
                    setTimeout(() => nextStep(true), 300);
                  }
                }}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-xs md:text-sm font-semibold text-travliaq-deep-blue text-center">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 5b: Budget précis
    if (answers.budgetType === t('questionnaire.budget.precise') && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.budget.totalBudget')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.budget.totalBudget.description')}
          </p>
          <div className="max-w-xl mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('questionnaire.budget.amount')}</label>
              <Input
                type="number"
                min="0"
                step="50"
                placeholder="Ex: 2500"
                className="h-12 text-base text-center text-2xl"
                value={answers.budgetAmount || ""}
                onChange={(e) => setAnswers({ ...answers, budgetAmount: parseInt(e.target.value) || 0 })}
                onKeyPress={(e) => handleKeyPress(e, nextStep, !!answers.budgetAmount && !!answers.budgetCurrency)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('questionnaire.budget.currency')}</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "EUR", icon: "€" },
                  { label: "USD", icon: "$" },
                  { label: "GBP", icon: "£" }
                ].map((currency) => {
                  const isSelected = answers.budgetCurrency === currency.label;
                  return (
                    <Card
                      key={currency.label}
                      className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                        isSelected 
                          ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                          : "hover:shadow-golden hover:border-travliaq-deep-blue"
                      }`}
                      onClick={() => setAnswers({ ...answers, budgetCurrency: currency.label })}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <span className="text-3xl">{currency.icon}</span>
                        <span className="font-semibold text-travliaq-deep-blue">
                          {currency.label}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-center">
              <Button
                variant="hero"
                size="lg"
                onClick={() => nextStep()}
                disabled={!answers.budgetAmount || !answers.budgetCurrency}
                className="bg-travliaq-deep-blue"
              >
                {t('questionnaire.continue')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (answers.budgetType === t('questionnaire.budget.precise')) stepCounter++;

    // Step 6: Style (max 5 au lieu de 3) - SEULEMENT si destination précise ET activités sélectionnées
    const helpWithForStyle = answers.helpWith || [];
    const hasActivitiesForStyle = helpWithForStyle.includes(HELP_WITH.ACTIVITIES);
    if (normalizeYesNo(answers.hasDestination) === YES_NO.YES && hasActivitiesForStyle && step === stepCounter) {
      return (
        <div className="space-y-3 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.styles.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.styles.description')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-3xl mx-auto">
            {[
              { label: t('questionnaire.styles.nature'), icon: "🌲" },
              { label: t('questionnaire.styles.cultureMuseums'), icon: "🏛️" },
              { label: t('questionnaire.styles.food'), icon: "🍽️" },
              { label: t('questionnaire.styles.beach'), icon: "🏖️" },
              { label: t('questionnaire.styles.mountainHiking'), icon: "⛰️" },
              { label: t('questionnaire.styles.photoSpots'), icon: "📸" },
              { label: t('questionnaire.styles.localMarkets'), icon: "🏪" },
              { label: t('questionnaire.styles.sportOutdoor'), icon: "🚴" },
              { label: t('questionnaire.styles.wellnessSpa'), icon: "🧘" },
              { label: t('questionnaire.styles.nightlife'), icon: "🎉" }
            ].map((option) => {
              const isSelected = (answers.styles || []).includes(option.label);
              const isDisabled = !isSelected && (answers.styles || []).length >= 5;
              return (
                <Card
                  key={option.label}
                  className={`p-3 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    if (!isDisabled) {
                      handleMultiChoice("styles", option.label, 5);
                      // Auto-advance si 5 styles sont sélectionnés
                      const updated = (answers.styles || []).includes(option.label)
                        ? (answers.styles || []).filter(s => s !== option.label)
                        : [...(answers.styles || []), option.label];
                      if (updated.length === 5) {
                        setTimeout(() => nextStep(true), 300);
                      }
                    }
                  }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-2xl">{option.icon}</span>
                    <span className="text-xs md:text-sm font-semibold text-travliaq-deep-blue text-center">
                      {option.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              disabled={!answers.styles || answers.styles.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (normalizeYesNo(answers.hasDestination) === YES_NO.YES && hasActivitiesForStyle) stepCounter++;

    // Step 7 removed: replaced by unified RhythmStep later

    // Step 8: Vols - SEULEMENT si vols sélectionnés
    if (helpWithFlights.includes(HELP_WITH.FLIGHTS) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.flights.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.flights.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.flights.directOnly'), icon: "✈️" },
              { label: t('questionnaire.flights.max1Stop'), icon: "🛫" },
              { label: t('questionnaire.flights.dontMind'), icon: "💰" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("flightPreference", option.label)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-4xl">{option.icon}</span>
                  <span className="text-center font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if (helpWithFlights.includes(HELP_WITH.FLIGHTS)) stepCounter++;

    // Step 9: Bagages par voyageur - AVEC OPTION OBJET PERSONNEL - SEULEMENT si vols sélectionnés
    if (helpWithFlights.includes(HELP_WITH.FLIGHTS) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.luggage.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.luggage.description')}
          </p>
          <p className="text-center text-muted-foreground">
            {getNumberOfTravelers()} {getNumberOfTravelers() > 1 ? t('questionnaire.luggage.travelers_plural') : t('questionnaire.luggage.travelers')}
          </p>
          <div className="max-w-2xl mx-auto space-y-4">
            {Array.from({ length: getNumberOfTravelers() }).map((_, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium">
                  {t('questionnaire.luggage.traveler')} {index + 1} {index === 0 && answers.travelGroup === t('questionnaire.duo') ? "👤" : index === 1 && answers.travelGroup === t('questionnaire.duo') ? "👥" : "👤"}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('questionnaire.luggage.personalItem'), icon: "👜", desc: t('questionnaire.luggage.personalItem.desc') },
                    { label: t('questionnaire.luggage.cabin'), icon: "🎒", desc: t('questionnaire.luggage.cabin.desc') },
                    { label: t('questionnaire.luggage.cabinHold'), icon: "🧳", desc: t('questionnaire.luggage.cabinHold.desc') }
                  ].map((option) => {
                    const isSelected = answers.luggage?.[index] === option.label;
                    return (
                      <Card
                        key={option.label}
                        className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                          isSelected 
                            ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                            : "hover:shadow-golden hover:border-travliaq-deep-blue"
                        }`}
                        onClick={() => {
                          const newLuggage = { ...(answers.luggage || {}) };
                          newLuggage[index] = option.label;
                          setAnswers({ ...answers, luggage: newLuggage });
                          
                          // Auto-advance if all travelers have selected luggage
                          if (Object.keys(newLuggage).length === getNumberOfTravelers()) {
                            setTimeout(() => nextStep(true), 300);
                          }
                        }}
                      >
                        <div className="flex flex-col items-center space-y-1 text-center">
                          <span className="text-2xl">{option.icon}</span>
                          <span className="text-sm font-semibold text-travliaq-deep-blue">
                            {option.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {option.desc}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (helpWithFlights.includes(HELP_WITH.FLIGHTS)) stepCounter++;

    // Step 10: Mobilité (multi-choix + exhaustif) - SEULEMENT si pas uniquement vols
    const helpWithMobility = answers.helpWith || [];
    const onlyFlights = helpWithMobility.length === 1 && helpWithMobility.includes(HELP_WITH.FLIGHTS);
    if (!onlyFlights && step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.mobility.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.mobility.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.mobility.dontMind'), icon: "🤷", autoNext: true },
              { label: t('questionnaire.mobility.walking'), icon: "🚶" },
              { label: t('questionnaire.mobility.taxi.full'), icon: "🚕" },
              { label: t('questionnaire.mobility.rentalCar.full'), icon: "🚗" },
              { label: t('questionnaire.mobility.bike.full'), icon: "🚲" },
              { label: t('questionnaire.mobility.electricScooter'), icon: "🛴" },
              { label: t('questionnaire.mobility.motorbikeScooter'), icon: "🏍️" },
              { label: t('questionnaire.mobility.touristBus'), icon: "🚌" },
              { label: t('questionnaire.mobility.trainMetro'), icon: "🚇" },
              { label: t('questionnaire.mobility.ferry.full'), icon: "⛴️" },
              { label: t('questionnaire.mobility.atypical.full'), icon: "🐪" }
            ].map((option) => {
              const isSelected = (answers.mobility || []).includes(option.label);
              return (
                <Card
                  key={option.label}
                  className={`p-2 md:p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    handleMultiChoiceWithDontMind(
                      "mobility", 
                      option.label, 
                      t('questionnaire.mobility.dontMind'),
                      option.autoNext
                    );
                  }}
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-2xl md:text-3xl">{option.icon}</span>
                    <span className="text-sm md:text-lg font-semibold text-travliaq-deep-blue">
                      {option.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2 md:pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => {
                const mobility = answers.mobility || [];
                
                // Vérifier si UNIQUEMENT transport atypique OU bateau/ferry OU les deux ensemble
                const hasAtypical = mobility.includes(t('questionnaire.mobility.atypical.full'));
                const hasFerry = mobility.includes(t('questionnaire.mobility.ferry.full'));
                const hasOtherTransport = mobility.some(m => m !== t('questionnaire.mobility.atypical.full') && m !== t('questionnaire.mobility.ferry.full'));
                
                // Si l'utilisateur a sélectionné uniquement atypique, ferry, ou les deux sans autre transport
                if ((hasAtypical || hasFerry) && !hasOtherTransport) {
                  toast({
                    title: t('questionnaire.mobility.incompleteSelection'),
                    description: t('questionnaire.mobility.selectOtherTransport'),
                    variant: "destructive"
                  });
                  return;
                }
                nextStep();
              }}
              disabled={!answers.mobility || answers.mobility.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (!onlyFlights) stepCounter++;

    // Déclarer helpWithAccommodation ici pour qu'elle soit disponible pour tous les steps suivants
    // (déjà déclaré en haut de renderStep)

    // Step 11: Type hébergement (max 2 + "Peu importe") - SEULEMENT si hébergement sélectionné
    if (helpWithAccommodation.includes(HELP_WITH.ACCOMMODATION) && step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.accommodationType.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.accommodationType.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.accommodationType.dontMind'), icon: "🤷" },
              { label: t('questionnaire.accommodationType.hotel'), icon: "🏨" },
              { label: t('questionnaire.accommodationType.apartment'), icon: "🏠" },
              { label: t('questionnaire.accommodationType.hostel'), icon: "🛏️" },
              { label: t('questionnaire.accommodationType.guesthouse'), icon: "🏡" },
              { label: t('questionnaire.accommodationType.lodge'), icon: "🌿" },
              { label: t('questionnaire.accommodationType.camping'), icon: "⛺" },
              { label: t('questionnaire.accommodationType.bedBreakfast'), icon: "🛋️" },
              { label: t('questionnaire.accommodationType.resort'), icon: "🏖️" }
            ].map((option) => {
              const currentSelection = answers.accommodationType || [];
              const isSelected = currentSelection.includes(option.label);
              const hasPeuImporte = currentSelection.includes(t('questionnaire.accommodationType.dontMind'));
              const isDisabled = !isSelected && currentSelection.length >= 2 && option.label !== t('questionnaire.accommodationType.dontMind') && !hasPeuImporte;
              
              return (
                <Card
                  key={option.label}
                  className={`p-3 md:p-6 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    if (option.label === t('questionnaire.accommodationType.dontMind')) {
                      // "Peu importe" remplace toute autre sélection
                      setAnswers({ ...answers, accommodationType: [option.label] });
                      setTimeout(() => nextStep(true), 300);
                    } else if (!isDisabled) {
                      // Si "Peu importe" est déjà sélectionné, le retirer d'abord
                      const filteredSelection = currentSelection.filter(item => item !== t('questionnaire.accommodationType.dontMind'));
                      const updated = filteredSelection.includes(option.label)
                        ? filteredSelection.filter(v => v !== option.label)
                        : filteredSelection.length >= 2
                        ? filteredSelection
                        : [...filteredSelection, option.label];
                      setAnswers({ ...answers, accommodationType: updated });
                      
                      // Auto-advance if 2 types are selected
                      if (updated.length === 2) {
                        setTimeout(() => nextStep(true), 300);
                      }
                    }
                  }}
                >
                  <div className="flex items-center space-x-2 md:space-x-4">
                    <span className="text-2xl md:text-3xl">{option.icon}</span>
                    <span className="text-sm md:text-lg font-semibold text-travliaq-deep-blue">
                      {option.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2 md:pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              disabled={!answers.accommodationType || answers.accommodationType.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (helpWithAccommodation.includes(HELP_WITH.ACCOMMODATION)) stepCounter++;

    // Step 11b: Détails hôtel (SI Hôtel est sélectionné ET hébergement sélectionné)
    if (helpWithAccommodation.includes(HELP_WITH.ACCOMMODATION) && (answers.accommodationType || []).includes(t('questionnaire.accommodationType.hotel')) && step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.hotelPreferences.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.hotelPreferences.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.hotelPreferences.dontMind'), icon: "🤷", autoNext: true },
              { label: t('questionnaire.hotelPreferences.breakfast'), icon: "🥐" },
              { label: t('questionnaire.hotelPreferences.halfBoard'), icon: "🍽️" },
              { label: t('questionnaire.hotelPreferences.fullBoard'), icon: "🍴" },
              { label: t('questionnaire.hotelPreferences.allInclusive'), icon: "🍹" },
              { label: t('questionnaire.hotelPreferences.roomService'), icon: "🛎️" },
              { label: t('questionnaire.hotelPreferences.minibar'), icon: "🍾" },
              { label: t('questionnaire.hotelPreferences.view'), icon: "🌅" },
              { label: t('questionnaire.hotelPreferences.balcony'), icon: "🪴" },
              { label: t('questionnaire.hotelPreferences.concierge'), icon: "🎩" }
            ].map((option) => {
              const isSelected = (answers.hotelPreferences || []).includes(option.label);
              return (
                <Card
                  key={option.label}
                  className={`p-2 md:p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    handleMultiChoiceWithDontMind(
                      "hotelPreferences", 
                      option.label, 
                      t('questionnaire.hotelPreferences.dontMind'),
                      option.autoNext
                    );
                  }}
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-2xl md:text-3xl">{option.icon}</span>
                    <span className="text-xs md:text-base font-semibold text-travliaq-deep-blue">
                      {option.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2 md:pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (helpWithAccommodation.includes(HELP_WITH.ACCOMMODATION) && (answers.accommodationType || []).includes(t('questionnaire.accommodationType.hotel'))) stepCounter++;

    // Step 12: Confort - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes(HELP_WITH.ACCOMMODATION) && step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.comfort.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.comfort.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.comfort.dontMind'), icon: "🤷", autoNext: true },
              { label: t('questionnaire.comfort.rating75'), icon: "⭐" },
              { label: t('questionnaire.comfort.rating80'), icon: "⭐⭐" },
              { label: t('questionnaire.comfort.rating85'), icon: "⭐⭐⭐" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-3 md:p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => {
                  handleChoice("comfort", option.label);
                }}
              >
                <div className="flex items-center space-x-2 md:space-x-4">
                  <span className="text-2xl md:text-3xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes(HELP_WITH.ACCOMMODATION)) stepCounter++;

    // Step 13: Quartier - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes(HELP_WITH.ACCOMMODATION) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.neighborhood.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.neighborhood.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.neighborhood.quiet'), icon: "🌙" },
              { label: t('questionnaire.neighborhood.centralLively'), icon: "🏙️" },
              { label: t('questionnaire.neighborhood.nearNatureBeach'), icon: "🏖️" },
              { label: t('questionnaire.neighborhood.atypicalCharm'), icon: "🏘️" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("neighborhood", option.label)}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes(HELP_WITH.ACCOMMODATION)) stepCounter++;

    // Step 14: Équipements (plus laïc) - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes(HELP_WITH.ACCOMMODATION) && step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.amenities.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.amenities.description')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.amenities.dontMind'), icon: "🤷", autoNext: true },
              { label: t('questionnaire.amenities.reliableWifi'), icon: "📶" },
              { label: t('questionnaire.amenities.airConditioning'), icon: "❄️" },
              { label: t('questionnaire.amenities.kitchen'), icon: "🍳" },
              { label: t('questionnaire.amenities.washingMachine'), icon: "🧺" },
              { label: t('questionnaire.amenities.parking'), icon: "🅿️" },
              { label: t('questionnaire.amenities.elevator'), icon: "🛗" },
              { label: t('questionnaire.amenities.reception24'), icon: "🔔" },
              { label: t('questionnaire.amenities.babyCrib'), icon: "👶" },
              { label: t('questionnaire.amenities.familyRoom'), icon: "👨‍👩‍👧‍👦" },
              { label: t('questionnaire.amenities.pool'), icon: "🏊" },
              { label: t('questionnaire.amenities.gym'), icon: "💪" },
              { label: t('questionnaire.amenities.spa'), icon: "🧖" },
              { label: t('questionnaire.amenities.gardenTerrace'), icon: "🌳" }
            ].map((option) => {
              const isSelected = (answers.amenities || []).includes(option.label);
              return (
                <Card
                  key={option.label}
                  className={`p-2 md:p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    handleMultiChoiceWithDontMind(
                      "amenities", 
                      option.label, 
                      t('questionnaire.amenities.dontMind'),
                      option.autoNext
                    );
                  }}
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-lg md:text-2xl">{option.icon}</span>
                    <span className="text-xs md:text-base font-semibold text-travliaq-deep-blue">
                      {option.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2 md:pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes(HELP_WITH.ACCOMMODATION)) stepCounter++;

    // Step 15: Sécurité & Phobies (seulement si hébergement OU activités sélectionnés, pas juste vols)
    const helpWithForSecurity = answers.helpWith || [];
    const needsAccommodationForSecurity = helpWithForSecurity.includes(HELP_WITH.ACCOMMODATION);
    const needsActivitiesForSecurity = helpWithForSecurity.includes(HELP_WITH.ACTIVITIES);
    const needsSecurityStep = needsAccommodationForSecurity || needsActivitiesForSecurity;
    if (needsSecurityStep && step === stepCounter) {
      return (
        <SecurityStep
          security={answers.security || []}
          onUpdate={(security) => setAnswers({ ...answers, security })}
          onNext={nextStep}
        />
      );
    }
    if (needsSecurityStep) stepCounter++;

    // Step 16: Rythme & horaires (seulement si activités sélectionnées)
    if (needsActivitiesForSecurity && step === stepCounter) {
      return (
        <RhythmStep
          rhythm={answers.rhythm || ""}
          schedulePrefs={answers.schedulePrefs || []}
          onUpdateRhythm={(rhythm) => setAnswers({ ...answers, rhythm })}
          onUpdateSchedulePrefs={(schedulePrefs) => setAnswers({ ...answers, schedulePrefs })}
          onNext={nextStep}
        />
      );
    }
    if (needsActivitiesForSecurity) stepCounter++;

    // Step 17: Contraintes & préférences (plus laïc et inclusif)
    if (step === stepCounter) {
      return (
        <div className="space-y-3 md:space-y-8 animate-fade-up">
          <h2 className="text-xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.constraints.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.constraints.description')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.constraints.dontMind'), icon: "🤷" },
              { label: t('questionnaire.constraints.halal'), icon: "🥙" },
              { label: t('questionnaire.constraints.kosher'), icon: "✡️" },
              { label: t('questionnaire.constraints.vegetarian'), icon: "🥗" },
              { label: t('questionnaire.constraints.vegan'), icon: "🌱" },
              { label: t('questionnaire.constraints.glutenFree'), icon: "🌾" },
              { label: t('questionnaire.constraints.noPork'), icon: "🚫🥓" },
              { label: t('questionnaire.constraints.noAlcohol'), icon: "🚫🍷" },
              { label: t('questionnaire.constraints.prayerPlaces'), icon: "🛐" },
              { label: t('questionnaire.constraints.buddhistTraditions'), icon: "☸️" },
              { label: t('questionnaire.constraints.accessibility'), icon: "♿" },
              { label: t('questionnaire.constraints.safezones'), icon: "🛡️" },
              { label: t('questionnaire.constraints.avoidCar'), icon: "🚫🚗" },
              { label: t('questionnaire.constraints.localTraditions'), icon: "🕊️" },
              { label: t('questionnaire.constraints.foodAllergies'), icon: "⚠️" }
            ].map((option) => {
              const currentSelection = answers.constraints || [];
              const isSelected = currentSelection.includes(option.label);
              const hasPeuImporte = currentSelection.includes(t('questionnaire.constraints.dontMind'));
              
              return (
                <Card
                  key={option.label}
                  className={`p-2 md:p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    if (option.label === t('questionnaire.constraints.dontMind')) {
                      // "Peu importe" remplace toute autre sélection
                      setAnswers({ ...answers, constraints: [option.label] });
                      setTimeout(() => nextStep(true), 300);
                    } else {
                      // Si "Peu importe" est déjà sélectionné, le retirer d'abord
                      const filteredSelection = currentSelection.filter(item => item !== t('questionnaire.constraints.dontMind'));
                      const updated = filteredSelection.includes(option.label)
                        ? filteredSelection.filter(v => v !== option.label)
                        : [...filteredSelection, option.label];
                      setAnswers({ ...answers, constraints: updated });
                    }
                  }}
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-lg md:text-2xl">{option.icon}</span>
                    <span className="text-xs md:text-base font-semibold text-travliaq-deep-blue">
                      {option.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-center pt-2 md:pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => nextStep()}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 16: Zone ouverte - SANS LIMITE DE CARACTÈRES
    if (step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.additionalInfo.title')}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto">
            {t('questionnaire.additionalInfo.descriptionExtended')}
          </p>
          <p className="text-center text-muted-foreground">
            {t('questionnaire.additionalInfo.description')}
          </p>
          <div className="max-w-xl mx-auto space-y-4">
            <Textarea
              placeholder={t('questionnaire.additionalInfo.placeholder')}
              className="min-h-[150px] text-base"
              value={answers.additionalInfo || ""}
              onChange={(e) => setAnswers({ ...answers, additionalInfo: e.target.value })}
            />
            {answers.additionalInfo && (
              <div className="text-sm text-muted-foreground text-center">
                {answers.additionalInfo.length} {t('questionnaire.additionalInfo.characters')}
              </div>
            )}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => nextStep()}
              >
                {t('questionnaire.additionalInfo.skip')}
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => nextStep()}
                className="bg-travliaq-deep-blue"
              >
                {t('questionnaire.continue')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step final-1: Review & confirm
    if (step === stepCounter) {
      return (
        <ReviewStep
          answers={answers}
          email={answers.email || ""}
          onEmailChange={(email) => setAnswers({ ...answers, email })}
          onEdit={(section) => {
            // Sauvegarder l'étape de review pour y retourner
            setReturnToReviewStep(step);
            setIsEditMode(true);
            
            // Navigate back to the appropriate step based on section
            const sectionStepMap: Record<string, number> = {
              'group': 1,
              'destination': 2,
              'dates': 3,
              'budget': 5,
              'preferences': 6,
              'accommodation': 11,
              'constraints': 17
            };
            const targetStep = sectionStepMap[section];
            if (targetStep) {
              setStep(targetStep);
            }
          }}
          onSubmit={handleSubmitQuestionnaire}
          isSubmitting={isSubmitting}
        />
      );
    }
    stepCounter++;

    // Step final: Email (removed, now part of Review)

    return null;
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-travliaq-deep-blue/5 via-white to-travliaq-turquoise/10 relative overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-travliaq-turquoise/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-travliaq-golden-sand/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      {/* Navigation minimale */}
      <Navigation variant="minimal" />
      
      {/* Progress Bar améliorée */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gray-100 to-gray-200 z-50 shadow-md">
        <div 
          className="h-full bg-gradient-to-r from-travliaq-deep-blue via-travliaq-turquoise to-travliaq-golden-sand transition-all duration-500 ease-out relative overflow-hidden shadow-lg"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
        </div>
      </div>

      {/* Header ultra-compact */}
      <div className="pt-20 pb-4 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-xl md:text-2xl font-montserrat font-bold bg-gradient-to-r from-travliaq-deep-blue via-travliaq-turquoise to-travliaq-deep-blue bg-clip-text text-transparent">
              {t('questionnaire.customTrip')}
            </h1>
            <div className="flex items-center gap-2 bg-gradient-to-r from-travliaq-turquoise/20 to-travliaq-golden-sand/20 px-4 py-2 rounded-full border border-travliaq-turquoise/30 shadow-sm">
              <span className="text-xs text-travliaq-deep-blue/70 font-medium">
                {step}/{totalSteps}
              </span>
              <span className="text-xs font-bold text-travliaq-deep-blue">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content compact */}
      <div className="max-w-3xl mx-auto px-4 py-2 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                className="text-travliaq-deep-blue hover:text-travliaq-turquoise hover:bg-travliaq-turquoise/10 transition-all"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('questionnaire.back')}
              </Button>
            )}
            
            {isEditMode && returnToReviewStep !== null && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setStep(returnToReviewStep);
                  setIsEditMode(false);
                  setReturnToReviewStep(null);
                }}
                className="bg-travliaq-turquoise hover:bg-travliaq-turquoise/90 text-white transition-all"
              >
                {t('questionnaire.backToReview')}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (user) {
                  const draftKey = `travliaq:qv2:${user.id}`;
                  const draft = {
                    version: 2,
                    timestamp: Date.now(),
                    step,
                    answers
                  };
                  localStorage.setItem(draftKey, JSON.stringify(draft));
                  toast({
                    title: t('questionnaire.draftSaved'),
                    description: t('questionnaire.draftSavedDesc'),
                    duration: 3000
                  });
                  setTimeout(() => navigate('/'), 500);
                }
              }}
              className="text-travliaq-deep-blue border-travliaq-deep-blue hover:bg-travliaq-deep-blue hover:text-white transition-all flex-1 sm:flex-none whitespace-nowrap"
            >
              {t('questionnaire.saveAndReturn')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/50 h-9 px-3 text-sm flex-1 sm:flex-none whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Repartir de zéro
            </Button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-travliaq-turquoise/20 p-6 md:p-8 transition-all hover:shadow-[0_20px_60px_-15px_rgba(56,189,248,0.3)]">
          {renderStep()}
        </div>
      </div>

      {/* Google Login Popup */}
      {showGoogleLogin && (
        <GoogleLoginPopup 
          onClose={() => setShowGoogleLogin(false)}
          onSuccess={handleGoogleLoginSuccess}
        />
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="animate-scale-in border-2 border-red-500/20 shadow-2xl shadow-red-500/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 rounded-full animate-pulse">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-2xl text-red-600">
                Repartir de zéro ?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Êtes-vous sûr de vouloir recommencer le questionnaire ? Toutes vos réponses actuelles seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="hover:scale-105 transition-transform">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetQuestionnaire}
              className="bg-red-600 hover:bg-red-700 hover:scale-105 transition-all shadow-lg hover:shadow-red-500/50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Oui, tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Questionnaire;

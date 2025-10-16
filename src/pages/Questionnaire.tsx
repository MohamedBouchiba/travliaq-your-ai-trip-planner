import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Info
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
import DateRangePicker from "@/components/DateRangePicker";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfToday, addMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useCities, useFilteredCities } from "@/hooks/useCities";

type LuggageChoice = {
  [travelerIndex: number]: string;
};

type Answer = {
  travelGroup?: string;
  numberOfTravelers?: number;
  hasDestination?: string;
  helpWith?: string[]; // Nouvelle question: Comment Travliaq peut aider (vols, hébergement, activités)
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
  budget?: string;
  budgetType?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  styles?: string[];
  rhythm?: string;
  flightPreference?: string;
  luggage?: LuggageChoice;
  mobility?: string[];
  accommodationType?: string[];
  hotelPreferences?: string[];
  comfort?: string;
  neighborhood?: string;
  amenities?: string[];
  constraints?: string[];
  additionalInfo?: string;
  openComments?: string;
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Load cities from database
  const { data: cities, isLoading: citiesLoading } = useCities();
  
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answer>({});
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [departureSearch, setDepartureSearch] = useState("");
  const [showDepartureDropdown, setShowDepartureDropdown] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGoogleLogin, setShowGoogleLogin] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [approximateDatePickerOpen, setApproximateDatePickerOpen] = useState(false);
  const [baseMonth, setBaseMonth] = useState<Date>(startOfMonth(new Date()));
  const cityInputRef = useRef<HTMLInputElement>(null);
  const departureInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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
              setDepartureSearch(detectedLocation);
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
    
    if (answers.travelGroup === t('q.step1.family') || answers.travelGroup === t('q.step1.group')) total++; // Step 1b: Nombre exact
    total++; // Step 2: Destination en tête
    total++; // Step 2b: Comment Travliaq peut aider (vols/hébergement/activités)
    
    if (answers.hasDestination === t('q.step3.yes')) {
      total++; // Step 2c: Quelle destination
    } else if (answers.hasDestination === t('q.step3.no')) {
      total++; // Step 2d: Climat préféré
      total++; // Step 2e: Affinités de voyage
      total++; // Step 2f: Ambiance recherchée
    }
    
    total++; // Step 3: Dates
    
    if (answers.datesType === t('questionnaire.dates.fixed')) {
      total++; // Step 3b: Dates précises
    } else if (answers.datesType === t('questionnaire.dates.flexible')) {
      total++; // Step 3c: Flexibilité
      total++; // Step 3d: Date de départ approximative
      if (answers.hasApproximateDepartureDate === t('q.step8.approx.yes')) total++; // Step 3e: Saisie date approximative
      total++; // Step 4: Durée
      if (answers.duration === t('questionnaire.duration.more14')) total++; // Step 4b: Nombre exact
    }
    
    total++; // Step 5: Budget
    if (answers.budgetType === t('questionnaire.budget.precise')) total++; // Step 5b: Montant exact
    
    const helpWith = answers.helpWith || [];
    const needsFlights = helpWith.includes(t('q.step2.flights'));
    const needsAccommodation = helpWith.includes(t('q.step2.accommodation'));
    const needsActivities = helpWith.includes(t('q.step2.activities'));
    
    // Step 6: Style (seulement si destination précise ET activités sélectionnées)
    if (answers.hasDestination === t('q.step3.yes') && needsActivities) {
      total++; // Step 6: Style
    }
    
    // Step 7: Rythme (seulement si activités sélectionnées)
    if (needsActivities) {
      total++; // Step 7: Rythme
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
      if ((answers.accommodationType || []).includes("Hôtel")) total++; // Step 11b: Préférences hôtel
      total++; // Step 12: Confort
      total++; // Step 13: Quartier
      total++; // Step 14: Équipements
    }
    
    total++; // Step 15: Contraintes
    total++; // Step 16: Zone ouverte
    total++; // Step 17: Email
    
    return total;
  };

  const totalSteps = getTotalSteps();
  const progress = (step / totalSteps) * 100;

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleChoice = (field: keyof Answer, value: any) => {
    setAnswers({ ...answers, [field]: value });
    setTimeout(nextStep, 300);
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
      setTimeout(nextStep, 400);
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

  const filteredCities = useFilteredCities(citySearch, cities);
  const filteredDepartures = useFilteredCities(departureSearch, cities);

  const getNumberOfTravelers = (): number => {
    if (answers.numberOfTravelers) return answers.numberOfTravelers;
    
    switch(answers.travelGroup) {
      case "Solo": return 1;
      case "Duo": return 2;
      case "Groupe 3-5": return 4; // Default middle
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
        travel_group: z.string().max(100).optional().nullable(),
        number_of_travelers: z.number().int().min(1).max(50).optional().nullable(),
        has_destination: z.string().max(10).optional().nullable(),
        destination: z.string().trim().max(200).optional().nullable(),
        departure_location: z.string().trim().max(200).optional().nullable(),
        climate_preference: z.any().optional().nullable(),
        travel_affinities: z.array(z.string().max(200)).max(50).optional().nullable(),
        travel_ambiance: z.string().max(100).optional().nullable(),
        dates_type: z.string().max(50).optional().nullable(),
        departure_date: z.string().optional().nullable(),
        return_date: z.string().optional().nullable(),
        flexibility: z.string().max(50).optional().nullable(),
        has_approximate_departure_date: z.string().max(10).optional().nullable(),
        approximate_departure_date: z.string().optional().nullable(),
        duration: z.string().max(50).optional().nullable(),
        exact_nights: z.number().int().min(1).max(365).optional().nullable(),
        budget: z.string().max(100).optional().nullable(),
        budget_type: z.string().max(50).optional().nullable(),
        budget_amount: z.number().min(0).max(10000000).optional().nullable(),
        budget_currency: z.string().max(10).optional().nullable(),
        styles: z.any().optional().nullable(),
        rhythm: z.string().max(100).optional().nullable(),
        flight_preference: z.string().max(100).optional().nullable(),
        luggage: z.any().optional().nullable(),
        mobility: z.array(z.string().max(200)).max(50).optional().nullable(),
        accommodation_type: z.array(z.string().max(100)).max(20).optional().nullable(),
        comfort: z.string().max(100).optional().nullable(),
        neighborhood: z.string().max(200).optional().nullable(),
        amenities: z.array(z.string().max(200)).max(50).optional().nullable(),
        constraints: z.array(z.string().max(200)).max(50).optional().nullable(),
        additional_info: z.string().trim().max(2000).optional().nullable(),
        open_comments: z.string().trim().max(2000).optional().nullable(),
      });

      const responseData = {
        user_id: user?.id || null,
        email: answers.email || "",
        travel_group: answers.travelGroup || null,
        number_of_travelers: answers.numberOfTravelers || null,
        has_destination: answers.hasDestination || null,
        destination: answers.destination || null,
        departure_location: answers.departureLocation || null,
        climate_preference: answers.climatePreference || null,
        travel_affinities: answers.travelAffinities || null,
        travel_ambiance: answers.travelAmbiance || null,
        dates_type: answers.datesType || null,
        departure_date: answers.departureDate || null,
        return_date: answers.returnDate || null,
        flexibility: answers.flexibility || null,
        has_approximate_departure_date: answers.hasApproximateDepartureDate || null,
        approximate_departure_date: answers.approximateDepartureDate || null,
        duration: answers.duration || null,
        exact_nights: answers.exactNights || null,
        budget: answers.budget || null,
        budget_type: answers.budgetType || null,
        budget_amount: answers.budgetAmount || null,
        budget_currency: answers.budgetCurrency || null,
        styles: answers.styles || null,
        rhythm: answers.rhythm || null,
        flight_preference: answers.flightPreference || null,
        luggage: answers.luggage || null,
        mobility: answers.mobility || null,
        accommodation_type: answers.accommodationType || null,
        comfort: answers.comfort || null,
        neighborhood: answers.neighborhood || null,
        amenities: answers.amenities || null,
        constraints: answers.constraints || null,
        additional_info: answers.additionalInfo || null,
        open_comments: answers.openComments || null
      };

      // Validate all inputs before submission
      const validatedData = questionnaireSchema.parse(responseData);

      // Use secure edge function with rate limiting
      const { data, error } = await supabase.functions.invoke('submit-questionnaire', {
        body: validatedData
      });

      if (error) throw error;

      setSubmittedResponseId(data.data.id);
      
      // Trigger celebration animation
      triggerCelebration();
      
      toast({
        title: t('questionnaire.submittedTitle'),
        description: t('questionnaire.submittedDescription'),
      });

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

    // Step 1: Qui voyage
    if (step === stepCounter) {
      return (
        <div className="space-y-6 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-travliaq-deep-blue to-travliaq-turquoise bg-clip-text text-transparent">
            {t('questionnaire.whoTraveling')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.solo'), icon: "🧳" },
              { label: t('questionnaire.duo'), icon: "👥" },
              { label: t('questionnaire.group35'), icon: "👨‍👩‍👧" },
              { label: t('questionnaire.family'), icon: "👨‍👩‍👧‍👦" }
            ].map((option) => (
              <Card
                key={option.label}
                className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                  answers.travelGroup === option.label 
                    ? 'border-travliaq-turquoise bg-gradient-to-br from-travliaq-turquoise/10 to-travliaq-golden-sand/10 shadow-xl' 
                    : 'border-transparent hover:border-travliaq-turquoise/50 hover:shadow-lg'
                }`}
                onClick={() => handleChoice("travelGroup", option.label)}
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

    // Step 1b: Nombre exact de voyageurs (si Famille ou Groupe 3-5)
    if ((answers.travelGroup === t('q.step1.family') || answers.travelGroup === t('q.step1.group')) && step === stepCounter) {
      if (answers.travelGroup === t('q.step1.family')) {
        return (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
              {t('questionnaire.numberOfPeople')}
            </h2>
            <div className="max-w-xl mx-auto space-y-4">
              <Input
                type="number"
                min="2"
                max="12"
                placeholder="Ex: 4"
                className="h-12 text-base text-center text-2xl"
                value={answers.numberOfTravelers || ""}
                onChange={(e) => setAnswers({ ...answers, numberOfTravelers: parseInt(e.target.value) || 0 })}
                onKeyPress={(e) => handleKeyPress(e, nextStep, !!answers.numberOfTravelers && answers.numberOfTravelers >= 2)}
              />
              <div className="flex justify-center">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={nextStep}
                  disabled={!answers.numberOfTravelers || answers.numberOfTravelers < 2}
                  className="bg-travliaq-deep-blue"
                >
                  {t('questionnaire.continue')}
                </Button>
              </div>
            </div>
          </div>
        );
      } else {
        // Groupe 3-5: Choix entre 3, 4 ou 5
        return (
          <div className="space-y-8 animate-fade-up">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
              {t('questionnaire.howManyPeople')}
            </h2>
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
              {[
                { label: t('questionnaire.3people'), value: 3, icon: "👥" },
                { label: t('questionnaire.4people'), value: 4, icon: "👨‍👩‍👧" },
                { label: t('questionnaire.5people'), value: 5, icon: "👨‍👩‍👧‍👦" }
              ].map((option) => (
                <Card
                  key={option.value}
                  className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                  onClick={() => {
                    setAnswers({ ...answers, numberOfTravelers: option.value });
                    setTimeout(nextStep, 300);
                  }}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-4xl">{option.icon}</span>
                    <span className="text-lg font-semibold text-travliaq-deep-blue text-center">
                      {option.label}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      }
    }
    if (answers.travelGroup === t('q.step1.family') || answers.travelGroup === t('q.step1.group')) stepCounter++;

    // Step 2: Destination en tête ?
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.destinationInMind')}
          </h2>
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
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.howCanHelp')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.multipleSelectionPossible')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { label: t('questionnaire.flights'), icon: "✈️", desc: t('questionnaire.flights.desc') },
              { label: t('questionnaire.accommodation'), icon: "🏨", desc: t('questionnaire.accommodation.desc') },
              { label: t('questionnaire.activities'), icon: "🎯", desc: t('questionnaire.activities.desc') }
            ].map((option) => {
              const isSelected = (answers.helpWith || []).includes(option.label);
              return (
                <Card
                  key={option.label}
                   className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => handleMultiChoice("helpWith", option.label, undefined, 3)}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-5xl">{option.icon}</span>
                    <span className="text-lg font-semibold text-travliaq-deep-blue text-center">
                      {option.label}
                    </span>
                    <span className="text-sm text-muted-foreground text-center">
                      {option.desc}
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
              onClick={nextStep}
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
    if (answers.hasDestination === t('q.step3.yes') && step === stepCounter) {
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
              <div className="relative">
                <Input
                  ref={departureInputRef}
                  placeholder={t('questionnaire.departureCity')}
                  className="h-12 text-base"
                  value={answers.departureLocation || departureSearch}
                  onChange={(e) => {
                    setDepartureSearch(e.target.value);
                    setAnswers({ ...answers, departureLocation: e.target.value });
                    setShowDepartureDropdown(true);
                  }}
                  onFocus={() => setShowDepartureDropdown(true)}
                />
                {showDepartureDropdown && filteredDepartures.length > 0 && departureSearch && (
                  <Card className="absolute z-10 w-full mt-2 max-h-60 overflow-y-auto">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {filteredDepartures.slice(0, 15).map((city) => {
                            const cityDisplay = `${city.name}, ${city.country} ${city.country_code}`;
                            return (
                              <CommandItem
                                key={city.id}
                                onSelect={() => {
                                  setAnswers({ ...answers, departureLocation: cityDisplay });
                                  setDepartureSearch(cityDisplay);
                                  setShowDepartureDropdown(false);
                                }}
                                className="cursor-pointer"
                              >
                                {cityDisplay}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </Card>
                )}
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium mb-2 text-travliaq-deep-blue flex items-center gap-1.5">
                {t('questionnaire.whereGoing')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center justify-center">
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-travliaq-deep-blue transition-colors cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Vous pouvez saisir n'importe quelle ville, même si elle n'apparaît pas dans la liste. L'IA comprendra votre destination si vous l'orthographiez correctement.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <div className="relative">
                <Input
                  ref={cityInputRef}
                  placeholder={t('questionnaire.destinationCity')}
                  className="h-12 text-base"
                  value={answers.destination || citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setAnswers({ ...answers, destination: e.target.value });
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  onKeyPress={(e) => handleKeyPress(e, nextStep, !!answers.destination && answers.destination.trim() !== "" && !!answers.departureLocation && answers.departureLocation.trim() !== "")}
                />
                {showCityDropdown && filteredCities.length > 0 && citySearch && (
                  <Card className="absolute z-10 w-full mt-2 max-h-60 overflow-y-auto">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {filteredCities.slice(0, 15).map((city) => {
                            const cityDisplay = `${city.name}, ${city.country} ${city.country_code}`;
                            return (
                              <CommandItem
                                key={city.id}
                                onSelect={() => {
                                  setAnswers({ ...answers, destination: cityDisplay });
                                  setCitySearch(cityDisplay);
                                  setShowCityDropdown(false);
                                }}
                                className="cursor-pointer"
                              >
                                {cityDisplay}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </Card>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="hero"
                size="lg"
                onClick={nextStep}
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
    if (answers.hasDestination === t('q.step3.yes')) stepCounter++;

    // Step 2c: Climat préféré (si Non - pas de destination en tête) - MULTI-CHOIX
    if (answers.hasDestination === t('q.step3.no') && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.climatePreference')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.multipleSelectionPossible')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { label: t('questionnaire.climate.hotSunny'), icon: "☀️", desc: t('questionnaire.climate.hotSunny.desc') },
              { label: t('questionnaire.climate.mildSweet'), icon: "🌤️", desc: t('questionnaire.climate.mildSweet.desc') },
              { label: t('questionnaire.climate.coldSnowy'), icon: "❄️", desc: t('questionnaire.climate.coldSnowy.desc') },
              { label: t('questionnaire.climate.tropicalHumid'), icon: "🌴", desc: t('questionnaire.climate.tropicalHumid.desc') },
              { label: t('questionnaire.climate.mountainAltitude'), icon: "⛰️", desc: t('questionnaire.climate.mountainAltitude.desc') },
              { label: t('questionnaire.climate.dontMind'), icon: "🤷", desc: t('questionnaire.climate.dontMind.desc') }
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
                  onClick={() => handleMultiChoice("climatePreference", option.label)}
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
              onClick={nextStep}
              disabled={!answers.climatePreference || answers.climatePreference.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (answers.hasDestination === t('q.step3.no')) stepCounter++;

    // Step 2d: Affinités de voyage (si Non - multi-choix)
    if (answers.hasDestination === t('q.step3.no') && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.affinities.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.affinities.selectUpTo5')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
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
                  onClick={() => !isDisabled && handleMultiChoice("travelAffinities", option.label, 5)}
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
              onClick={nextStep}
              disabled={!answers.travelAffinities || answers.travelAffinities.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (answers.hasDestination === t('q.step3.no')) stepCounter++;

    // Step 2e: Ambiance recherchée (si Non)
    if (answers.hasDestination === t('q.step3.no') && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.ambiance.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
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
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("travelAmbiance", option.label)}
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
            ))}
          </div>
        </div>
      );
    }
    if (answers.hasDestination === t('q.step3.no')) stepCounter++;

    // Step 3: Dates
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.dates.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.dates.fixed'), icon: "📆" },
              { label: t('questionnaire.dates.flexible'), icon: "🔄" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("datesType", option.label)}
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
    if (answers.datesType === t('questionnaire.dates.fixed') && step === stepCounter) {
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
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-travliaq-deep-blue text-center">
                Cliquez sur votre date de départ puis sur votre date de retour ✈️
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
                    Réinitialiser les dates
                  </Button>
                )}
              </div>
            </div>

            {/* Display duration if both dates are selected */}
            {departureDate && returnDate && (
              <div className="text-center p-4 bg-travliaq-sky-blue/10 rounded-lg border border-travliaq-deep-blue/20">
                <p className="text-lg text-travliaq-deep-blue">
                  <span className="font-semibold">Durée du séjour :</span>{" "}
                  {Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24))} jours
                </p>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                variant="hero"
                size="lg"
                onClick={nextStep}
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
    if (answers.datesType === t('questionnaire.dates.fixed')) stepCounter++;

    // Step 3c: Flexibilité (si flexible)
    if (answers.datesType === t('questionnaire.dates.flexible') && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            Quelle souplesse ? 🔄
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: "±0j", icon: "🎯" },
              { label: "±3j", icon: "📅" },
              { label: "±7j", icon: "🗓️" }
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
    if (answers.datesType === t('questionnaire.dates.flexible')) stepCounter++;

    // Step 3d: Date de départ approximative (si flexible)
    if (answers.datesType === t('questionnaire.dates.flexible') && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Avez-vous une date de départ approximative ? 📅
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Oui, j'ai une idée", icon: "✅" },
              { label: "Non, pas encore", icon: "❌" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("hasApproximateDepartureDate", option.label === "Oui, j'ai une idée" ? "Oui" : "Non")}
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
    if (answers.datesType === t('questionnaire.dates.flexible')) stepCounter++;

    // Step 3e: Saisie date approximative (si l'utilisateur a dit "Oui")
    if (answers.hasApproximateDepartureDate === t('q.step8.approx.yes') && step === stepCounter) {
      const approximateDate = answers.approximateDepartureDate 
        ? new Date(answers.approximateDepartureDate) 
        : undefined;

      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            Quelle est votre date de départ approximative ? 📆
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Cliquez sur une date (cette date servira de référence pour votre flexibilité)
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
                      <span className="font-semibold">Date sélectionnée :</span>{" "}
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
                onClick={nextStep}
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
    if (answers.hasApproximateDepartureDate === t('q.step8.approx.yes')) stepCounter++;

    // Step 4: Durée (only if flexible dates)
    if (answers.datesType === t('questionnaire.dates.flexible') && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.duration.title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
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
                className="p-4 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("duration", option.label)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-center font-semibold text-travliaq-deep-blue text-sm">
                    {option.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if (answers.datesType === t('questionnaire.dates.flexible')) stepCounter++;

    // Step 4b: Nombre exact de nuits (si >14 nuits)
    if (answers.duration === t('questionnaire.duration.more14') && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.duration.exactNights')}
          </h2>
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
                onClick={nextStep}
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
    if (answers.duration === t('questionnaire.duration.more14')) stepCounter++;

    // Step 5: Budget
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.budget.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.budget.excluding')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.budget.less300'), icon: "💵" },
              { label: t('questionnaire.budget.300to600'), icon: "💶" },
              { label: t('questionnaire.budget.600to900'), icon: "💷" },
              { label: t('questionnaire.budget.900to1200'), icon: "💴" },
              { label: t('questionnaire.budget.1200to1800'), icon: "💸" },
              { label: t('questionnaire.budget.more1800'), icon: "💎" },
              { label: t('questionnaire.budget.dontKnow'), icon: "🤷" },
              { label: t('questionnaire.budget.precise'), icon: "🎯" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => {
                  if (option.label === t('questionnaire.budget.precise')) {
                    setAnswers({ ...answers, budgetType: t('questionnaire.budget.precise') });
                    setTimeout(nextStep, 300);
                  } else {
                    setAnswers({ ...answers, budget: option.label, budgetType: undefined });
                    setTimeout(nextStep, 300);
                  }
                }}
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
    stepCounter++;

    // Step 5b: Budget précis
    if (answers.budgetType === t('questionnaire.budget.precise') && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.budget.totalBudget')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.budget.entireTrip')}</p>
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
                onClick={nextStep}
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
    if (answers.hasDestination === t('q.step3.yes') && (answers.helpWith || []).includes(t('q.step2.activities')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.styles.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.styles.selectUpTo5')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
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
                  className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => !isDisabled && handleMultiChoice("styles", option.label, 5)}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{option.icon}</span>
                    <span className="text-lg font-semibold text-travliaq-deep-blue">
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
              onClick={nextStep}
              disabled={!answers.styles || answers.styles.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if (answers.hasDestination === t('q.step3.yes') && (answers.helpWith || []).includes(t('q.step2.activities'))) stepCounter++;

    // Step 7: Rythme - SEULEMENT si activités sélectionnées
    if ((answers.helpWith || []).includes(t('q.step2.activities')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.rhythm.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.rhythm.cool'), desc: t('questionnaire.rhythm.cool.desc'), icon: "🐢" },
              { label: t('questionnaire.rhythm.balanced'), desc: t('questionnaire.rhythm.balanced.desc'), icon: "🚶" },
              { label: t('questionnaire.rhythm.intense'), desc: t('questionnaire.rhythm.intense.desc'), icon: "🏃" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("rhythm", option.label)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-4xl">{option.icon}</span>
                  <span className="text-lg font-semibold text-travliaq-deep-blue">
                    {option.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {option.desc}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes(t('q.step2.activities'))) stepCounter++;

    // Step 8: Vols - SEULEMENT si vols sélectionnés
    if ((answers.helpWith || []).includes(t('q.step2.flights')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.flights.title')}
          </h2>
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
    if ((answers.helpWith || []).includes(t('q.step2.flights'))) stepCounter++;

    // Step 9: Bagages par voyageur - AVEC OPTION OBJET PERSONNEL - SEULEMENT si vols sélectionnés
    if ((answers.helpWith || []).includes(t('q.step2.flights')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.luggage.title')}
          </h2>
          <p className="text-center text-muted-foreground">
            {getNumberOfTravelers()} {getNumberOfTravelers() > 1 ? t('questionnaire.luggage.travelers_plural') : t('questionnaire.luggage.travelers')}
          </p>
          <div className="max-w-2xl mx-auto space-y-4">
            {Array.from({ length: getNumberOfTravelers() }).map((_, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium">
                  {t('questionnaire.luggage.traveler')} {index + 1} {index === 0 && answers.travelGroup === t('q.step1.duo') ? "👤" : index === 1 && answers.travelGroup === t('q.step1.duo') ? "👥" : "👤"}
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
                            setTimeout(nextStep, 300);
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
    if ((answers.helpWith || []).includes(t('q.step2.flights'))) stepCounter++;

    // Step 10: Mobilité (multi-choix + exhaustif)
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.mobility.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.mobility.selectMultiple')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.mobility.publicTransport.full'), icon: "🚶" },
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
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => handleMultiChoice("mobility", option.label)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{option.icon}</span>
                    <span className="text-lg font-semibold text-travliaq-deep-blue">
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
    stepCounter++;

    // Step 11: Type hébergement (max 2 + "Peu importe") - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes(t('q.step2.accommodation')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.accommodationType.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.accommodationType.select1or2')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.accommodationType.hotel'), icon: "🏨" },
              { label: t('questionnaire.accommodationType.apartment'), icon: "🏠" },
              { label: t('questionnaire.accommodationType.hostel'), icon: "🛏️" },
              { label: t('questionnaire.accommodationType.guesthouse'), icon: "🏡" },
              { label: t('questionnaire.accommodationType.lodge'), icon: "🌿" },
              { label: t('questionnaire.accommodationType.camping'), icon: "⛺" },
              { label: t('questionnaire.accommodationType.bedBreakfast'), icon: "🛋️" },
              { label: t('questionnaire.accommodationType.resort'), icon: "🏖️" },
              { label: t('questionnaire.accommodationType.dontMind'), icon: "🤷" }
            ].map((option) => {
              const currentSelection = answers.accommodationType || [];
              const isSelected = currentSelection.includes(option.label);
              const hasPeuImporte = currentSelection.includes(t('questionnaire.accommodationType.dontMind'));
              const isDisabled = !isSelected && currentSelection.length >= 2 && option.label !== t('questionnaire.accommodationType.dontMind') && !hasPeuImporte;
              
              return (
                <Card
                  key={option.label}
                  className={`p-6 cursor-pointer transition-all hover:scale-105 ${
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
                      setTimeout(nextStep, 300);
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
                        setTimeout(nextStep, 300);
                      }
                    }
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{option.icon}</span>
                    <span className="text-lg font-semibold text-travliaq-deep-blue">
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
              onClick={nextStep}
              disabled={!answers.accommodationType || answers.accommodationType.length === 0}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes(t('q.step2.accommodation'))) stepCounter++;

    // Step 11b: Détails hôtel (SI Hôtel est sélectionné ET hébergement sélectionné)
    if ((answers.helpWith || []).includes(t('q.step2.accommodation')) && (answers.accommodationType || []).includes(t('questionnaire.accommodationType.hotel')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.hotelPreferences.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.hotelPreferences.selectInterested')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.hotelPreferences.breakfast'), icon: "🥐" },
              { label: t('questionnaire.hotelPreferences.halfBoard'), icon: "🍽️" },
              { label: t('questionnaire.hotelPreferences.fullBoard'), icon: "🍴" },
              { label: t('questionnaire.hotelPreferences.allInclusive'), icon: "🍹" },
              { label: t('questionnaire.hotelPreferences.roomService'), icon: "🛎️" },
              { label: t('questionnaire.hotelPreferences.minibar'), icon: "🍾" },
              { label: t('questionnaire.hotelPreferences.view'), icon: "🌅" },
              { label: t('questionnaire.hotelPreferences.balcony'), icon: "🪴" }
            ].map((option) => {
              const isSelected = (answers.hotelPreferences || []).includes(option.label);
              return (
                <Card
                  key={option.label}
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => handleMultiChoice("hotelPreferences", option.label)}
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
              onClick={nextStep}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes(t('q.step2.accommodation')) && (answers.accommodationType || []).includes(t('questionnaire.accommodationType.hotel'))) stepCounter++;

    // Step 12: Confort - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes(t('q.step2.accommodation')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.comfort.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.comfort.rating75'), icon: "⭐" },
              { label: t('questionnaire.comfort.rating80'), icon: "⭐⭐" },
              { label: t('questionnaire.comfort.rating85'), icon: "⭐⭐⭐" },
              { label: t('questionnaire.comfort.dontMind'), icon: "🤷" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("comfort", option.label)}
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
    if ((answers.helpWith || []).includes(t('q.step2.accommodation'))) stepCounter++;

    // Step 13: Quartier - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes(t('q.step2.accommodation')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.neighborhood.title')}
          </h2>
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
    if ((answers.helpWith || []).includes(t('q.step2.accommodation'))) stepCounter++;

    // Step 14: Équipements (plus laïc) - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes(t('q.step2.accommodation')) && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.amenities.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.amenities.selectAll')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: t('questionnaire.amenities.reliableWifi'), icon: "📶" },
              { label: t('questionnaire.amenities.airConditioning'), icon: "❄️" },
              { label: t('questionnaire.amenities.kitchen'), icon: "🍳" },
              { label: t('questionnaire.amenities.washingMachine'), icon: "🧺" },
              { label: t('questionnaire.amenities.parking'), icon: "🅿️" },
              { label: t('questionnaire.amenities.elevator'), icon: "🛗" },
              { label: t('questionnaire.amenities.reception24'), icon: "🔔" },
              { label: t('questionnaire.amenities.nearWorship'), icon: "🛐" },
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
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => handleMultiChoice("amenities", option.label)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{option.icon}</span>
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
              onClick={nextStep}
              className="bg-travliaq-deep-blue"
            >
              {t('questionnaire.continue')}
            </Button>
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes(t('q.step2.accommodation'))) stepCounter++;

    // Step 15: Contraintes & préférences (plus laïc et inclusif)
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.constraints.title')}
          </h2>
          <p className="text-center text-muted-foreground">{t('questionnaire.constraints.selectAllImportant')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
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
              { label: t('questionnaire.constraints.foodAllergies'), icon: "⚠️" },
              { label: t('questionnaire.constraints.dontMind'), icon: "🤷" }
            ].map((option) => {
              const currentSelection = answers.constraints || [];
              const isSelected = currentSelection.includes(option.label);
              const hasPeuImporte = currentSelection.includes(t('questionnaire.constraints.dontMind'));
              
              return (
                <Card
                  key={option.label}
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    if (option.label === t('questionnaire.constraints.dontMind')) {
                      // "Peu importe" remplace toute autre sélection
                      setAnswers({ ...answers, constraints: [option.label] });
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
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{option.icon}</span>
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
              onClick={nextStep}
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
            Dis-nous l'essentiel en plus 💬
          </h2>
          <p className="text-center text-muted-foreground">
            Ce qu'on doit absolument respecter (ex: éviter escales, ville à inclure/exclure, allergie, événement à ne pas rater…)
          </p>
          <div className="max-w-xl mx-auto space-y-4">
            <Textarea
              placeholder="Partagez vos besoins spécifiques..."
              className="min-h-[150px] text-base"
              value={answers.additionalInfo || ""}
              onChange={(e) => setAnswers({ ...answers, additionalInfo: e.target.value })}
            />
            {answers.additionalInfo && (
              <div className="text-sm text-muted-foreground text-center">
                {answers.additionalInfo.length} caractères
              </div>
            )}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={nextStep}
              >
                {t('questionnaire.additionalInfo.skip')}
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={nextStep}
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

    // Step 17: Email (anciennement Step 18, étape "Quelque chose à ajouter" supprimée)
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            {t('questionnaire.email.title')}
          </h2>
          <p className="text-center text-muted-foreground">
            {t('questionnaire.email.description')}
          </p>
          <div className="max-w-xl mx-auto space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('questionnaire.email.placeholder')}
                className="pl-10 h-12 text-base"
                value={answers.email || ""}
                onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                onKeyPress={(e) => handleKeyPress(e, handleSubmitQuestionnaire, !!answers.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email))}
              />
            </div>
            <div className="flex justify-center">
              <Button
                variant="hero"
                size="lg"
                onClick={handleSubmitQuestionnaire}
                disabled={!answers.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email) || isSubmitting}
                className="bg-travliaq-deep-blue"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('questionnaire.email.sending')}
                  </>
                ) : (
                  <>{t('questionnaire.email.send')}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Swipe gesture handling for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Right swipe = go back
    if (isRightSwipe && step > 1) {
      prevStep();
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-travliaq-deep-blue/5 via-white to-travliaq-turquoise/10 relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
        {step > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            className="mb-3 text-travliaq-deep-blue hover:text-travliaq-turquoise hover:bg-travliaq-turquoise/10 transition-all"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('questionnaire.back')}
          </Button>
        )}

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
    </div>
  );
};

export default Questionnaire;

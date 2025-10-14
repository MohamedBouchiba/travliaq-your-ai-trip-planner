import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
    
    if (answers.travelGroup === "Famille (enfants <12)" || answers.travelGroup === "Groupe 3-5") total++; // Step 1b: Nombre exact
    total++; // Step 2: Destination en tête
    total++; // Step 2b: Comment Travliaq peut aider (vols/hébergement/activités)
    
    if (answers.hasDestination === "Oui") {
      total++; // Step 2c: Quelle destination
    } else if (answers.hasDestination === "Non") {
      total++; // Step 2d: Climat préféré
      total++; // Step 2e: Affinités de voyage
      total++; // Step 2f: Ambiance recherchée
    }
    
    total++; // Step 3: Dates
    
    if (answers.datesType === "Dates fixes") {
      total++; // Step 3b: Dates précises
    } else if (answers.datesType === "Je suis flexible") {
      total++; // Step 3c: Flexibilité
      total++; // Step 3d: Date de départ approximative
      if (answers.hasApproximateDepartureDate === "Oui") total++; // Step 3e: Saisie date approximative
      total++; // Step 4: Durée
      if (answers.duration === ">14 nuits") total++; // Step 4b: Nombre exact
    }
    
    total++; // Step 5: Budget
    if (answers.budgetType === "Budget précis") total++; // Step 5b: Montant exact
    
    const helpWith = answers.helpWith || [];
    const needsFlights = helpWith.includes("Vols");
    const needsAccommodation = helpWith.includes("Hébergement");
    const needsActivities = helpWith.includes("Activités");
    
    // Step 6: Style (seulement si destination précise ET activités sélectionnées)
    if (answers.hasDestination === "Oui" && needsActivities) {
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

  const handleMultiChoice = (field: keyof Answer, value: string, maxLimit?: number) => {
    const current = (answers[field] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : maxLimit && current.length >= maxLimit
      ? current
      : [...current, value];
    setAnswers({ ...answers, [field]: updated });
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

  const handleSubmitQuestionnaire = async () => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
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
      
      toast({
        title: "Questionnaire envoyé ! 🎉",
        description: "Nous vous enverrons votre itinéraire personnalisé sous 48h.",
      });

      // If user is already authenticated, redirect to home after a few seconds
      // Otherwise, show Google login popup
      if (user) {
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setShowGoogleLogin(true);
      }

    } catch (error) {
      // Only log detailed errors in development
      if (import.meta.env.DEV) {
        console.error("Questionnaire submission error:", error);
      }
      
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de validation",
          description: error.errors[0]?.message || "Certains champs contiennent des données invalides.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'envoi du questionnaire. Veuillez réessayer.",
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
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            Qui voyage ? 👥
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Solo", icon: "🧳" },
              { label: "Duo", icon: "👥" },
              { label: "Groupe 3-5", icon: "👨‍👩‍👧" },
              { label: "Famille (enfants <12)", icon: "👨‍👩‍👧‍👦" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => handleChoice("travelGroup", option.label)}
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

    // Step 1b: Nombre exact de voyageurs (si Famille ou Groupe 3-5)
    if ((answers.travelGroup === "Famille (enfants <12)" || answers.travelGroup === "Groupe 3-5") && step === stepCounter) {
      if (answers.travelGroup === "Famille (enfants <12)") {
        return (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
              Nombre de personnes (enfants inclus) 👨‍👩‍👧‍👦
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
                  Continuer
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
              Combien de personnes exactement ? 👥
            </h2>
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
              {[
                { label: "3 personnes", value: 3, icon: "👥" },
                { label: "4 personnes", value: 4, icon: "👨‍👩‍👧" },
                { label: "5 personnes", value: 5, icon: "👨‍👩‍👧‍👦" }
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
    if (answers.travelGroup === "Famille (enfants <12)" || answers.travelGroup === "Groupe 3-5") stepCounter++;

    // Step 2: Destination en tête ?
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Tu as déjà une destination en tête ? 🌍
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Oui", icon: "✅" },
              { label: "Non", icon: "🤔" }
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
            Comment Travliaq peut vous aider ? 🎯
          </h2>
          <p className="text-center text-muted-foreground">Sélection multiple possible</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Vols", icon: "✈️", desc: "Billets d'avion" },
              { label: "Hébergement", icon: "🏨", desc: "Hôtels & logements" },
              { label: "Activités", icon: "🎯", desc: "Visites & expériences" }
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
                  onClick={() => handleMultiChoice("helpWith", option.label)}
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
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 2c: Destination précise (si Oui)
    if (answers.hasDestination === "Oui" && step === stepCounter) {
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
                  D'où pars-tu ? 📍
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center justify-center">
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-travliaq-deep-blue transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Vous pouvez saisir n'importe quelle ville, même si elle n'apparaît pas dans la liste. L'IA comprendra votre point de départ si vous l'orthographiez correctement.
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
                      Détection...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-1 h-3 w-3" />
                      Ma position
                    </>
                  )}
                </Button>
              </div>
              <div className="relative">
                <Input
                  ref={departureInputRef}
                  placeholder="Ville de départ"
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
                Où vas-tu ? 🌍
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
                  placeholder="Ville de destination..."
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
                Continuer
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (answers.hasDestination === "Oui") stepCounter++;

    // Step 2c: Climat préféré (si Non - pas de destination en tête) - MULTI-CHOIX
    if (answers.hasDestination === "Non" && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            Quel type de climat recherches-tu ? 🌡️
          </h2>
          <p className="text-center text-muted-foreground">Sélection multiple possible</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Chaud & ensoleillé", icon: "☀️", desc: "25-35°C" },
              { label: "Tempéré & doux", icon: "🌤️", desc: "15-25°C" },
              { label: "Froid & neigeux", icon: "❄️", desc: "<10°C" },
              { label: "Tropical & humide", icon: "🌴", desc: "Plages & jungle" },
              { label: "Montagne & altitude", icon: "⛰️", desc: "Air pur" },
              { label: "Peu importe", icon: "🤷", desc: "Je suis flexible" }
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
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    if (answers.hasDestination === "Non") stepCounter++;

    // Step 2d: Affinités de voyage (si Non - multi-choix)
    if (answers.hasDestination === "Non" && step === stepCounter) {
      return (
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold text-center text-travliaq-deep-blue">
            Qu'est-ce qui t'attire le plus ? 🎯
          </h2>
          <p className="text-center text-muted-foreground">Sélectionnez jusqu'à 5 affinités</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Plages paradisiaques", icon: "🏖️" },
              { label: "Villes historiques", icon: "🏛️" },
              { label: "Nature & randonnées", icon: "🥾" },
              { label: "Ski & sports d'hiver", icon: "⛷️" },
              { label: "Safari & animaux", icon: "🦁" },
              { label: "Gastronomie locale", icon: "🍽️" },
              { label: "Shopping & mode", icon: "🛍️" },
              { label: "Festivals & événements", icon: "🎭" },
              { label: "Architecture moderne", icon: "🏙️" },
              { label: "Temples & spiritualité", icon: "🕌" },
              { label: "Parcs d'attractions", icon: "🎢" },
              { label: "Plongée & snorkeling", icon: "🤿" },
              { label: "Road trip & liberté", icon: "🚗" },
              { label: "Vignobles & œnotourisme", icon: "🍷" },
              { label: "Déserts & paysages lunaires", icon: "🏜️" },
              { label: "Îles & archipels", icon: "🏝️" }
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
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    if (answers.hasDestination === "Non") stepCounter++;

    // Step 2e: Ambiance recherchée (si Non)
    if (answers.hasDestination === "Non" && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Quelle ambiance recherches-tu ? 🎨
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Aventure & dépaysement", icon: "🧭", desc: "Sortir de ma zone de confort" },
              { label: "Détente & relaxation", icon: "🧘", desc: "Me ressourcer totalement" },
              { label: "Romance & intimité", icon: "💕", desc: "Moments à deux" },
              { label: "Découverte culturelle", icon: "🎭", desc: "Apprendre et m'enrichir" },
              { label: "Fête & vie nocturne", icon: "🎉", desc: "Faire la fête" },
              { label: "Famille & convivialité", icon: "👨‍👩‍👧‍👦", desc: "Moments en famille" }
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
    if (answers.hasDestination === "Non") stepCounter++;

    // Step 3: Dates
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Dates de voyage 📅
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Dates fixes", icon: "📆" },
              { label: "Je suis flexible", icon: "🔄" }
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
    if (answers.datesType === "Dates fixes" && step === stepCounter) {
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
            Sélectionnez vos dates de voyage 🗓️
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
                Continuer
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (answers.datesType === "Dates fixes") stepCounter++;

    // Step 3c: Flexibilité (si flexible)
    if (answers.datesType === "Je suis flexible" && step === stepCounter) {
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
    if (answers.datesType === "Je suis flexible") stepCounter++;

    // Step 3d: Date de départ approximative (si flexible)
    if (answers.datesType === "Je suis flexible" && step === stepCounter) {
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
    if (answers.datesType === "Je suis flexible") stepCounter++;

    // Step 3e: Saisie date approximative (si l'utilisateur a dit "Oui")
    if (answers.hasApproximateDepartureDate === "Oui" && step === stepCounter) {
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
                Continuer
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (answers.hasApproximateDepartureDate === "Oui") stepCounter++;

    // Step 4: Durée (only if flexible dates)
    if (answers.datesType === "Je suis flexible" && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Durée du séjour 🌙
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { label: "2 nuits", icon: "🌙" },
              { label: "3 nuits", icon: "🌙🌙" },
              { label: "4 nuits", icon: "🌃" },
              { label: "5 nuits", icon: "🌃" },
              { label: "6 nuits", icon: "🌆" },
              { label: "7 nuits", icon: "🌆" },
              { label: "8-10 nuits", icon: "🌇" },
              { label: "11-14 nuits", icon: "🌇" },
              { label: ">14 nuits", icon: "🌉" }
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
    if (answers.datesType === "Je suis flexible") stepCounter++;

    // Step 4b: Nombre exact de nuits (si >14 nuits)
    if (answers.duration === ">14 nuits" && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Combien de nuits exactement ? 🌉
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
                Continuer
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (answers.duration === ">14 nuits") stepCounter++;

    // Step 5: Budget
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Budget par personne 💰
          </h2>
          <p className="text-center text-muted-foreground">Hors achats personnels</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "<300€", icon: "💵" },
              { label: "300-600€", icon: "💶" },
              { label: "600-900€", icon: "💷" },
              { label: "900-1 200€", icon: "💴" },
              { label: "1 200-1 800€", icon: "💸" },
              { label: ">1 800€", icon: "💎" },
              { label: "Je ne sais pas", icon: "🤷" },
              { label: "Budget précis", icon: "🎯" }
            ].map((option) => (
              <Card
                key={option.label}
                className="p-6 cursor-pointer hover:shadow-golden hover:border-travliaq-deep-blue transition-all hover:scale-105"
                onClick={() => {
                  if (option.label === "Budget précis") {
                    setAnswers({ ...answers, budgetType: "Budget précis" });
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
    if (answers.budgetType === "Budget précis" && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Quel est votre budget total ? 💵
          </h2>
          <p className="text-center text-muted-foreground">Pour l'ensemble du voyage</p>
          <div className="max-w-xl mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Montant</label>
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
              <label className="block text-sm font-medium mb-2">Devise</label>
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
                Continuer
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (answers.budgetType === "Budget précis") stepCounter++;

    // Step 6: Style (max 5 au lieu de 3) - SEULEMENT si destination précise ET activités sélectionnées
    if (answers.hasDestination === "Oui" && (answers.helpWith || []).includes("Activités") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Style de voyage 🎨
          </h2>
          <p className="text-center text-muted-foreground">Sélectionnez jusqu'à 5 styles</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Nature", icon: "🌲" },
              { label: "Culture & musées", icon: "🏛️" },
              { label: "Food", icon: "🍽️" },
              { label: "Plage", icon: "🏖️" },
              { label: "Montagne & rando", icon: "⛰️" },
              { label: "Photo spots", icon: "📸" },
              { label: "Vie locale & marchés", icon: "🏪" },
              { label: "Sport & outdoor", icon: "🚴" },
              { label: "Bien-être & spa", icon: "🧘" },
              { label: "Vie nocturne", icon: "🎉" }
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
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    if (answers.hasDestination === "Oui" && (answers.helpWith || []).includes("Activités")) stepCounter++;

    // Step 7: Rythme - SEULEMENT si activités sélectionnées
    if ((answers.helpWith || []).includes("Activités") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Rythme souhaité ⏱️
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Cool", desc: "1-2 activités/jour", icon: "🐢" },
              { label: "Équilibré", desc: "2-3 activités/jour", icon: "🚶" },
              { label: "Intense", desc: "3+ activités/jour", icon: "🏃" }
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
    if ((answers.helpWith || []).includes("Activités")) stepCounter++;

    // Step 8: Vols - SEULEMENT si vols sélectionnés
    if ((answers.helpWith || []).includes("Vols") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Vols – préférence ✈️
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Direct uniquement", icon: "✈️" },
              { label: "Max 1 escale", icon: "🛫" },
              { label: "Peu importe", icon: "💰" }
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
    if ((answers.helpWith || []).includes("Vols")) stepCounter++;

    // Step 9: Bagages par voyageur - AVEC OPTION OBJET PERSONNEL - SEULEMENT si vols sélectionnés
    if ((answers.helpWith || []).includes("Vols") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Bagages par voyageur 🧳
          </h2>
          <p className="text-center text-muted-foreground">
            {getNumberOfTravelers()} voyageur{getNumberOfTravelers() > 1 ? 's' : ''}
          </p>
          <div className="max-w-2xl mx-auto space-y-4">
            {Array.from({ length: getNumberOfTravelers() }).map((_, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium">
                  Voyageur {index + 1} {index === 0 && answers.travelGroup === "Duo" ? "👤" : index === 1 && answers.travelGroup === "Duo" ? "👥" : "👤"}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Objet personnel", icon: "👜", desc: "Sous le siège" },
                    { label: "Objet personnel + cabine", icon: "🎒", desc: "Compartiment supérieur" },
                    { label: "Cabine + soute", icon: "🧳", desc: "Max bagages" }
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
    if ((answers.helpWith || []).includes("Vols")) stepCounter++;

    // Step 10: Mobilité (multi-choix + exhaustif)
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Mobilité sur place 🚗
          </h2>
          <p className="text-center text-muted-foreground">Sélection multiple possible</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Marche/TC principalement", icon: "🚶" },
              { label: "Taxi/VTC", icon: "🚕" },
              { label: "Location voiture", icon: "🚗" },
              { label: "Vélo", icon: "🚲" },
              { label: "Trottinette électrique", icon: "🛴" },
              { label: "Moto/scooter", icon: "🏍️" },
              { label: "Bus touristique", icon: "🚌" },
              { label: "Train/métro", icon: "🚇" },
              { label: "Bateau/ferry", icon: "⛴️" },
              { label: "Transport atypique", icon: "🐪" }
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
                const hasAtypical = mobility.includes("Transport atypique");
                const hasFerry = mobility.includes("Bateau/ferry");
                const hasOtherTransport = mobility.some(t => t !== "Transport atypique" && t !== "Bateau/ferry");
                
                // Si l'utilisateur a sélectionné uniquement atypique, ferry, ou les deux sans autre transport
                if ((hasAtypical || hasFerry) && !hasOtherTransport) {
                  toast({
                    title: "Sélection incomplète",
                    description: "Veuillez sélectionner au moins un autre mode de transport en plus du transport atypique ou bateau/ferry.",
                    variant: "destructive"
                  });
                  return;
                }
                nextStep();
              }}
              disabled={!answers.mobility || answers.mobility.length === 0}
              className="bg-travliaq-deep-blue"
            >
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    stepCounter++;

    // Step 11: Type hébergement (max 2 + "Peu importe") - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes("Hébergement") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Type d'hébergement 🏨
          </h2>
          <p className="text-center text-muted-foreground">Sélectionnez 1 ou 2 types</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Hôtel", icon: "🏨" },
              { label: "Appartement", icon: "🏠" },
              { label: "Auberge", icon: "🛏️" },
              { label: "Maison d'hôtes/riad", icon: "🏡" },
              { label: "Lodge/eco-stay", icon: "🌿" },
              { label: "Camping/glamping", icon: "⛺" },
              { label: "Chambre d'hôtes", icon: "🛋️" },
              { label: "Resort", icon: "🏖️" },
              { label: "Peu importe", icon: "🤷" }
            ].map((option) => {
              const currentSelection = answers.accommodationType || [];
              const isSelected = currentSelection.includes(option.label);
              const hasPeuImporte = currentSelection.includes("Peu importe");
              const isDisabled = !isSelected && currentSelection.length >= 2 && option.label !== "Peu importe" && !hasPeuImporte;
              
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
                    if (option.label === "Peu importe") {
                      // "Peu importe" remplace toute autre sélection
                      setAnswers({ ...answers, accommodationType: [option.label] });
                      setTimeout(nextStep, 300);
                    } else if (!isDisabled) {
                      // Si "Peu importe" est déjà sélectionné, le retirer d'abord
                      const filteredSelection = currentSelection.filter(item => item !== "Peu importe");
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
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes("Hébergement")) stepCounter++;

    // Step 11b: Détails hôtel (SI Hôtel est sélectionné ET hébergement sélectionné)
    if ((answers.helpWith || []).includes("Hébergement") && (answers.accommodationType || []).includes("Hôtel") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Préférences pour l'hôtel 🏨
          </h2>
          <p className="text-center text-muted-foreground">Sélectionnez ce qui vous intéresse</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Petit-déjeuner inclus", icon: "🥐" },
              { label: "Demi-pension", icon: "🍽️" },
              { label: "Pension complète", icon: "🍴" },
              { label: "All-inclusive", icon: "🍹" },
              { label: "Room service", icon: "🛎️" },
              { label: "Minibar", icon: "🍾" },
              { label: "Vue mer/montagne", icon: "🌅" },
              { label: "Balcon/terrasse", icon: "🪴" }
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
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes("Hébergement") && (answers.accommodationType || []).includes("Hôtel")) stepCounter++;

    // Step 12: Confort - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes("Hébergement") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Confort minimum ⭐
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Note ≥7.5", icon: "⭐" },
              { label: "Note ≥8.0", icon: "⭐⭐" },
              { label: "Note ≥8.5", icon: "⭐⭐⭐" },
              { label: "Peu importe", icon: "🤷" }
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
    if ((answers.helpWith || []).includes("Hébergement")) stepCounter++;

    // Step 13: Quartier - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes("Hébergement") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Quartier recherché 🗺️
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Calme", icon: "🌙" },
              { label: "Central & animé", icon: "🏙️" },
              { label: "Proche nature/plage", icon: "🏖️" },
              { label: "Atypique/charme local", icon: "🏘️" }
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
    if ((answers.helpWith || []).includes("Hébergement")) stepCounter++;

    // Step 14: Équipements (plus laïc) - SEULEMENT si hébergement sélectionné
    if ((answers.helpWith || []).includes("Hébergement") && step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Équipements souhaités 🛠️
          </h2>
          <p className="text-center text-muted-foreground">Sélectionnez tous ceux qui vous importent</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Wi-Fi fiable", icon: "📶" },
              { label: "Climatisation", icon: "❄️" },
              { label: "Cuisine", icon: "🍳" },
              { label: "Machine à laver", icon: "🧺" },
              { label: "Parking", icon: "🅿️" },
              { label: "Ascenseur", icon: "🛗" },
              { label: "Réception 24/7", icon: "🔔" },
              { label: "Proximité lieu de culte", icon: "🛐" },
              { label: "Lit bébé", icon: "👶" },
              { label: "Chambre famille", icon: "👨‍👩‍👧‍👦" },
              { label: "Piscine", icon: "🏊" },
              { label: "Salle de sport", icon: "💪" },
              { label: "Spa/jacuzzi", icon: "🧖" },
              { label: "Jardin/terrasse", icon: "🌳" }
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
              Continuer
            </Button>
          </div>
        </div>
      );
    }
    if ((answers.helpWith || []).includes("Hébergement")) stepCounter++;

    // Step 15: Contraintes & préférences (plus laïc et inclusif)
    if (step === stepCounter) {
      return (
        <div className="space-y-8 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-travliaq-deep-blue">
            Contraintes & préférences 🎯
          </h2>
          <p className="text-center text-muted-foreground">Sélectionnez toutes les options importantes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Halal", icon: "🥙" },
              { label: "Casher", icon: "✡️" },
              { label: "Végétarien", icon: "🥗" },
              { label: "Vegan", icon: "🌱" },
              { label: "Sans gluten", icon: "🌾" },
              { label: "Sans porc", icon: "🚫🥓" },
              { label: "Sans alcool", icon: "🚫🍷" },
              { label: "Lieux de prière", icon: "🛐" },
              { label: "Respect traditions bouddhistes", icon: "☸️" },
              { label: "Accessibilité PMR", icon: "♿" },
              { label: "Zones sûres", icon: "🛡️" },
              { label: "Éviter voiture", icon: "🚫🚗" },
              { label: "Respect traditions locales", icon: "🕊️" },
              { label: "Allergies alimentaires", icon: "⚠️" },
              { label: "Peu importe", icon: "🤷" }
            ].map((option) => {
              const currentSelection = answers.constraints || [];
              const isSelected = currentSelection.includes(option.label);
              const hasPeuImporte = currentSelection.includes("Peu importe");
              
              return (
                <Card
                  key={option.label}
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? "border-[3px] border-travliaq-turquoise bg-travliaq-turquoise/15 shadow-golden scale-105" 
                      : "hover:shadow-golden hover:border-travliaq-deep-blue"
                  }`}
                  onClick={() => {
                    if (option.label === "Peu importe") {
                      // "Peu importe" remplace toute autre sélection
                      setAnswers({ ...answers, constraints: [option.label] });
                    } else {
                      // Si "Peu importe" est déjà sélectionné, le retirer d'abord
                      const filteredSelection = currentSelection.filter(item => item !== "Peu importe");
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
              Continuer
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
                Passer
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={nextStep}
                className="bg-travliaq-deep-blue"
              >
                Continuer
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
            Recevoir mon itinéraire 📧
          </h2>
          <p className="text-center text-muted-foreground">
            Nous vous enverrons votre itinéraire personnalisé sous 48h
          </p>
          <div className="max-w-xl mx-auto space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="votre@email.com"
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
                    Envoi en cours...
                  </>
                ) : (
                  <>Envoyer 🚀</>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-travliaq-sky-blue via-white to-travliaq-golden-sand/20">
      {/* Navigation minimale */}
      <Navigation variant="minimal" />
      
      {/* Progress Bar améliorée */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-200 to-gray-300 z-50 shadow-sm">
        <div 
          className="h-full bg-gradient-to-r from-travliaq-deep-blue via-travliaq-turquoise to-travliaq-golden-sand transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>

      {/* Header ultra-compact */}
      <div className="pt-20 pb-3 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-lg md:text-xl font-montserrat font-bold text-travliaq-deep-blue">
              VOTRE VOYAGE SUR MESURE
            </h1>
            <div className="flex items-center gap-2 bg-travliaq-golden-sand/20 px-3 py-1 rounded-full">
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
      <div className="max-w-3xl mx-auto px-4 py-2">
        {step > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            className="mb-2 text-travliaq-deep-blue hover:text-travliaq-deep-blue/80"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
        )}

        <div className="bg-white rounded-xl shadow-adventure p-5 md:p-6">
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

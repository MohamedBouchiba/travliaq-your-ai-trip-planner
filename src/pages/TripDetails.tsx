import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTripData } from "@/hooks/useTripData";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Phone,
  FileText,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Plane,
  Hotel,
  MapPin,
  Calendar,
  Users,
  Info,
  Scale,
  Building2,
  Umbrella,
  Ban
} from "lucide-react";

const TripDetails = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const rawCode = code || searchParams.get("code");
  const tripCode = rawCode ? decodeURIComponent(rawCode).replace(/^=+/, '').trim() : null;
  const { trip, steps, loading } = useTripData(tripCode);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const regularSteps = steps.filter(s => !s.is_summary);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('tripDetails.notFound')}</h1>
        <Button onClick={() => navigate('/')}>{t('common.back')}</Button>
      </div>
    );
  }

  const handleProceedToBooking = () => {
    navigate(`/booking?code=${encodeURIComponent(tripCode || '')}`);
  };

  const handleBackToTrip = () => {
    navigate(`/recommendations/${encodeURIComponent(tripCode || '')}`);
  };

  // Dynamic included/excluded items
  const includedItems = [
    trip.flight_from && trip.flight_to && { 
      icon: Plane, 
      textFr: `Vols aller-retour ${trip.flight_from} ↔ ${trip.flight_to}`,
      textEn: `Round-trip flights ${trip.flight_from} ↔ ${trip.flight_to}`
    },
    trip.hotel_name && { 
      icon: Hotel, 
      textFr: `Hébergement : ${trip.hotel_name}`,
      textEn: `Accommodation: ${trip.hotel_name}`
    },
    regularSteps.length > 0 && { 
      icon: MapPin, 
      textFr: `${regularSteps.length} activités planifiées`,
      textEn: `${regularSteps.length} planned activities`
    },
    { 
      icon: FileText, 
      textFr: 'Itinéraire personnalisé complet',
      textEn: 'Complete personalized itinerary'
    },
    { 
      icon: Phone, 
      textFr: 'Assistance client 7j/7',
      textEn: '24/7 customer support'
    },
  ].filter(Boolean);

  const excludedItems = [
    { 
      icon: Umbrella, 
      textFr: 'Assurance voyage (recommandée)',
      textEn: 'Travel insurance (recommended)'
    },
    { 
      icon: CreditCard, 
      textFr: 'Dépenses personnelles et pourboires',
      textEn: 'Personal expenses and tips'
    },
    { 
      icon: MapPin, 
      textFr: 'Excursions optionnelles non mentionnées',
      textEn: 'Optional excursions not mentioned'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation theme="light" />
      
      <div className="container max-w-4xl mx-auto px-4 py-6 pt-20 md:py-8 md:pt-24">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToTrip}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('tripDetails.backToTrip')}
          </Button>
          
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              {isEnglish ? (trip.destination_en || trip.destination) : trip.destination}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {trip.total_days} {t('tripDetails.days')} • {trip.travelers || 2} {t('tripDetails.travelers')}
            </p>
          </div>

          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            {t('tripDetails.preBookingInfo')}
          </Badge>
        </div>

        {/* Trip Summary Card */}
        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <Info className="h-5 w-5 text-primary" />
              {t('tripDetails.tripSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('tripDetails.duration')}</p>
                  <p className="font-medium text-foreground">{trip.total_days} {t('tripDetails.days')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('tripDetails.travelersLabel')}</p>
                  <p className="font-medium text-foreground">{trip.travelers || 2}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('tripDetails.activities')}</p>
                  <p className="font-medium text-foreground">{regularSteps.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('tripDetails.totalPrice')}</p>
                  <p className="font-semibold text-primary">{trip.total_price || trip.total_budget || '—'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Included / Excluded */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <Card className="border-green-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                {t('tripDetails.included')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {includedItems.map((item: any, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <item.icon className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span className="text-foreground">{isEnglish ? item.textEn : item.textFr}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg text-orange-500 dark:text-orange-400">
                <XCircle className="h-5 w-5" />
                {t('tripDetails.excluded')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {excludedItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <item.icon className="h-4 w-4 text-orange-500 dark:text-orange-400 mt-0.5 shrink-0" />
                  <span className="text-foreground">{isEnglish ? item.textEn : item.textFr}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Legal Information */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg text-foreground">
              <Scale className="h-5 w-5 text-primary" />
              {t('tripDetails.responsibilities')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{t('tripDetails.organizer')}</p>
                <p>{t('tripDetails.organizerDesc')}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{t('tripDetails.globalResponsibility')}</p>
                <p>{t('tripDetails.globalResponsibilityDesc')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy - No Refunds */}
        <Card className="mb-6 border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg text-foreground">
              <Ban className="h-5 w-5 text-destructive" />
              {t('tripDetails.cancellation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">{t('tripDetails.noRefundPolicy')}</p>
                  <p className="text-muted-foreground">{t('tripDetails.noRefundDesc')}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              {t('tripDetails.insuranceRecommendation')}
            </p>
          </CardContent>
        </Card>

        {/* Guarantees */}
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg text-foreground">
              <Shield className="h-5 w-5 text-primary" />
              {t('tripDetails.guarantees')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{t('tripDetails.insolvencyGuarantee')}</p>
                <p className="text-muted-foreground">{t('tripDetails.insolvencyGuaranteeDesc')}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{t('tripDetails.rcProInsurance')}</p>
                <p className="text-muted-foreground">{t('tripDetails.rcProInsuranceDesc')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance Checkbox */}
        <Card className="mb-6 md:mb-8 border-2 border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-1 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed text-foreground">
                {t('tripDetails.acceptTerms')}{' '}
                <a href="/cgv" target="_blank" className="text-primary underline hover:no-underline font-medium">
                  {t('tripDetails.termsLink')}
                </a>
                {' '}{t('tripDetails.acceptTerms2')}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-between">
          <Button
            variant="outline"
            onClick={handleBackToTrip}
            className="gap-2 border-muted-foreground/30 hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('tripDetails.backToTrip')}
          </Button>
          
          <Button
            onClick={handleProceedToBooking}
            disabled={!acceptedTerms}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {t('tripDetails.proceedToBooking')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground mt-6 md:mt-8">
          {t('tripDetails.footerNote')}
        </p>
      </div>
    </div>
  );
};

export default TripDetails;

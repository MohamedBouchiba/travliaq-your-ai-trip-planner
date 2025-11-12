import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { logger, LogCategory } from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import { AlertCircle, CheckCircle, Bug, AlertTriangle, Info } from 'lucide-react';
import * as Sentry from '@sentry/react';

/**
 * Page de test Sentry - POUR DÉVELOPPEMENT UNIQUEMENT
 * 
 * Cette page permet de déclencher différents types d'erreurs
 * pour vérifier que Sentry reçoit bien les logs
 */
export default function SentryTest() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<{ type: string; sent: boolean }[]>([]);

  const addResult = (type: string, sent: boolean) => {
    setTestResults(prev => [...prev, { type, sent }]);
  };

  const sendErrorTest = () => {
    try {
      logger.error('TEST SENTRY - Erreur de test', {
        category: LogCategory.QUESTIONNAIRE,
        error: new Error('Ceci est une erreur de test pour vérifier Sentry'),
        metadata: {
          testId: `test-${Date.now()}`,
          testType: 'error',
          environment: import.meta.env.MODE,
          timestamp: new Date().toISOString(),
        }
      });

      addResult('Error', true);
      toast({
        title: '✅ Erreur envoyée à Sentry',
        description: 'Vérifiez votre dashboard Sentry',
      });
    } catch (error) {
      addResult('Error', false);
      toast({
        title: '❌ Échec',
        description: 'Impossible d\'envoyer l\'erreur',
        variant: 'destructive',
      });
    }
  };

  const sendWarningTest = () => {
    try {
      logger.warn('TEST SENTRY - Warning de test', {
        category: LogCategory.VALIDATION,
        metadata: {
          testId: `test-${Date.now()}`,
          testType: 'warning',
          message: 'Ceci est un warning de test',
          timestamp: new Date().toISOString(),
        }
      });

      addResult('Warning', true);
      toast({
        title: '✅ Warning envoyé à Sentry',
        description: 'Vérifiez votre dashboard Sentry',
      });
    } catch (error) {
      addResult('Warning', false);
      toast({
        title: '❌ Échec',
        description: 'Impossible d\'envoyer le warning',
        variant: 'destructive',
      });
    }
  };

  const sendInfoTest = () => {
    try {
      logger.info('TEST SENTRY - Info de test', {
        category: LogCategory.QUESTIONNAIRE,
        metadata: {
          testId: `test-${Date.now()}`,
          testType: 'info',
          message: 'Ceci est un log informatif de test',
          timestamp: new Date().toISOString(),
        }
      });

      addResult('Info', true);
      toast({
        title: '✅ Info envoyé à Sentry',
        description: 'Vérifiez votre dashboard Sentry',
      });
    } catch (error) {
      addResult('Info', false);
      toast({
        title: '❌ Échec',
        description: 'Impossible d\'envoyer l\'info',
        variant: 'destructive',
      });
    }
  };

  const sendValidationError = () => {
    try {
      const mockQuestionnaireData = {
        step: 2,
        totalSteps: 15,
        travelGroup: 'Famille',
        travelers: {
          count: 7,
          adults: 6,
          children: 1,
          childrenAges: [5],
        },
        numberOfTravelers: 7,
      };

      logger.error('TEST SENTRY - Erreur de validation questionnaire', {
        category: LogCategory.VALIDATION,
        error: new Error('Validation échouée: Test de validation avec données invalides'),
        metadata: {
          ...mockQuestionnaireData,
          testId: `validation-test-${Date.now()}`,
          errorType: 'validation_failed',
          stepName: 'Nombre de personnes',
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString(),
        }
      });

      addResult('Validation Error', true);
      toast({
        title: '✅ Erreur de validation envoyée',
        description: 'Vérifiez Sentry pour l\'erreur de validation',
      });
    } catch (error) {
      addResult('Validation Error', false);
      toast({
        title: '❌ Échec',
        description: 'Impossible d\'envoyer l\'erreur de validation',
        variant: 'destructive',
      });
    }
  };

  const throwUnhandledError = () => {
    toast({
      title: '⚠️ Exception non gérée',
      description: 'Une erreur va être lancée dans 2 secondes...',
    });

    setTimeout(() => {
      // Ceci va déclencher une erreur non gérée qui sera capturée par Sentry
      throw new Error('TEST SENTRY - Exception non gérée déclenchée intentionnellement');
    }, 2000);

    addResult('Unhandled Exception', true);
  };

  // Envoi direct via Sentry.captureException + flush
  const sendCaptureException = async () => {
    try {
      const error = new Error('TEST SENTRY - captureException manuelle');
      const eventId = Sentry.captureException(error, {
        tags: { source: 'manual_button', feature: 'sentry-test' },
        extra: {
          testId: `capture-${Date.now()}`,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      });
      await Sentry.flush(7000);
      addResult(`captureException:${eventId ?? 'unknown'}`, true);
      toast({ title: '✅ captureException envoyée', description: `eventId: ${eventId ?? 'inconnu'}` });
    } catch (e) {
      addResult('captureException', false);
      toast({ title: '❌ Échec captureException', description: String(e), variant: 'destructive' });
    }
  };

  // Bouton qui lance immédiatement une erreur (sans délai)
  const breakTheWorldNow = () => {
    throw new Error('This is your first error! (Break the world)');
  };

  const clearResults = () => {
    setTestResults([]);
    toast({
      title: 'Résultats effacés',
      description: 'Historique des tests nettoyé',
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-travliaq-sand/30 via-white to-travliaq-sand/20">
      <Navigation />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-travliaq-deep-blue mb-4">
              🧪 Test Sentry - Environnement de développement
            </h1>
            <p className="text-muted-foreground">
              Cliquez sur les boutons ci-dessous pour envoyer différents types de logs à Sentry
            </p>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Page de développement uniquement</strong> - Vérifiez votre dashboard Sentry après chaque test
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h3 className="text-lg font-semibold">Erreur Standard</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Envoie une erreur standard avec métadonnées (via logger)
              </p>
              <Button onClick={sendErrorTest} variant="destructive" className="w-full">
                Envoyer Erreur
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <h3 className="text-lg font-semibold">Warning</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Envoie un avertissement à Sentry
              </p>
              <Button onClick={sendWarningTest} variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-50">
                Envoyer Warning
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-8 w-8 text-blue-500" />
                <h3 className="text-lg font-semibold">Info</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Envoie un log informatif à Sentry
              </p>
              <Button onClick={sendInfoTest} variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-50">
                Envoyer Info
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <Bug className="h-8 w-8 text-purple-500" />
                <h3 className="text-lg font-semibold">Erreur Validation</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Simule une erreur de validation du questionnaire
              </p>
              <Button onClick={sendValidationError} className="w-full bg-purple-500 hover:bg-purple-600">
                Erreur Validation
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <Bug className="h-8 w-8 text-emerald-600" />
                <h3 className="text-lg font-semibold">captureException directe</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Appelle directement Sentry.captureException et force un flush
              </p>
              <Button onClick={sendCaptureException} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Envoyer via captureException
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <h3 className="text-lg font-semibold">Break the world (throw)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Déclenche immédiatement une exception non gérée
              </p>
              <Button onClick={breakTheWorldNow} variant="destructive" className="w-full">
                Break the world
              </Button>
            </Card>
          </div>

          <Card className="p-6 bg-red-50 border-red-200 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <h3 className="text-lg font-semibold text-red-600">⚠️ Exception Non Gérée (avec délai)</h3>
            </div>
            <p className="text-sm text-red-700 mb-4">
              Déclenche une exception non capturée dans 2 secondes (capture auto Sentry).
            </p>
            <Button onClick={throwUnhandledError} variant="destructive" className="w-full">
              Lancer Exception Non Gérée (2s)
            </Button>
          </Card>

          {testResults.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Historique des tests</h3>
                <Button onClick={clearResults} variant="outline" size="sm">
                  Effacer
                </Button>
              </div>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{result.type}</span>
                    <div className="flex items-center gap-2">
                      {result.sent ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Envoyé</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Échec</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📊 Comment vérifier dans Sentry
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Ouvrez votre dashboard Sentry</li>
              <li>Allez dans "Issues" pour voir les erreurs</li>
              <li>Recherchez "TEST SENTRY" pour filtrer les tests</li>
              <li>Cliquez sur une erreur pour voir tous les détails et métadonnées</li>
              <li>Vérifiez que le contexte (step, travelers, etc.) est bien présent</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}


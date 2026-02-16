/**
 * useReadyMessage - Shows "ready to search" message when all flight info is complete.
 *
 * Extracted from PlannerChat.tsx (A1). Handles:
 * - Airport fetching when city is known but IATA code is missing
 * - Search-ready message with direct search button
 *
 * Depends on primitive values (not objects) to avoid spurious re-triggers.
 */

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useLocale } from "@/hooks/useLocale";
import { findNearestAirports } from "@/hooks/useNearestAirports";
import type { ChatMessage } from "../types";
import type { DualAirportChoice } from "@/types/flight";

interface ReadyMessageInputs {
  hasCompleteInfo: boolean;
  departureCity: string | undefined;
  arrivalCity: string | undefined;
  departureIata: string | undefined;
  arrivalIata: string | undefined;
  arrivalCountryCode: string | undefined;
  departureCountryCode: string | undefined;
  departureDateMs: number | undefined;
  returnDateMs: number | undefined;
  passengersTotal: number;
  needsDepartureAirport: boolean;
  needsArrivalAirport: boolean;
  isSearchButtonShown: () => boolean;
  markSearchButtonShown: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** Guards to suppress auto-messages during hard reset / session switching */
  isSwitchingSessionRef: React.MutableRefObject<boolean>;
  isHardResetRef: React.MutableRefObject<boolean>;
}

export function useReadyMessage(inputs: ReadyMessageInputs) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const airportFetchKeyRef = useRef<string | null>(null);

  const {
    hasCompleteInfo,
    departureCity,
    arrivalCity,
    departureIata,
    arrivalIata,
    arrivalCountryCode,
    departureCountryCode,
    departureDateMs,
    returnDateMs,
    passengersTotal,
    needsDepartureAirport,
    needsArrivalAirport,
    isSearchButtonShown,
    markSearchButtonShown,
    setMessages,
    isSwitchingSessionRef,
    isHardResetRef,
  } = inputs;

  useEffect(() => {
    if (isSwitchingSessionRef.current || isHardResetRef.current) return;
    if (!hasCompleteInfo || isSearchButtonShown()) return;

    const departure = departureCity || t("planner.departure");
    const arrival = arrivalCity || t("planner.askDestination");
    const depCode = departureIata ? ` (${departureIata})` : "";
    const arrCode = arrivalIata ? ` (${arrivalIata})` : "";
    const depDate = departureDateMs ? format(new Date(departureDateMs), "d MMMM yyyy", { locale: dateFnsLocale }) : "-";
    const retDate = returnDateMs ? format(new Date(returnDateMs), "d MMMM yyyy", { locale: dateFnsLocale }) : null;
    const travelers = passengersTotal;

    if (needsDepartureAirport || needsArrivalAirport) {
      const fetchKey = `${departureCity || ""}|${arrivalCity || ""}|${needsDepartureAirport ? 1 : 0}|${needsArrivalAirport ? 1 : 0}`;
      if (airportFetchKeyRef.current === fetchKey) return;
      airportFetchKeyRef.current = fetchKey;

      markSearchButtonShown();
      const messageId = `airport-selection-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: messageId, role: "assistant", text: "", isTyping: true },
      ]);

      const fetchAirports = async () => {
        try {
          const [fromAirports, toAirports] = await Promise.all([
            needsDepartureAirport && departureCity
              ? findNearestAirports(departureCity, 3, departureCountryCode)
              : null,
            needsArrivalAirport && arrivalCity
              ? findNearestAirports(arrivalCity, 3, arrivalCountryCode)
              : null,
          ]);

          let dualChoices: DualAirportChoice | undefined;
          if (fromAirports?.airports?.length || toAirports?.airports?.length) {
            dualChoices = {};
            if (fromAirports?.airports?.length) {
              dualChoices.from = {
                field: "from",
                cityName: departureCity || departure,
                airports: fromAirports.airports,
              };
            }
            if (toAirports?.airports?.length) {
              dualChoices.to = {
                field: "to",
                cityName: arrivalCity || arrival,
                airports: toAirports.airports,
              };
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `${t("planner.messages.tripConfigured", { from: departure, to: arrival })}\n\n${t("planner.messages.departureDate", { date: depDate })}${retDate ? `\n${t("planner.messages.returnDate", { date: retDate })}` : ""}\n${t(travelers > 1 ? "planner.messages.travelersPlural" : "planner.messages.travelers", { count: travelers })}\n\n${t("planner.messages.selectAirports")}`,
                    isTyping: false,
                    dualAirportChoices: dualChoices,
                  }
                : m
            )
          );
        } catch (error) {
          console.error("Error fetching airports:", error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `${t("planner.messages.tripConfigured", { from: departure, to: arrival })}\n\n${t("planner.messages.selectAirportsPanel")}`,
                    isTyping: false,
                  }
                : m
            )
          );
        }
      };

      fetchAirports();
    } else {
      markSearchButtonShown();
      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-auto-${Date.now()}`,
          role: "assistant",
          text: `${t("planner.messages.searchReady", { from: `${departure}${depCode}`, to: `${arrival}${arrCode}` })}\n\n${t("planner.messages.departureDate", { date: depDate })}${retDate ? `\n${t("planner.messages.returnDate", { date: retDate })}` : ""}\n${t(travelers > 1 ? "planner.messages.travelersPlural" : "planner.messages.travelers", { count: travelers })}\n\n${t("planner.messages.clickToSearch")}`,
          hasSearchButton: true,
        },
      ]);
    }
  }, [
    hasCompleteInfo,
    departureCity,
    arrivalCity,
    departureIata,
    arrivalIata,
    arrivalCountryCode,
    departureCountryCode,
    departureDateMs,
    returnDateMs,
    passengersTotal,
    needsDepartureAirport,
    needsArrivalAirport,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable function refs
    isSearchButtonShown, markSearchButtonShown, setMessages, t, dateFnsLocale,
    isSwitchingSessionRef, isHardResetRef,
  ]);

  return { airportFetchKeyRef };
}

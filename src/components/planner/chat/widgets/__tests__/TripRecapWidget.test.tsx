/**
 * TripRecapWidget Tests
 */

import "@/i18n/config";
import { render } from "@testing-library/react";
import { screen, fireEvent } from "@testing-library/dom";
import { describe, it, expect, vi } from "vitest";
import { TripRecapWidget } from "../TripRecapWidget";
import type { TripRecapData } from "../../types";

const fullRecap: TripRecapData = {
  destination: { city: "Tegucigalpa", country: "Honduras", countryCode: "HN" },
  dates: { departure: "5 mars 2025", return: "26 mars 2025", duration: "21 jours" },
  travelers: { adults: 2, children: 1, description: "2 adultes, 1 enfant" },
  flight: {
    fromCity: "Paris",
    fromIata: "CDG",
    toCity: "Tegucigalpa",
    toIata: "TGU",
    airline: "Air France",
    price: 850,
    currency: "EUR",
  },
  accommodation: {
    name: "Hotel Honduras Maya",
    type: "Hôtel",
    stars: 4,
    pricePerNight: 95,
    currency: "EUR",
    neighborhood: "Centro",
  },
  activities: [
    { day: 1, title: "Visite du centre historique", description: "Architecture coloniale" },
    { day: 2, title: "Excursion Copán Ruinas" },
  ],
  budget: { estimated: 3200, currency: "EUR", breakdown: "Vol + hébergement + activités" },
  notes: "Pensez à un adaptateur électrique.",
};

const minimalRecap: TripRecapData = {
  destination: { city: "Lisbonne", country: "Portugal" },
};

describe("TripRecapWidget", () => {
  it("renders destination city and country", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText(/Tegucigalpa, Honduras/)).toBeInTheDocument();
    expect(screen.getByText("(HN)")).toBeInTheDocument();
  });

  it("renders dates when provided", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText(/5 mars 2025 → 26 mars 2025/)).toBeInTheDocument();
    expect(screen.getByText("21 jours")).toBeInTheDocument();
  });

  it("renders travelers description", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText("2 adultes, 1 enfant")).toBeInTheDocument();
  });

  it("renders flight details", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText(/Paris.*CDG.*→.*Tegucigalpa.*TGU/)).toBeInTheDocument();
    expect(screen.getByText("Air France")).toBeInTheDocument();
    expect(screen.getByText(/850 EUR/)).toBeInTheDocument();
  });

  it("renders accommodation details", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText("Hotel Honduras Maya")).toBeInTheDocument();
    expect(screen.getByText(/95 EUR\/nuit/)).toBeInTheDocument();
    expect(screen.getByText("Centro")).toBeInTheDocument();
  });

  it("renders activities", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText("Visite du centre historique")).toBeInTheDocument();
    expect(screen.getByText("Excursion Copán Ruinas")).toBeInTheDocument();
  });

  it("renders budget", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText(/3200 EUR/)).toBeInTheDocument();
    expect(screen.getByText(/Vol \+ hébergement \+ activités/)).toBeInTheDocument();
  });

  it("renders notes", () => {
    render(<TripRecapWidget data={fullRecap} />);

    expect(screen.getByText("Pensez à un adaptateur électrique.")).toBeInTheDocument();
  });

  it("handles minimal data (destination only)", () => {
    render(<TripRecapWidget data={minimalRecap} />);

    expect(screen.getByText(/Lisbonne, Portugal/)).toBeInTheDocument();
    // No dates, travelers, etc. should not crash
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });

  it("renders copy button", () => {
    render(<TripRecapWidget data={fullRecap} />);

    const copyButton = screen.getByTitle(/copy|copier/i);
    expect(copyButton).toBeInTheDocument();
  });

  it("calls clipboard on copy click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });

    render(<TripRecapWidget data={fullRecap} />);

    const copyButton = screen.getByTitle(/copy|copier/i);
    fireEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Tegucigalpa, Honduras"));

    vi.unstubAllGlobals();
  });
});

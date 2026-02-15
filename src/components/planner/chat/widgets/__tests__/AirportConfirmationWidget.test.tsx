/**
 * AirportConfirmationWidget Tests
 */

import "@/i18n/config";
import { render } from "@testing-library/react";
import { screen, fireEvent } from "@testing-library/dom";
import { describe, it, expect, vi } from "vitest";
import { AirportConfirmationWidget } from "../AirportWidgets";
import type { AirportConfirmationData } from "@/types/flight";

const mockAirport = (iata: string, name: string, city: string, distance: number) => ({
  iata,
  name,
  city_name: city,
  country_code: "FR",
  lat: 48.8566,
  lon: 2.3522,
  distance_km: distance,
});

const mockData: AirportConfirmationData = {
  legs: [
    {
      legIndex: 0,
      from: {
        city: "Paris",
        suggestedAirport: mockAirport("CDG", "Charles de Gaulle", "Paris", 25),
        alternativeAirports: [
          mockAirport("ORY", "Orly", "Paris", 14),
        ],
      },
      to: {
        city: "Tegucigalpa",
        suggestedAirport: mockAirport("TGU", "Toncontín International", "Tegucigalpa", 5),
        alternativeAirports: [
          mockAirport("SAP", "Ramón Villeda Morales", "San Pedro Sula", 180),
        ],
      },
      date: new Date("2025-03-05"),
    },
  ],
};

const twoLegData: AirportConfirmationData = {
  legs: [
    {
      legIndex: 0,
      from: {
        city: "Paris",
        suggestedAirport: mockAirport("CDG", "Charles de Gaulle", "Paris", 25),
        alternativeAirports: [],
      },
      to: {
        city: "Tegucigalpa",
        suggestedAirport: mockAirport("TGU", "Toncontín International", "Tegucigalpa", 5),
        alternativeAirports: [],
      },
    },
    {
      legIndex: 1,
      from: {
        city: "Tegucigalpa",
        suggestedAirport: mockAirport("TGU", "Toncontín International", "Tegucigalpa", 5),
        alternativeAirports: [],
      },
      to: {
        city: "Paris",
        suggestedAirport: mockAirport("CDG", "Charles de Gaulle", "Paris", 25),
        alternativeAirports: [],
      },
    },
  ],
};

describe("AirportConfirmationWidget", () => {
  it("renders all legs", () => {
    const onConfirm = vi.fn();
    render(<AirportConfirmationWidget data={twoLegData} onConfirm={onConfirm} />);

    // Both legs should show their routes
    expect(screen.getByText("Paris → Tegucigalpa")).toBeInTheDocument();
    expect(screen.getByText("Tegucigalpa → Paris")).toBeInTheDocument();
  });

  it("displays suggested airports", () => {
    const onConfirm = vi.fn();
    render(<AirportConfirmationWidget data={mockData} onConfirm={onConfirm} />);

    // Suggested airports should show IATA codes
    expect(screen.getAllByText("CDG").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("TGU").length).toBeGreaterThanOrEqual(1);
  });

  it("shows alternatives when 'see others' is clicked", () => {
    const onConfirm = vi.fn();
    render(<AirportConfirmationWidget data={mockData} onConfirm={onConfirm} />);

    // Find the "see others" button for the departure side
    const seeOthersButtons = screen.getAllByText(/see.*other|voir.*autre/i);
    expect(seeOthersButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(seeOthersButtons[0]);

    // ORY alternative should now be visible
    expect(screen.getByText("ORY")).toBeInTheDocument();
  });

  it("calls onConfirm with selected airports", () => {
    const onConfirm = vi.fn();
    render(<AirportConfirmationWidget data={mockData} onConfirm={onConfirm} />);

    // Find and click the confirm/search button
    const searchButton = screen.getByRole("button", { name: /search|recherch/i });
    fireEvent.click(searchButton);

    expect(onConfirm).toHaveBeenCalledWith({
      legs: [
        expect.objectContaining({
          legIndex: 0,
          fromIata: "CDG",
          toIata: "TGU",
        }),
      ],
    });
  });

  it("shows confirmed state after confirmation", () => {
    const onConfirm = vi.fn();
    render(<AirportConfirmationWidget data={mockData} onConfirm={onConfirm} />);

    const searchButton = screen.getByRole("button", { name: /search|recherch/i });
    fireEvent.click(searchButton);

    // After confirmation, should show confirmed airports
    expect(screen.getByText(/confirm/i)).toBeInTheDocument();
  });

  it("allows changing an airport from alternatives", () => {
    const onConfirm = vi.fn();
    render(<AirportConfirmationWidget data={mockData} onConfirm={onConfirm} />);

    // Open alternatives for departure
    const seeOthersButtons = screen.getAllByText(/see.*other|voir.*autre/i);
    fireEvent.click(seeOthersButtons[0]);

    // Click on ORY alternative
    const oryButton = screen.getByText("ORY").closest("button");
    if (oryButton) {
      fireEvent.click(oryButton);
    }

    // Now confirm with the changed airport
    const searchButton = screen.getByRole("button", { name: /search|recherch/i });
    fireEvent.click(searchButton);

    expect(onConfirm).toHaveBeenCalledWith({
      legs: [
        expect.objectContaining({
          fromIata: "ORY",
          toIata: "TGU",
        }),
      ],
    });
  });
});

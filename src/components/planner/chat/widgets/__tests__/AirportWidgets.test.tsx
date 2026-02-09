/**
 * AirportWidgets Tests
 */

import "@/i18n/config";
import { render } from "@testing-library/react";
import { screen, fireEvent } from "@testing-library/dom";
import { describe, it, expect, vi } from "vitest";
import { AirportButton, DualAirportSelection } from "../AirportWidgets";
import type { Airport } from "@/hooks/useNearestAirports";

const mockAirport: Airport = {
  iata: "CDG",
  name: "Paris Charles de Gaulle",
  city_name: "Paris",
  country_code: "FR",
  lat: 49.0097,
  lon: 2.5479,
  distance_km: 25.5,
};

const mockAirport2: Airport = {
  iata: "ORY",
  name: "Paris Orly",
  city_name: "Paris",
  country_code: "FR",
  lat: 48.7262,
  lon: 2.3652,
  distance_km: 14.2,
};

const mockAirportBarcelona: Airport = {
  iata: "BCN",
  name: "Barcelona El Prat",
  city_name: "Barcelona",
  country_code: "ES",
  lat: 41.2974,
  lon: 2.0833,
  distance_km: 12.8,
};

describe("AirportButton", () => {
  it("renders airport IATA code", () => {
    const onClick = vi.fn();
    render(<AirportButton airport={mockAirport} onClick={onClick} />);

    expect(screen.getByText("CDG")).toBeInTheDocument();
  });

  it("renders city name", () => {
    const onClick = vi.fn();
    render(<AirportButton airport={mockAirport} onClick={onClick} />);

    expect(screen.getByText("Paris")).toBeInTheDocument();
  });

  it("renders distance", () => {
    const onClick = vi.fn();
    render(<AirportButton airport={mockAirport} onClick={onClick} />);

    expect(screen.getByText("26km")).toBeInTheDocument(); // 25.5 rounded
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<AirportButton airport={mockAirport} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalled();
  });

  it("is disabled when disabled prop is true", () => {
    const onClick = vi.fn();
    render(<AirportButton airport={mockAirport} onClick={onClick} disabled={true} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<AirportButton airport={mockAirport} onClick={onClick} disabled={true} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("DualAirportSelection", () => {
  const dualChoices = {
    from: {
      field: "from" as const,
      cityName: "Paris",
      airports: [mockAirport, mockAirport2],
    },
    to: {
      field: "to" as const,
      cityName: "Barcelona",
      airports: [mockAirportBarcelona],
    },
  };

  it("renders departure section with city name", () => {
    const onSelect = vi.fn();
    render(<DualAirportSelection choices={dualChoices} onSelect={onSelect} />);

    expect(screen.getByText(/Departure/)).toBeInTheDocument();
    expect(screen.getAllByText(/Paris/).length).toBeGreaterThan(0);
  });

  it("renders arrival section with city name", () => {
    const onSelect = vi.fn();
    render(<DualAirportSelection choices={dualChoices} onSelect={onSelect} />);

    expect(screen.getByText(/Arrival/)).toBeInTheDocument();
    expect(screen.getAllByText(/Barcelona/).length).toBeGreaterThan(0);
  });

  it("renders all departure airports", () => {
    const onSelect = vi.fn();
    render(<DualAirportSelection choices={dualChoices} onSelect={onSelect} />);

    expect(screen.getByText("CDG")).toBeInTheDocument();
    expect(screen.getByText("ORY")).toBeInTheDocument();
  });

  it("renders all arrival airports", () => {
    const onSelect = vi.fn();
    render(<DualAirportSelection choices={dualChoices} onSelect={onSelect} />);

    expect(screen.getByText("BCN")).toBeInTheDocument();
  });

  it("calls onSelect with 'from' when departure airport is clicked", () => {
    const onSelect = vi.fn();
    render(<DualAirportSelection choices={dualChoices} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("CDG"));

    expect(onSelect).toHaveBeenCalledWith("from", mockAirport);
  });

  it("calls onSelect with 'to' when arrival airport is clicked", () => {
    const onSelect = vi.fn();
    render(<DualAirportSelection choices={dualChoices} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("BCN"));

    expect(onSelect).toHaveBeenCalledWith("to", mockAirportBarcelona);
  });

  it("handles missing from section", () => {
    const onSelect = vi.fn();
    const choicesWithoutFrom = {
      to: dualChoices.to,
    };
    render(<DualAirportSelection choices={choicesWithoutFrom} onSelect={onSelect} />);

    expect(screen.queryByText(/Departure/)).not.toBeInTheDocument();
    expect(screen.getByText(/Arrival/)).toBeInTheDocument();
  });

  it("handles missing to section", () => {
    const onSelect = vi.fn();
    const choicesWithoutTo = {
      from: dualChoices.from,
    };
    render(<DualAirportSelection choices={choicesWithoutTo} onSelect={onSelect} />);

    expect(screen.getByText(/Departure/)).toBeInTheDocument();
    expect(screen.queryByText(/Arrival/)).not.toBeInTheDocument();
  });

  it("disables all buttons when disabled prop is true", () => {
    const onSelect = vi.fn();
    render(<DualAirportSelection choices={dualChoices} onSelect={onSelect} disabled={true} />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});

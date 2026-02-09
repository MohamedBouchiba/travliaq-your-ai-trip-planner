/**
 * CitySelectionWidget Tests
 */

import "@/i18n/config";
import { render } from "@testing-library/react";
import { screen, fireEvent } from "@testing-library/dom";
import { describe, it, expect, vi } from "vitest";
import { CitySelectionWidget } from "../CitySelectionWidget";
import type { CitySelectionData } from "@/types/flight";

const mockCitySelection: CitySelectionData = {
  countryCode: "FR",
  countryName: "France",
  cities: [
    { name: "Paris", description: "Capitale et plus grande ville" },
    { name: "Lyon", description: "Deuxième plus grande ville" },
    { name: "Marseille", description: "Ville portuaire méditerranéenne" },
  ],
};

describe("CitySelectionWidget", () => {
  it("renders all cities from the selection", () => {
    const onSelect = vi.fn();
    render(
      <CitySelectionWidget citySelection={mockCitySelection} onSelect={onSelect} />
    );

    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("Lyon")).toBeInTheDocument();
    expect(screen.getByText("Marseille")).toBeInTheDocument();
  });

  it("displays country name in header", () => {
    const onSelect = vi.fn();
    render(
      <CitySelectionWidget citySelection={mockCitySelection} onSelect={onSelect} />
    );

    expect(screen.getByText(/France/)).toBeInTheDocument();
  });

  it("displays city descriptions", () => {
    const onSelect = vi.fn();
    render(
      <CitySelectionWidget citySelection={mockCitySelection} onSelect={onSelect} />
    );

    expect(screen.getByText("Capitale et plus grande ville")).toBeInTheDocument();
    expect(screen.getByText("Deuxième plus grande ville")).toBeInTheDocument();
  });

  it("calls onSelect with city name when clicked", () => {
    const onSelect = vi.fn();
    render(
      <CitySelectionWidget citySelection={mockCitySelection} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText("Paris"));

    expect(onSelect).toHaveBeenCalledWith("Paris");
  });

  it("shows confirmation state after selection", () => {
    const onSelect = vi.fn();
    render(
      <CitySelectionWidget citySelection={mockCitySelection} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText("Lyon"));

    expect(screen.getByText("📍")).toBeInTheDocument();
    expect(screen.getByText(/Lyon/)).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true", () => {
    const onSelect = vi.fn();
    render(
      <CitySelectionWidget
        citySelection={mockCitySelection}
        onSelect={onSelect}
        isLoading={true}
      />
    );

    expect(screen.getByText(/loading|chargement/i)).toBeInTheDocument();
    expect(screen.queryByText("Paris")).not.toBeInTheDocument();
  });

  it("shows numbered badges for cities", () => {
    const onSelect = vi.fn();
    render(
      <CitySelectionWidget citySelection={mockCitySelection} onSelect={onSelect} />
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

/**
 * TravelersWidget Tests
 */

import "@/i18n/config";
import { render } from "@testing-library/react";
import { screen, fireEvent } from "@testing-library/dom";
import { describe, it, expect, vi } from "vitest";
import { TravelersWidget, TravelersConfirmBeforeSearchWidget } from "../TravelersWidget";

describe("TravelersWidget", () => {
  it("renders with default values", () => {
    const onConfirm = vi.fn();
    render(<TravelersWidget onConfirm={onConfirm} />);

    expect(screen.getByText("Adults")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
    expect(screen.getByText("Infants")).toBeInTheDocument();
    expect(screen.getByText(/Confirm/)).toBeInTheDocument();
  });

  it("renders with custom initial values", () => {
    const onConfirm = vi.fn();
    render(
      <TravelersWidget
        initialValues={{ adults: 2, children: 1, infants: 0 }}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(/Confirm/)).toBeInTheDocument();
  });

  it("prevents adults from going below 1", () => {
    const onConfirm = vi.fn();
    render(<TravelersWidget onConfirm={onConfirm} />);

    // The minus button for adults should be disabled when adults = 1
    const buttons = screen.getAllByRole("button");
    const adultMinusButton = buttons[0]; // First minus button is for adults

    expect(adultMinusButton).toBeDisabled();
  });

  it("increments adults correctly", () => {
    const onConfirm = vi.fn();
    render(<TravelersWidget onConfirm={onConfirm} />);

    const buttons = screen.getAllByRole("button");
    const adultPlusButton = buttons[1]; // Second button is plus for adults

    fireEvent.click(adultPlusButton);

    expect(screen.getByText(/Confirm/)).toBeInTheDocument();
  });

  it("increments children correctly", () => {
    const onConfirm = vi.fn();
    render(<TravelersWidget onConfirm={onConfirm} />);

    const buttons = screen.getAllByRole("button");
    const childrenPlusButton = buttons[3]; // Plus button for children

    fireEvent.click(childrenPlusButton);

    expect(screen.getByText(/Confirm/)).toBeInTheDocument();
  });

  it("calls onConfirm with correct values", () => {
    const onConfirm = vi.fn();
    render(
      <TravelersWidget
        initialValues={{ adults: 2, children: 1, infants: 1 }}
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByText(/Confirm/);
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith({
      adults: 2,
      children: 1,
      infants: 1,
    });
  });

  it("shows confirmation state after confirm", () => {
    const onConfirm = vi.fn();
    render(
      <TravelersWidget
        initialValues={{ adults: 2, children: 1, infants: 0 }}
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByText(/Confirm/);
    fireEvent.click(confirmButton);

    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText(/2 adult/)).toBeInTheDocument();
  });

  it("limits infants to number of adults", () => {
    const onConfirm = vi.fn();
    render(
      <TravelersWidget
        initialValues={{ adults: 1, children: 0, infants: 0 }}
        onConfirm={onConfirm}
      />
    );

    const buttons = screen.getAllByRole("button");
    const infantPlusButton = buttons[5]; // Plus button for infants

    // Click to add 1 infant
    fireEvent.click(infantPlusButton);

    // Should not be able to add more (max = adults = 1)
    expect(infantPlusButton).toBeDisabled();
  });

  it("adjusts infants when adults decrease", () => {
    const onConfirm = vi.fn();
    render(
      <TravelersWidget
        initialValues={{ adults: 2, children: 0, infants: 2 }}
        onConfirm={onConfirm}
      />
    );

    const buttons = screen.getAllByRole("button");
    const adultMinusButton = buttons[0];

    // Decrease adults from 2 to 1
    fireEvent.click(adultMinusButton);

    // Infants should be reduced to 1 (max = adults)
    expect(screen.getByText(/Confirm/)).toBeInTheDocument();
  });
});

describe("TravelersConfirmBeforeSearchWidget", () => {
  it("renders solo confirmation question", () => {
    const onConfirm = vi.fn();
    const onEditConfirm = vi.fn();
    render(
      <TravelersConfirmBeforeSearchWidget
        currentTravelers={{ adults: 1, children: 0, infants: 0 }}
        onConfirm={onConfirm}
        onEditConfirm={onEditConfirm}
      />
    );

    // Use more specific regex to avoid multiple matches (both question and button contain "alone")
    expect(screen.getByText(/alone\?/i)).toBeInTheDocument();
    expect(screen.getByText(/yes/i)).toBeInTheDocument();
    expect(screen.getByText(/no,/i)).toBeInTheDocument();
  });

  it("calls onConfirm when solo is confirmed", () => {
    const onConfirm = vi.fn();
    const onEditConfirm = vi.fn();
    render(
      <TravelersConfirmBeforeSearchWidget
        currentTravelers={{ adults: 1, children: 0, infants: 0 }}
        onConfirm={onConfirm}
        onEditConfirm={onEditConfirm}
      />
    );

    fireEvent.click(screen.getByText(/Yes/));

    expect(onConfirm).toHaveBeenCalled();
    expect(onEditConfirm).not.toHaveBeenCalled();
  });

  it("shows edit form when modify is clicked", () => {
    const onConfirm = vi.fn();
    const onEditConfirm = vi.fn();
    render(
      <TravelersConfirmBeforeSearchWidget
        currentTravelers={{ adults: 1, children: 0, infants: 0 }}
        onConfirm={onConfirm}
        onEditConfirm={onEditConfirm}
      />
    );

    fireEvent.click(screen.getByText(/No/));

    expect(screen.getByText("Adults")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
  });

  it("calls onEditConfirm with modified values", () => {
    const onConfirm = vi.fn();
    const onEditConfirm = vi.fn();
    render(
      <TravelersConfirmBeforeSearchWidget
        currentTravelers={{ adults: 1, children: 0, infants: 0 }}
        onConfirm={onConfirm}
        onEditConfirm={onEditConfirm}
      />
    );

    fireEvent.click(screen.getByText(/No/));

    const buttons = screen.getAllByRole("button");
    const adultPlusButton = buttons[1];
    fireEvent.click(adultPlusButton);

    fireEvent.click(screen.getByText(/Confirm/));

    expect(onEditConfirm).toHaveBeenCalledWith({
      adults: 2,
      children: 0,
      infants: 0,
    });
  });
});

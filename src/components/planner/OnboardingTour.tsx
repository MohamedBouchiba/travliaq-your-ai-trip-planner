import { useState, useEffect, useCallback, useRef } from "react";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import { eventBus } from "@/lib/eventBus";
import type { TabType } from "@/pages/TravelPlanner";
import { useTranslation } from "react-i18next";

interface OnboardingTourProps {
  forceShow?: boolean;
  onComplete?: () => void;
  onPanelVisibilityChange?: (visible: boolean) => void;
  onRequestAnimation?: () => void;
}

import { STORAGE_KEYS } from "@/config/storageKeys";
const STORAGE_KEY = STORAGE_KEYS.ONBOARDING_COMPLETED;

interface StepConfig {
  tab?: TabType;
  panelOpen?: boolean;
}

const STEP_CONFIG: Record<number, StepConfig> = {
  0: { panelOpen: false }, // Welcome intro - nothing highlighted
  1: { panelOpen: true, tab: "flights" }, // Chat
  2: { panelOpen: true, tab: "flights" }, // Tabs bar
  3: { panelOpen: false }, // Map
  4: { panelOpen: true, tab: "flights" }, // Flights widget
  5: { panelOpen: true, tab: "stays" }, // Stays widget
  6: { panelOpen: true, tab: "activities" }, // Activities widget
  7: { panelOpen: true, tab: "preferences" }, // Preferences widget
  8: { panelOpen: true, tab: "flights" }, // Final - always return to Flights
};

// Enhanced CSS with smooth animations for driver.js
function injectDriverStyles() {
  if (document.getElementById("driver-custom-styles")) return;
  
  const style = document.createElement("style");
  style.id = "driver-custom-styles";
  style.textContent = `
    /* Smooth overlay transition */
    .driver-overlay {
      background: rgba(0, 0, 0, 0.75) !important;
      transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      z-index: 9998 !important;
      pointer-events: none !important; /* IMPORTANT: don't block chat typing */
    }

    /* driver.js also injects a "stage" layer that can block interactions */
    .driver-stage,
    .driver-stage * {
      pointer-events: none !important;
    }

    /* keep the onboarding modal clickable */
    .driver-popover,
    .driver-popover * {
      pointer-events: auto !important;
    }

    /* Highlighted element with smooth glow animation */
    .driver-active-element {
      z-index: 10001 !important;
      border-radius: 16px !important;
      box-shadow:
        0 0 0 4px hsl(var(--primary)),
        0 0 30px 10px hsl(var(--primary) / 0.4) !important;
      animation: travliaq-pulse-glow 2s ease-in-out infinite !important;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* CRITICAL: Always allow chat interaction even during tour */
    .driver-active [data-tour="chat-panel"],
    .driver-active [data-tour="chat-panel"] *,
    .driver-active textarea,
    .driver-active [role="textbox"] {
      pointer-events: auto !important;
    }

    @keyframes travliaq-pulse-glow {
      0%, 100% {
        box-shadow:
          0 0 0 4px hsl(var(--primary)),
          0 0 30px 10px hsl(var(--primary) / 0.4);
      }
      50% {
        box-shadow:
          0 0 0 6px hsl(var(--primary)),
          0 0 50px 15px hsl(var(--primary) / 0.5);
      }
    }

    /* Tab highlight with smooth animation - MUST be above driver.js overlay */
    .travliaq-tab-highlight {
      position: relative !important;
      z-index: 100002 !important;
      box-shadow:
        0 0 0 4px hsl(var(--primary)),
        0 0 30px 10px hsl(var(--primary) / 0.5),
        inset 0 0 0 1px hsl(var(--primary) / 0.3) !important;
      border-radius: 12px !important;
      animation: travliaq-tab-glow 1.2s ease-in-out infinite !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      background: hsl(var(--primary) / 0.15) !important;
      outline: 2px solid hsl(var(--primary-foreground) / 0.8) !important;
      outline-offset: 2px !important;
    }

    @keyframes travliaq-tab-glow {
      0%, 100% {
        box-shadow:
          0 0 0 4px hsl(var(--primary)),
          0 0 30px 10px hsl(var(--primary) / 0.5),
          inset 0 0 0 1px hsl(var(--primary) / 0.3);
        transform: scale(1);
      }
      50% {
        box-shadow:
          0 0 0 6px hsl(var(--primary)),
          0 0 50px 15px hsl(var(--primary) / 0.6),
          inset 0 0 0 2px hsl(var(--primary) / 0.4);
        transform: scale(1.03);
      }
    }

    /* Popover with smooth entrance animation */
    .driver-popover {
      z-index: 10005 !important;
      opacity: 1 !important;
      background: hsl(var(--card)) !important;
      border: 1px solid hsl(var(--border)) !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5) !important;
      padding: 0 !important;
      max-width: 420px !important;
      min-width: 340px !important;
      max-height: none !important;
      overflow: visible !important;
      display: flex !important;
      flex-direction: column !important;
      animation: travliaq-popover-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      transform-origin: center center !important;
    }

    @keyframes travliaq-popover-enter {
      0% {
        opacity: 0;
        transform: scale(0.9) translateY(10px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    /* Separate animations for fixed popovers to avoid transform conflicts */
    @keyframes travliaq-popover-enter-center {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.92);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    @keyframes travliaq-popover-enter-right {
      0% {
        opacity: 0;
        transform: translateY(-50%) scale(0.92);
      }
      100% {
        opacity: 1;
        transform: translateY(-50%) scale(1);
      }
    }

    .driver-popover-arrow {
      display: none !important;
    }

    /* Progress header with fade-in */
    .travliaq-progress-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 16px 20px !important;
      border-bottom: 1px solid hsl(var(--border) / 0.5) !important;
      background: hsl(var(--muted) / 0.3) !important;
      border-radius: 16px 16px 0 0 !important;
      animation: travliaq-fade-in 0.3s ease-out 0.1s both !important;
    }

    @keyframes travliaq-fade-in {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .travliaq-step-counter {
      font-size: 0.8125rem !important;
      font-weight: 600 !important;
      color: hsl(var(--muted-foreground)) !important;
      background: hsl(var(--background)) !important;
      padding: 6px 12px !important;
      border-radius: 8px !important;
      border: 1px solid hsl(var(--border) / 0.5) !important;
      transition: all 0.3s ease !important;
    }

    .travliaq-progress-dots {
      display: flex !important;
      gap: 6px !important;
    }

    .travliaq-dot {
      width: 8px !important;
      height: 8px !important;
      border-radius: 50% !important;
      background: hsl(var(--muted-foreground) / 0.3) !important;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }

    .travliaq-dot.active {
      background: hsl(var(--primary)) !important;
      transform: scale(1.4) !important;
      box-shadow: 0 0 8px hsl(var(--primary) / 0.5) !important;
    }

    .travliaq-dot.completed {
      background: hsl(var(--primary) / 0.6) !important;
      transform: scale(1.1) !important;
    }

    /* Close button with smooth hover */
    .travliaq-close-btn {
      width: 28px !important;
      height: 28px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: hsl(var(--muted) / 0.5) !important;
      border: 1px solid hsl(var(--border) / 0.5) !important;
      border-radius: 8px !important;
      color: hsl(var(--muted-foreground)) !important;
      font-size: 16px !important;
      cursor: pointer !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      margin-left: 12px !important;
    }

    .travliaq-close-btn:hover {
      background: hsl(var(--destructive) / 0.1) !important;
      color: hsl(var(--destructive)) !important;
      border-color: hsl(var(--destructive) / 0.3) !important;
      transform: scale(1.1) !important;
    }

    /* Hide default close button */
    .driver-popover-close-btn {
      display: none !important;
    }

    /* Title with staggered animation */
    .driver-popover-title {
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: hsl(var(--foreground)) !important;
      padding: 20px 20px 10px 20px !important;
      margin: 0 !important;
      line-height: 1.3 !important;
      animation: travliaq-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.15s both !important;
    }

    @keyframes travliaq-slide-up {
      from {
        opacity: 0;
        transform: translateY(15px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Description with staggered animation */
    .driver-popover-description {
      color: hsl(var(--foreground)) !important;
      padding: 0 20px 16px 20px !important;
      font-size: 0.9375rem !important;
      line-height: 1.6 !important;
      flex: 1 1 auto !important;
      overflow: visible !important;
      animation: travliaq-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both !important;
    }

     .driver-popover-description p {
       margin: 0 0 12px 0 !important;
       color: hsl(var(--foreground) / 0.88) !important;
     }

    .driver-popover-description p:last-child {
      margin-bottom: 0 !important;
    }

    .driver-popover-description .highlight-badge {
      display: inline-block !important;
      background: hsl(var(--primary) / 0.15) !important;
      color: hsl(var(--primary)) !important;
      font-weight: 600 !important;
      padding: 4px 10px !important;
      border-radius: 6px !important;
      font-size: 0.75rem !important;
      margin-bottom: 12px !important;
      animation: travliaq-badge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both !important;
    }

    @keyframes travliaq-badge-pop {
      0% {
        opacity: 0;
        transform: scale(0.8);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .driver-popover-description ul {
      margin: 10px 0 !important;
      padding: 0 !important;
      list-style: none !important;
    }

    .driver-popover-description li {
      display: flex !important;
      align-items: flex-start !important;
      gap: 8px !important;
      padding: 8px 12px !important;
      margin: 6px 0 !important;
      background: hsl(var(--muted) / 0.4) !important;
      border-radius: 8px !important;
      font-size: 0.875rem !important;
      color: hsl(var(--foreground)) !important;
      opacity: 1 !important;
      animation: travliaq-list-item-enter 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
    }

    .driver-popover-description li:nth-child(1) { animation-delay: 0.1s !important; }
    .driver-popover-description li:nth-child(2) { animation-delay: 0.15s !important; }
    .driver-popover-description li:nth-child(3) { animation-delay: 0.2s !important; }
    .driver-popover-description li:nth-child(4) { animation-delay: 0.25s !important; }

    @keyframes travliaq-list-item-enter {
      from {
        opacity: 0.5;
        transform: translateX(-8px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .driver-popover-description li::before {
      content: "•" !important;
      color: hsl(var(--primary)) !important;
      font-weight: bold !important;
    }
    
    /* Fallback for reduced motion users */
    @media (prefers-reduced-motion: reduce) {
      .driver-popover,
      .driver-popover *,
      .feature-item,
      .driver-popover-description li {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
      .center-popover.driver-popover {
        transform: translate(-50%, -50%) !important;
      }
      .travliaq-popover-right.driver-popover {
        transform: translateY(-50%) !important;
      }
    }

    .driver-popover-description strong {
      color: hsl(var(--foreground)) !important;
      font-weight: 600 !important;
    }

    .driver-popover-description .tip-box {
      display: flex !important;
      align-items: flex-start !important;
      gap: 8px !important;
      background: hsl(var(--primary) / 0.1) !important;
      border: 1px solid hsl(var(--primary) / 0.2) !important;
      border-radius: 10px !important;
      padding: 10px 12px !important;
      margin-top: 12px !important;
      font-size: 0.8125rem !important;
      color: hsl(var(--primary)) !important;
      animation: travliaq-tip-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s both !important;
    }

    @keyframes travliaq-tip-enter {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .driver-popover-description .feature-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 6px !important;
      margin: 10px 0 !important;
    }

    .driver-popover-description .feature-item {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      background: hsl(var(--muted) / 0.5) !important;
      border-radius: 8px !important;
      padding: 8px 10px !important;
      font-size: 0.8125rem !important;
      font-weight: 500 !important;
      color: hsl(var(--foreground)) !important;
      opacity: 1 !important;
      animation: travliaq-feature-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
      transition: transform 0.2s ease, background 0.2s ease !important;
    }

    .driver-popover-description .feature-item:hover {
      transform: scale(1.03) !important;
      background: hsl(var(--muted) / 0.7) !important;
    }

    .driver-popover-description .feature-item:nth-child(1) { animation-delay: 0.1s !important; }
    .driver-popover-description .feature-item:nth-child(2) { animation-delay: 0.15s !important; }
    .driver-popover-description .feature-item:nth-child(3) { animation-delay: 0.2s !important; }
    .driver-popover-description .feature-item:nth-child(4) { animation-delay: 0.25s !important; }

    @keyframes travliaq-feature-pop {
      0% {
        opacity: 0.6;
        transform: scale(0.92);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Footer with slide-up animation */
    .driver-popover-footer {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 10px !important;
      padding: 16px 20px !important;
      border-top: 1px solid hsl(var(--border) / 0.5) !important;
      background: hsl(var(--muted) / 0.2) !important;
      border-radius: 0 0 16px 16px !important;
      animation: travliaq-footer-enter 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.25s both !important;
    }

    @keyframes travliaq-footer-enter {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Hide default progress text in footer */
    .driver-popover-footer .driver-popover-progress-text {
      display: none !important;
    }

    /* Stop/skip button (explicit in tooltip) */
    .travliaq-skip-btn {
      background: transparent !important;
      border: 1px solid hsl(var(--border)) !important;
      color: hsl(var(--muted-foreground)) !important;
      padding: 10px 14px !important;
      border-radius: 8px !important;
      font-size: 0.875rem !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      margin-right: auto !important;
    }

    .travliaq-skip-btn:hover {
      background: hsl(var(--muted) / 0.6) !important;
      color: hsl(var(--foreground)) !important;
    }

    /* Prev button with smooth transitions */
    .driver-popover-prev-btn {
      background: hsl(var(--background)) !important;
      border: 1px solid hsl(var(--border)) !important;
      color: hsl(var(--foreground)) !important;
      padding: 10px 16px !important;
      border-radius: 8px !important;
      font-size: 0.875rem !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    .driver-popover-prev-btn:hover {
      background: hsl(var(--muted)) !important;
      transform: translateX(-2px) !important;
    }

    .driver-popover-prev-btn:active {
      transform: translateX(-4px) scale(0.98) !important;
    }

    /* Next button with smooth transitions */
    .driver-popover-next-btn {
      background: hsl(var(--primary)) !important;
      border: none !important;
      color: hsl(var(--primary-foreground)) !important;
      padding: 10px 20px !important;
      border-radius: 8px !important;
      font-size: 0.875rem !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 4px 12px hsl(var(--primary) / 0.3) !important;
      animation: travliaq-button-glow 2s ease-in-out infinite !important;
    }

    @keyframes travliaq-button-glow {
      0%, 100% {
        box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
      }
      50% {
        box-shadow: 0 6px 20px hsl(var(--primary) / 0.5);
      }
    }

    .driver-popover-next-btn:hover {
      transform: translateY(-2px) scale(1.02) !important;
      box-shadow: 0 8px 25px hsl(var(--primary) / 0.4) !important;
    }

    .driver-popover-next-btn:active {
      transform: translateY(0) scale(0.98) !important;
    }

    /* Center popover class - position at center of screen */
    .center-popover.driver-popover {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 10002 !important;
      animation: travliaq-popover-enter-center 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      max-height: none !important;
      overflow: visible !important;
    }

    /* Larger popover for dense steps (ex: barre d'outils)
       Keep it responsive to avoid weird stretched layouts on smaller screens. */
    .travliaq-popover-large.driver-popover {
      width: min(92vw, 520px) !important;
      max-width: 520px !important;
      min-width: 0 !important;
    }

    /* Re-designed "Barre d'Outils" step popover (no transparency/glass) */
    .travliaq-toolbar-popover.driver-popover {
      background: hsl(var(--card)) !important;
      border: 1px solid hsl(var(--border)) !important;
      box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.55) !important;
    }

    .travliaq-toolbar-popover .travliaq-progress-header {
      background: hsl(var(--card)) !important;
      border-bottom: 1px solid hsl(var(--border)) !important;
    }

    .travliaq-toolbar-popover .driver-popover-description {
      padding-top: 6px !important;
    }

    .travliaq-toolbar-popover .driver-popover-description ul {
      margin-top: 8px !important;
    }

    .travliaq-toolbar-popover .driver-popover-description li {
      background: hsl(var(--muted) / 0.35) !important;
      border: 1px solid hsl(var(--border) / 0.6) !important;
    }
    
    /* Intro modal - no element highlighted */
    .intro-modal.driver-popover {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 10002 !important;
      animation: travliaq-popover-enter-center 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      max-width: 460px !important;
      border: 2px solid hsl(var(--primary) / 0.3) !important;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 60px hsl(var(--primary) / 0.15) !important;
    }
    
    /* Outro/finish modal */
    .outro-modal.driver-popover {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 10002 !important;
      animation: travliaq-popover-enter-center 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      max-width: 480px !important;
      border: 2px solid hsl(var(--primary) / 0.4) !important;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 80px hsl(var(--primary) / 0.2) !important;
    }

    /* Right popover for widget steps (avoid covering the left widgets panel) */
    .travliaq-popover-right.driver-popover {
      position: fixed !important;
      top: 50% !important;
      right: 24px !important;
      left: auto !important;
      transform: translateY(-50%) !important;
      z-index: 10002 !important;
      animation: travliaq-popover-enter-right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      max-height: none !important;
      overflow: visible !important;
    }

    /* Left popover for map step (avoid covering the map) */
    .travliaq-popover-left.driver-popover {
      position: fixed !important;
      top: 50% !important;
      left: 24px !important;
      right: auto !important;
      transform: translateY(-50%) !important;
      z-index: 10002 !important;
      animation: travliaq-popover-enter-right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      max-height: none !important;
      overflow: visible !important;
    }

    @media (max-width: 768px) {
      .travliaq-popover-right.driver-popover,
      .center-popover.driver-popover,
      .intro-modal.driver-popover,
      .outro-modal.driver-popover {
        left: 50% !important;
        right: auto !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: min(92vw, 400px) !important;
        max-height: min(85vh, 600px) !important;
        animation: travliaq-popover-enter-center 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }
    }
    
    /* Progress bar under dots */
    .travliaq-progress-bar-container {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    
    .travliaq-progress-bar {
      width: 60px !important;
      height: 3px !important;
      background: hsl(var(--muted) / 0.5) !important;
      border-radius: 2px !important;
      overflow: hidden !important;
    }
    
    .travliaq-progress-bar-fill {
      height: 100% !important;
      background: hsl(var(--primary)) !important;
      border-radius: 2px !important;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    .travliaq-step-label {
      font-size: 0.6875rem !important;
      color: hsl(var(--muted-foreground)) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      font-weight: 500 !important;
    }
  `;
  document.head.appendChild(style);
}

export default function OnboardingTour({
  forceShow = false,
  onComplete,
  onPanelVisibilityChange,
  onRequestAnimation,
}: OnboardingTourProps) {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  // Configure step: open tab and panel as needed
  const configureStep = useCallback(
    (index: number) => {
      const config = STEP_CONFIG[index];
      if (!config) return;

      if (config.panelOpen !== undefined) {
        onPanelVisibilityChange?.(config.panelOpen);
      }

      if (config.tab) {
        eventBus.emit("tab:change", { tab: config.tab });
      }
    },
    [onPanelVisibilityChange]
  );

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    localStorage.setItem(STORAGE_KEY, "true");

    // CRITICAL: Ensure driver.js never leaves the app in a non-interactive state
    document.body.classList.remove("driver-active");
    document.documentElement.classList.remove("driver-active");
    document
      .querySelectorAll(".driver-overlay, .driver-popover, .driver-stage")
      .forEach((el) => el.remove());

    // Clean up highlights
    document.querySelectorAll(".travliaq-tab-highlight").forEach((el) => {
      el.classList.remove("travliaq-tab-highlight");
    });

    // End-state: always come back to Flights (as requested)
    onPanelVisibilityChange?.(true);
    eventBus.emit("tab:change", { tab: "flights" });

    setTimeout(() => {
      onRequestAnimation?.();
    }, 300);

    onComplete?.();
  }, [onComplete, onPanelVisibilityChange, onRequestAnimation]);

  const highlightTab = useCallback((tab?: TabType, alsoHighlightButton?: boolean) => {
    // Clear previous highlights
    document.querySelectorAll(".travliaq-tab-highlight").forEach((el) => {
      el.classList.remove("travliaq-tab-highlight");
    });
    
    if (!tab) return;
    
    // If we should also highlight the tab button (for widget steps 4-7)
    if (alsoHighlightButton) {
      const tabBtn = document.querySelector(`[data-tour="${tab}-tab"]`);
      if (tabBtn) {
        tabBtn.classList.add("travliaq-tab-highlight");
      }
    }
  }, []);

  // Step labels for progress indicator - now translated
  const stepLabels = t("planner.onboarding.stepLabels").split(",");

  const renderProgressHeader = useCallback(
    (popoverEl: HTMLElement, currentIndex: number, total: number, driverInstance: ReturnType<typeof driver>) => {
      // Remove old header if exists
      const oldHeader = popoverEl.querySelector(".travliaq-progress-header");
      if (oldHeader) oldHeader.remove();

      // Create header
      const header = document.createElement("div");
      header.className = "travliaq-progress-header";

      // Left side: step counter + label
      const leftGroup = document.createElement("div");
      leftGroup.className = "travliaq-progress-bar-container";
      
      const counter = document.createElement("span");
      counter.className = "travliaq-step-counter";
      counter.textContent = `${currentIndex + 1}/${total}`;
      leftGroup.appendChild(counter);
      
      const stepLabel = document.createElement("span");
      stepLabel.className = "travliaq-step-label";
      stepLabel.textContent = stepLabels[currentIndex] || "";
      leftGroup.appendChild(stepLabel);
      
      header.appendChild(leftGroup);

      // Center: progress bar
      const progressBar = document.createElement("div");
      progressBar.className = "travliaq-progress-bar";
      const progressFill = document.createElement("div");
      progressFill.className = "travliaq-progress-bar-fill";
      progressFill.style.width = `${((currentIndex + 1) / total) * 100}%`;
      progressBar.appendChild(progressFill);
      header.appendChild(progressBar);

      // Dots
      const dots = document.createElement("div");
      dots.className = "travliaq-progress-dots";
      for (let i = 0; i < total; i++) {
        const dot = document.createElement("span");
        dot.className = `travliaq-dot${i === currentIndex ? " active" : i < currentIndex ? " completed" : ""}`;
        dots.appendChild(dot);
      }
      header.appendChild(dots);

      // Close button
      const closeBtn = document.createElement("button");
      closeBtn.className = "travliaq-close-btn";
      closeBtn.innerHTML = "×";
      closeBtn.title = t("planner.onboarding.skipGuide");
      closeBtn.onclick = () => {
        driverInstance.destroy();
      };
      header.appendChild(closeBtn);

      // Insert at the top
      popoverEl.prepend(header);
    },
    []
  );

  // Create steps dynamically with translations
  const getSteps = useCallback((): DriveStep[] => [
    // Step 0: Welcome - centered intro modal, no element highlighted
    {
      element: "#onboarding-anchor",
      popover: {
        title: t("planner.onboarding.step0.title"),
        description: `
          <p style="font-size: 1rem; margin-bottom: 16px;">${t("planner.onboarding.step0.desc")}</p>
          <div style="background: hsl(var(--muted) / 0.5); border-radius: 12px; padding: 14px; margin-bottom: 12px;">
            <p style="font-size: 0.875rem; margin: 0; color: hsl(var(--foreground));">
              <strong>${t("planner.onboarding.step0.info")}</strong>
            </p>
          </div>
          <p style="font-size: 0.75rem; color: hsl(var(--muted-foreground));">${t("planner.onboarding.step0.skip")}</p>
        `,
        side: "over",
        align: "center",
        popoverClass: "intro-modal",
      },
    },
    // Step 1: Chat
    {
      element: '[data-tour="chat-panel"]',
      popover: {
        title: t("planner.onboarding.step1.title"),
        description: `
          <span class="highlight-badge">${t("planner.onboarding.step1.badge")}</span>
          <p>${t("planner.onboarding.step1.desc")}</p>
          <ul>
            <li><strong>${t("planner.onboarding.step1.item1")}</strong></li>
            <li><strong>${t("planner.onboarding.step1.item2")}</strong></li>
            <li><strong>${t("planner.onboarding.step1.item3")}</strong></li>
          </ul>
          <div class="tip-box">💡 ${t("planner.onboarding.step1.tip")}</div>
        `,
        side: "right",
        align: "center",
      },
    },
    // Step 2: Tabs bar
    {
      element: '[data-tour="tabs-nav"]',
      popover: {
        title: t("planner.onboarding.step2.title"),
        description: `
          <span class="highlight-badge">${t("planner.onboarding.step2.badge")}</span>
          <p>${t("planner.onboarding.step2.desc")}</p>
          <ul>
            <li><strong>${t("planner.onboarding.step2.flights")}</strong></li>
            <li><strong>${t("planner.onboarding.step2.stays")}</strong></li>
            <li><strong>${t("planner.onboarding.step2.activities")}</strong></li>
            <li><strong>${t("planner.onboarding.step2.preferences")}</strong></li>
          </ul>
          <div class="tip-box">💡 ${t("planner.onboarding.step2.tip")}</div>
        `,
        side: "right",
        align: "start",
        popoverClass: "travliaq-toolbar-popover travliaq-popover-large travliaq-popover-right",
      },
    },
    // Step 3: Map
    {
      element: '[data-tour="map-area"]',
      popover: {
        title: t("planner.onboarding.step3.title"),
        description: `
          <span class="highlight-badge">${t("planner.onboarding.step3.badge")}</span>
          <p>${t("planner.onboarding.step3.desc")}</p>
          <ul>
            <li><strong>${t("planner.onboarding.step3.item1")}</strong></li>
            <li><strong>${t("planner.onboarding.step3.item2")}</strong></li>
            <li><strong>${t("planner.onboarding.step3.item3")}</strong></li>
          </ul>
        `,
        side: "left",
        align: "center",
        popoverClass: "travliaq-popover-left",
      },
    },
    // Step 4: Flights widget
    {
      element: '[data-tour="widgets-panel"]',
      popover: {
        title: t("planner.onboarding.step4.title"),
        description: `
          <span class="highlight-badge">${t("planner.onboarding.step4.badge")}</span>
          <p style="margin-bottom: 10px;">${t("planner.onboarding.step4.desc")}</p>
          <ul>
            <li><strong>${t("planner.onboarding.step4.item1")}</strong></li>
            <li><strong>${t("planner.onboarding.step4.item2")}</strong></li>
            <li><strong>${t("planner.onboarding.step4.item3")}</strong></li>
            <li><strong>${t("planner.onboarding.step4.item4")}</strong></li>
          </ul>
          <div class="tip-box">💡 ${t("planner.onboarding.step4.tip")}</div>
        `,
        side: "right",
        align: "center",
        popoverClass: "travliaq-popover-right",
      },
    },
    // Step 5: Stays widget
    {
      element: '[data-tour="widgets-panel"]',
      popover: {
        title: t("planner.onboarding.step5.title"),
        description: `
          <span class="highlight-badge">${t("planner.onboarding.step5.badge")}</span>
          <p style="margin-bottom: 10px;">${t("planner.onboarding.step5.desc")}</p>
          <ul>
            <li><strong>${t("planner.onboarding.step5.item1")}</strong></li>
            <li><strong>${t("planner.onboarding.step5.item2")}</strong></li>
            <li><strong>${t("planner.onboarding.step5.item3")}</strong></li>
            <li><strong>${t("planner.onboarding.step5.item4")}</strong></li>
          </ul>
          <div class="tip-box">💡 ${t("planner.onboarding.step5.tip")}</div>
        `,
        side: "right",
        align: "center",
        popoverClass: "travliaq-popover-right",
      },
    },
    // Step 6: Activities widget
    {
      element: '[data-tour="widgets-panel"]',
      popover: {
        title: t("planner.onboarding.step6.title"),
        description: `
          <span class="highlight-badge">${t("planner.onboarding.step6.badge")}</span>
          <p style="margin-bottom: 10px;">${t("planner.onboarding.step6.desc")}</p>
          <ul>
            <li><strong>${t("planner.onboarding.step6.item1")}</strong></li>
            <li><strong>${t("planner.onboarding.step6.item2")}</strong></li>
            <li><strong>${t("planner.onboarding.step6.item3")}</strong></li>
            <li><strong>${t("planner.onboarding.step6.item4")}</strong></li>
          </ul>
          <div class="tip-box">💡 ${t("planner.onboarding.step6.tip")}</div>
        `,
        side: "right",
        align: "center",
        popoverClass: "travliaq-popover-right",
      },
    },
    // Step 7: Preferences widget
    {
      element: '[data-tour="widgets-panel"]',
      popover: {
        title: t("planner.onboarding.step7.title"),
        description: `
          <span class="highlight-badge">${t("planner.onboarding.step7.badge")}</span>
          <p style="margin-bottom: 10px;">${t("planner.onboarding.step7.desc")}</p>
          <ul>
            <li><strong>${t("planner.onboarding.step7.item1")}</strong></li>
            <li><strong>${t("planner.onboarding.step7.item2")}</strong></li>
            <li><strong>${t("planner.onboarding.step7.item3")}</strong></li>
            <li><strong>${t("planner.onboarding.step7.item4")}</strong></li>
          </ul>
          <div class="tip-box">💡 ${t("planner.onboarding.step7.tip")}</div>
        `,
        side: "right",
        align: "center",
        popoverClass: "travliaq-popover-right",
      },
    },
    // Step 8: Final
    {
      element: "#onboarding-anchor",
      popover: {
        title: t("planner.onboarding.step8.title"),
        description: `
          <p style="font-size: 1rem; font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 16px;">
            ${t("planner.onboarding.step8.desc")}
          </p>
          <div class="tip-box" style="background: hsl(var(--primary) / 0.15); margin-bottom: 14px;">
            🎯 <span><strong>${t("planner.onboarding.step8.tip")}</strong></span>
          </div>
          <div style="background: hsl(var(--muted) / 0.4); border-radius: 10px; padding: 12px;">
            <p style="font-size: 0.8125rem; margin: 0; color: hsl(var(--muted-foreground));">
              ✨ ${t("planner.onboarding.step8.info")}
            </p>
          </div>
        `,
        side: "over",
        align: "center",
        popoverClass: "outro-modal",
      },
    },
  ], [t]);

  // Initialize driver - always run when component mounts (component is only rendered when onboarding should show)
  useEffect(() => {
    // Component is only rendered when shouldShowOnboarding is true in TravelPlanner
    // So we can safely start the tour immediately
    const timer = setTimeout(() => {
      try {
        // CRITICAL: Verify that the anchor element exists before starting
        const anchorElement = document.getElementById("onboarding-anchor");
        if (!anchorElement) {
          // eslint-disable-next-line no-console
          console.error("[OnboardingTour] #onboarding-anchor not found! Cannot start tour.");
          return;
        }
        // eslint-disable-next-line no-console
        console.log("[OnboardingTour] #onboarding-anchor found, starting tour...");

        // Defensive: if a previous instance is still around, kill it first
        driverRef.current?.destroy();
        driverRef.current = null;

        injectDriverStyles();
        setIsRunning(true);

        // Configure first step before starting
        configureStep(0);

        const driverConfig: Config = {
          showButtons: ["next", "previous", "close"],
          showProgress: false,
          allowClose: true,
          overlayOpacity: 0.75,
          stagePadding: 12,
          stageRadius: 16,
          animate: true,
          smoothScroll: false,
          disableActiveInteraction: false,
          popoverClass: "travliaq-popover",
          nextBtnText: t("planner.onboarding.next"),
          prevBtnText: t("planner.onboarding.prev"),
          doneBtnText: t("planner.onboarding.done"),
          onPopoverRender: (popover, opts) => {
            const idx = opts.state.activeIndex ?? 0;
            const total = opts.config.steps?.length ?? 9;
            renderProgressHeader(popover.wrapper, idx, total, opts.driver);

            // CRITICAL FIX: For steps 0 and 8 (intro/outro), manually position the popover
            // Driver.js has a bug where it removes the popover from the DOM when using #onboarding-anchor
            if (idx === 0 || idx === 8) {
              // Ensure popover is in the body
              if (!document.body.contains(popover.wrapper)) {
                document.body.appendChild(popover.wrapper);
              }

              // Force immediate visibility and positioning with !important
              popover.wrapper.style.cssText += `
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 10005 !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
                flex-direction: column !important;
              `;

              // Driver.js removes the popover after initial render, so we re-append it
              setTimeout(() => {
                if (!document.body.contains(popover.wrapper)) {
                  document.body.appendChild(popover.wrapper);
                }

                // Re-apply positioning to ensure it sticks
                popover.wrapper.style.cssText += `
                  position: fixed !important;
                  top: 50% !important;
                  left: 50% !important;
                  transform: translate(-50%, -50%) !important;
                  z-index: 10005 !important;
                  display: flex !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  pointer-events: auto !important;
                  flex-direction: column !important;
                `;
              }, 50);
            }

            // Add an explicit "Arrêter" button inside the tooltip (in the footer)
            const footer = popover.wrapper.querySelector(".driver-popover-footer");
            if (footer && !footer.querySelector(".travliaq-skip-btn")) {
              const skipBtn = document.createElement("button");
              skipBtn.className = "travliaq-skip-btn";
              skipBtn.type = "button";
              skipBtn.textContent = t("planner.onboarding.skipGuide");
              skipBtn.onclick = () => {
                opts.driver.destroy();
              };
              footer.prepend(skipBtn);
            }
          },
          onHighlightStarted: (_el, _step, opts) => {
            const idx = opts.state.activeIndex ?? 0;
            const tab = STEP_CONFIG[idx]?.tab;
            // Steps 4-7 (Vols, Hébergements, Activités, Préférences widgets): also highlight the tab button
            const shouldHighlightButton = idx >= 4 && idx <= 7;
            highlightTab(tab, shouldHighlightButton);
          },
          onNextClick: (_el, _step, opts) => {
            const idx = opts.state.activeIndex ?? 0;

            // Last step: "Let's go!" should end the tour
            if (idx >= 8) {
              opts.driver.destroy();
              return;
            }

            const nextIndex = idx + 1;
            configureStep(nextIndex);

            // Small delay to let UI update before driver moves
            setTimeout(() => {
              opts.driver.moveNext();
            }, 150);
          },
          onPrevClick: (_el, _step, opts) => {
            const idx = opts.state.activeIndex ?? 0;
            const prevIndex = Math.max(0, idx - 1);
            configureStep(prevIndex);
            setTimeout(() => {
              opts.driver.movePrevious();
            }, 150);
          },
          onCloseClick: (_el, _step, opts) => {
            opts.driver.destroy();
          },
          steps: getSteps(),
          onDestroyed: () => {
            handleComplete();
          },
        };

        driverRef.current = driver(driverConfig);

        // Start after a short delay to ensure elements are ready
        setTimeout(() => {
          try {
            // eslint-disable-next-line no-console
            console.log("[OnboardingTour] drive() start");
            driverRef.current?.drive();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("[OnboardingTour] driver.drive() failed", e);
            handleComplete();
          }
        }, 200);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[OnboardingTour] init failed", e);
        handleComplete();
      }
    }, forceShow ? 0 : 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
      // Clean up any remaining highlights
      document.querySelectorAll(".travliaq-tab-highlight").forEach((el) => {
        el.classList.remove("travliaq-tab-highlight");
      });
    };
  }, []);

  return null;
}

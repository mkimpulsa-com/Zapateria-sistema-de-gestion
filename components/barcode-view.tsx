"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { cleanBarcodeScan, isValidEan13, normalizeToValidEan13 } from "@/lib/barcode";

export interface BarcodeViewProps {
  value: string | number;
  className?: string;
  height?: number;
  width?: number;
  margin?: number;
  displayValue?: boolean;
  lineColor?: string;
  background?: string;
  format?: "AUTO" | "EAN13" | "CODE128";
}

export function BarcodeView({
  value,
  className = "",
  height = 36,
  width = 1.8,
  margin = 10,
  displayValue = false,
  lineColor = "#000000",
  background = "#ffffff",
  format = "AUTO",
}: BarcodeViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const raw = cleanBarcodeScan(value) || "000000";
    const digitsOnly = raw.replace(/\D/g, "");

    let chosenFormat: "EAN13" | "CODE128" = "CODE128";
    let valueToRender = raw;

    if (format === "EAN13") {
      chosenFormat = "EAN13";
      valueToRender = isValidEan13(raw) ? raw : normalizeToValidEan13(raw);
    } else if (format === "CODE128") {
      chosenFormat = "CODE128";
      valueToRender = raw.replace(/[^\x20-\x7E]/g, "") || "000000";
    } else {
      // AUTO detection: usar EAN13 exclusivamente si es un EAN-13 oficial válido GS1 (13 dígitos)
      if (/^\d{13}$/.test(raw) && isValidEan13(raw)) {
        chosenFormat = "EAN13";
        valueToRender = raw;
      } else {
        // En cualquier otro caso (12 dígitos UPC, alfanumérico, código interno), CODE128 no muta ningún dígito
        chosenFormat = "CODE128";
        valueToRender = raw.replace(/[^\x20-\x7E]/g, "") || "000000";
      }
    }

    const renderWith = (fmt: "EAN13" | "CODE128", val: string) => {
      if (!svgRef.current) return;
      JsBarcode(svgRef.current, val, {
        format: fmt,
        width,
        height,
        displayValue,
        margin,
        background,
        lineColor,
        fontSize: 12,
        font: "monospace",
        textMargin: 3,
      });
      svgRef.current.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svgRef.current.setAttribute("shape-rendering", "crispEdges");
      svgRef.current.style.shapeRendering = "crispEdges";
    };

    try {
      renderWith(chosenFormat, valueToRender);
    } catch {
      // Fallback a CODE128 si EAN13 es rechazado
      try {
        const safe128 = raw.replace(/[^\x20-\x7E]/g, "") || "000000";
        renderWith("CODE128", safe128);
      } catch (fallbackErr) {
        console.error("Barcode rendering fallback error:", fallbackErr);
      }
    }
  }, [value, height, width, margin, displayValue, lineColor, background, format]);

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ shapeRendering: "crispEdges" }}
    />
  );
}

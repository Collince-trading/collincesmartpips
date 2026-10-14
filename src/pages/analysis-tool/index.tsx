"use client";

import React from "react";

/**
 * SmartPips Analysis Tool
 * The upgraded standalone Deriv Market Analyzer is hosted in public/deriv-analyzer.html.
 * Keeping it in an iframe lets us replace the old analyzer in this route without
 * deleting the original source file or duplicating the analyzer's live-data logic.
 */
export default function AnalysisToolPage() {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        minHeight: "calc(100vh - 120px)",
        background: "#0d1420",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <iframe
        src="/deriv-analyzer.html"
        title="SmartPips Deriv Market Analyzer"
        loading="eager"
        style={{
          display: "block",
          width: "100%",
          height: "calc(100vh - 120px)",
          minHeight: 760,
          border: 0,
          background: "#0d1420",
        }}
      />
    </div>
  );
}

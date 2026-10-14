"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tick = {
  quote: number;
  epoch: number;
  digit: number;
};

type AnalysisMode = "distribution" | "evenodd" | "overunder" | "matches";

const MARKETS = [
  { label: "Volatility 10 Index", symbol: "R_10" },
  { label: "Volatility 25 Index", symbol: "R_25" },
  { label: "Volatility 50 Index", symbol: "R_50" },
  { label: "Volatility 75 Index", symbol: "R_75" },
  { label: "Volatility 100 Index", symbol: "R_100" },
  { label: "Volatility 10 (1s)", symbol: "1HZ10V" },
  { label: "Volatility 25 (1s)", symbol: "1HZ25V" },
  { label: "Volatility 50 (1s)", symbol: "1HZ50V" },
  { label: "Volatility 75 (1s)", symbol: "1HZ75V" },
  { label: "Volatility 100 (1s)", symbol: "1HZ100V" },
];

const SAMPLE_SIZES = [100, 500, 950, 1000];

const COLORS = {
  background: "#080d18",
  panel: "#111827",
  border: "#263449",
  text: "#f1f5f9",
  muted: "#94a3b8",
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f97316",
  red: "#ef4444",
  black: "#64748b",
};

function getLastDigit(
  quote: number,
  decimalPlaces: number
): number {
  const formatted = Number(quote).toFixed(decimalPlaces);
  const digits = formatted.replace(".", "").replace("-", "");

  return Number(digits[digits.length - 1] ?? 0);
}

function formatQuote(
  quote: number,
  decimalPlaces: number
): string {
  return Number(quote).toFixed(decimalPlaces);
}

function percentage(count: number, total: number): string {
  if (total === 0) return "0.00%";

  return `${((count / total) * 100).toFixed(2)}%`;
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 18,
        minWidth: 0,
      }}
    >
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 17,
          fontWeight: 700,
          color: COLORS.text,
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

function StatCard({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: COLORS.background,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: 14,
        minWidth: 0,
      }}
    >
      <div style={{ color: COLORS.muted, fontSize: 13 }}>
        {label}
      </div>

      <div
        style={{
          color,
          fontSize: 25,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        {count}
      </div>

      <div
        style={{
          color: COLORS.text,
          fontSize: 14,
          marginTop: 4,
        }}
      >
        {percentage(count, total)}
      </div>
    </div>
  );
}

export default function AnalysisToolPage() {
  const [market, setMarket] = useState("R_10");
  const [sampleSize, setSampleSize] = useState(100);

  const [barrier, setBarrier] = useState(5);
  const [selectedDigit, setSelectedDigit] = useState(5);

  const [mode, setMode] = useState<AnalysisMode>("distribution");

  const [ticks, setTicks] = useState<Tick[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const decimalPlacesRef = useRef(decimalPlaces);
  const [lastQuote, setLastQuote] = useState<number | null>(null);
  const [lastTickTime, setLastTickTime] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const requestCounterRef = useRef(1);

  const requestId = useCallback(() => {
    return requestCounterRef.current++;
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }

    return false;
  }, []);

  const connect = useCallback(() => {
    const oldSocket = socketRef.current;

    if (
      oldSocket &&
      oldSocket.readyState !== WebSocket.CLOSED
    ) {
      oldSocket.close();
    }

    setConnected(false);
    setLoading(true);
    setError("");
    setTicks([]);
    setLastQuote(null);
    setLastTickTime(null);

    const socket = new WebSocket(
      "wss://api.derivws.com/trading/v1/options/ws/public"
    );

    socketRef.current = socket;

    // Some networks block one Deriv host. If the primary endpoint fails,
    // retry the compatible legacy host once and expose the real close reason.
    let fallbackAttempted = false;
    let connectionTimer: ReturnType<typeof setTimeout> | undefined;
    const clearConnectionTimer = () => {
      if (connectionTimer) clearTimeout(connectionTimer);
      connectionTimer = undefined;
    };
    const openFallback = () => {
      if (fallbackAttempted || socketRef.current !== socket) return false;
      fallbackAttempted = true;
      clearConnectionTimer();
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try { socket.close(); } catch { /* already closed */ }
      const fallback = new WebSocket(
        "wss://api.derivws.com/trading/v1/options/ws/public"
      );
      socketRef.current = fallback;
      attachSocketHandlers(fallback, true);
      return true;
    };
    const attachSocketHandlers = (activeSocket: WebSocket, isFallback = false) => {
      activeSocket.onopen = () => {
        if (socketRef.current !== activeSocket) return;
        clearConnectionTimer();
        setConnected(true);
        setError("");
        activeSocket.send(JSON.stringify({
          ticks_history: market,
          count: sampleSize,
          end: "latest",
          style: "ticks",
          req_id: requestId(),
        }));
      };
      activeSocket.onmessage = (event) => {
        if (socketRef.current !== activeSocket) return;
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setError(`Deriv API error (${data.error.code || "unknown"}): ${data.error.message || "Request rejected."}`);
            setLoading(false);
            return;
          }
          if (data.history?.prices && data.history?.times) {
            const prices: number[] = data.history.prices;
            const times: number[] = data.history.times;
            if (data.pip_size) {
              const size = Number(data.pip_size);
              if (Number.isFinite(size) && size > 0) {
                const detectedDecimals = Math.max(0, Math.min(10, Math.round(-Math.log10(size))));
                decimalPlacesRef.current = detectedDecimals;
                setDecimalPlaces(detectedDecimals);
              }
            }
            const decimals = data.pip_size
              ? Math.max(0, Math.min(10, Math.round(-Math.log10(Number(data.pip_size)))) )
              : decimalPlacesRef.current;
            const historicalTicks: Tick[] = prices.map((price, index) => ({
              quote: Number(price), epoch: Number(times[index]), digit: getLastDigit(Number(price), decimals),
            }));
            setTicks(historicalTicks.slice(-sampleSize));
            setLoading(false);
            if (historicalTicks.length > 0) {
              const last = historicalTicks[historicalTicks.length - 1];
              setLastQuote(last.quote);
              setLastTickTime(last.epoch);
            }
            activeSocket.send(JSON.stringify({ ticks: market, subscribe: 1, req_id: requestId() }));
            return;
          }
          if (data.tick) {
            const quote = Number(data.tick.quote);
            const epoch = Number(data.tick.epoch);
            if (!Number.isFinite(quote) || !Number.isFinite(epoch)) return;
            const tick: Tick = { quote, epoch, digit: getLastDigit(quote, decimalPlacesRef.current) };
            setLastQuote(quote);
            setLastTickTime(epoch);
            setTicks((previous) => [...previous, tick].slice(-sampleSize));
            setLoading(false);
          }
        } catch {
          setError("Unable to process the market data response.");
          setLoading(false);
        }
      };
      activeSocket.onerror = () => {
        if (socketRef.current !== activeSocket) return;
        if (!isFallback && openFallback()) return;
        setConnected(false);
        setError("Deriv WebSocket connection failed on both endpoints. Check whether your network, browser, or firewall blocks WebSockets.");
        setLoading(false);
        clearConnectionTimer();
      };
      activeSocket.onclose = (event) => {
        if (socketRef.current !== activeSocket) return;
        setConnected(false);
        setLoading(false);
        clearConnectionTimer();
        if (!connected && !error && event.code !== 1000 && isFallback) {
          setError(`Deriv connection closed (code ${event.code}${event.reason ? `: ${event.reason}` : ""}).`);
        }
      };
      connectionTimer = setTimeout(() => {
        if (socketRef.current !== activeSocket || activeSocket.readyState === WebSocket.OPEN) return;
        if (!isFallback && openFallback()) return;
        setError("Deriv connection timed out after 12 seconds on both endpoints. Check your network/firewall or verify that WebSockets are allowed.");
        setLoading(false);
        setConnected(false);
      }, 12000);
    };
    attachSocketHandlers(socket);

  }, [
    market,
    sampleSize,
    requestId,
  ]);

  useEffect(() => {
    connect();

    return () => {
      const socket = socketRef.current;
      socketRef.current = null;

      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (socket.readyState !== WebSocket.CLOSED) {
          socket.close();
        }
      }
    };
  }, [connect]);

  const analyzedTicks = useMemo(() => {
    return ticks.slice(-sampleSize);
  }, [ticks, sampleSize]);

  const digitCounts = useMemo(() => {
    const counts = Array(10).fill(0) as number[];

    analyzedTicks.forEach((tick) => {
      counts[tick.digit]++;
    });

    return counts;
  }, [analyzedTicks]);

  const digitRanks = useMemo(() => {
    return Array.from({ length: 10 }, (_, digit) => ({
      digit,
      count: digitCounts[digit],
    })).sort((a, b) => {
      // Deterministic tie-break: lower digit comes first.
      return b.count - a.count || a.digit - b.digit;
    });
  }, [digitCounts]);

  const digitColors = useMemo(() => {
    const result: Record<number, string> = {};

    // Ranking is based on frequency, not the digit's value.
    if (digitRanks.length > 0) {
      result[digitRanks[0].digit] = COLORS.green;
      result[digitRanks[1].digit] = COLORS.blue;
      result[digitRanks[8].digit] = COLORS.orange;
      result[digitRanks[9].digit] = COLORS.red;
    }

    return result;
  }, [digitRanks]);

  const evenCount = useMemo(() => {
    return analyzedTicks.filter(
      (tick) => tick.digit % 2 === 0
    ).length;
  }, [analyzedTicks]);

  const oddCount = analyzedTicks.length - evenCount;

  const underCount = useMemo(() => {
    return analyzedTicks.filter(
      (tick) => tick.digit < barrier
    ).length;
  }, [analyzedTicks, barrier]);

  const equalCount = useMemo(() => {
    return analyzedTicks.filter(
      (tick) => tick.digit === barrier
    ).length;
  }, [analyzedTicks, barrier]);

  const overCount = useMemo(() => {
    return analyzedTicks.filter(
      (tick) => tick.digit > barrier
    ).length;
  }, [analyzedTicks, barrier]);

  const matchCount = useMemo(() => {
    return analyzedTicks.filter(
      (tick) => tick.digit === selectedDigit
    ).length;
  }, [analyzedTicks, selectedDigit]);

  const differCount = analyzedTicks.length - matchCount;

  const recentTicks = useMemo(() => {
    return [...analyzedTicks].slice(-30).reverse();
  }, [analyzedTicks]);

  const recentSequence = useMemo(() => {
    return [...analyzedTicks].slice(-30);
  }, [analyzedTicks]);

  const controlStyle: React.CSSProperties = {
    background: COLORS.background,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 7,
  };

  const buttonStyle = (
    active: boolean
  ): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${
      active ? COLORS.green : COLORS.border
    }`,
    background: active ? "#123322" : COLORS.background,
    color: active ? COLORS.green : COLORS.text,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: COLORS.background,
        color: COLORS.text,
        padding: "24px 16px 48px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1250,
          margin: "0 auto",
        }}
      >
        {/* Page heading */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.green,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              SMARTPIPS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: -1,
              }}
            >
              Digit Analysis Tool
            </h1>

            <p
              style={{
                color: COLORS.muted,
                margin: "8px 0 0",
                fontSize: 14,
              }}
            >
              Live market ticks, digit distribution and
              statistical analysis.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: COLORS.panel,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                display: "inline-block",
                background: connected
                  ? COLORS.green
                  : COLORS.red,
              }}
            />

            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </header>

        {/* Market controls */}
        <Panel title="Market Settings">
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Select Market</label>

              <select
                value={market}
                onChange={(event) => setMarket(event.target.value)}
                style={controlStyle}
              >
                {MARKETS.map((item) => (
                  <option
                    key={item.symbol}
                    value={item.symbol}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Historical Sample Size
              </label>

              <select
                value={sampleSize}
                onChange={(event) =>
                  setSampleSize(Number(event.target.value))
                }
                style={controlStyle}
              >
                {SAMPLE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} ticks
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Barrier Digit</label>

              <select
                value={barrier}
                onChange={(event) =>
                  setBarrier(Number(event.target.value))
                }
                style={controlStyle}
              >
                {Array.from({ length: 10 }, (_, digit) => (
                  <option key={digit} value={digit}>
                    {digit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Digit for Matches / Differs
              </label>

              <select
                value={selectedDigit}
                onChange={(event) =>
                  setSelectedDigit(Number(event.target.value))
                }
                style={controlStyle}
              >
                {Array.from({ length: 10 }, (_, digit) => (
                  <option key={digit} value={digit}>
                    Digit {digit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <button
              onClick={connect}
              disabled={loading}
              style={{
                background: COLORS.green,
                color: "#052e16",
                border: "none",
                borderRadius: 8,
                padding: "11px 18px",
                fontWeight: 800,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Loading Data..." : "Refresh Analysis"}
            </button>

            <span
              style={{
                color: COLORS.muted,
                fontSize: 13,
              }}
            >
              {loading
                ? "Retrieving historical tick data..."
                : `${analyzedTicks.length} of ${sampleSize} ticks loaded`}
            </span>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                background: "#3b151b",
                color: "#fecaca",
                fontSize: 13,
                overflowWrap: "anywhere",
              }}
            >
              {error}
            </div>
          )}
        </Panel>

        {/* Live quote */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <Panel title="Current Market">
            <div
              style={{
                color: COLORS.green,
                fontSize: 25,
                fontWeight: 800,
              }}
            >
              {MARKETS.find(
                (item) => item.symbol === market
              )?.label ?? market}
            </div>

            <div
              style={{
                color: COLORS.muted,
                fontSize: 13,
                marginTop: 8,
              }}
            >
              Symbol: {market}
            </div>
          </Panel>

          <Panel title="Latest Tick Quote">
            <div
              style={{
                color: COLORS.text,
                fontSize: 30,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {lastQuote === null
                ? "--"
                : formatQuote(lastQuote, decimalPlaces)}
            </div>

            <div
              style={{
                color: COLORS.muted,
                fontSize: 13,
                marginTop: 8,
              }}
            >
              {lastTickTime === null
                ? "Waiting for market data"
                : `Last tick: ${new Date(
                    lastTickTime * 1000
                  ).toLocaleTimeString()}`}
            </div>
          </Panel>

          <Panel title="Latest Last Digit">
            <div
              style={{
                fontSize: 42,
                lineHeight: 1.1,
                fontWeight: 900,
                color:
                  lastQuote === null
                    ? COLORS.muted
                    : digitColors[
                        getLastDigit(lastQuote, decimalPlaces)
                      ] ?? COLORS.text,
              }}
            >
              {lastQuote === null
                ? "--"
                : getLastDigit(lastQuote, decimalPlaces)}
            </div>

            <div
              style={{
                color: COLORS.muted,
                fontSize: 13,
                marginTop: 8,
              }}
            >
              Calculated from the displayed quote precision
            </div>
          </Panel>
        </div>

        {/* Analysis tabs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            margin: "24px 0 18px",
          }}
        >
          {(
            [
              ["distribution", "Digit Distribution"],
              ["evenodd", "Even / Odd"],
              ["overunder", "Over / Under"],
              ["matches", "Matches / Differs"],
            ] as [AnalysisMode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              style={buttonStyle(mode === value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Digit distribution */}
        {mode === "distribution" && (
          <Panel title="Digit Distribution (0–9)">
            <p
              style={{
                color: COLORS.muted,
                fontSize: 13,
                margin: "0 0 18px",
                lineHeight: 1.6,
              }}
            >
              Percentages are calculated from the selected
              sample of recent ticks. The figures update as
              new ticks arrive.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(145px, 1fr))",
                gap: 12,
              }}
            >
              {digitCounts.map((count, digit) => {
                const color =
                  digitColors[digit] ?? COLORS.text;

                const pct =
                  analyzedTicks.length > 0
                    ? (count / analyzedTicks.length) * 100
                    : 0;

                return (
                  <div
                    key={digit}
                    style={{
                      background: COLORS.background,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 30,
                          fontWeight: 900,
                          color,
                        }}
                      >
                        {digit}
                      </span>

                      <span
                        style={{
                          color,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {percentage(
                          count,
                          analyzedTicks.length
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        height: 6,
                        background: COLORS.border,
                        borderRadius: 10,
                        overflow: "hidden",
                        margin: "12px 0",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: color,
                          transition: "width 250ms ease",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        color: COLORS.muted,
                        fontSize: 12,
                      }}
                    >
                      {count} appearances
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 20,
              }}
            >
              {[
                [COLORS.green, "Most frequent"],
                [COLORS.blue, "Second most frequent"],
                [COLORS.orange, "Second least frequent"],
                [COLORS.red, "Least frequent"],
              ].map(([color, label]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12,
                    color: COLORS.muted,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: color,
                    }}
                  />

                  {label}
                </div>
              ))}
            </div>

            <div
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 14,
                lineHeight: 1.6,
              }}
            >
              If multiple digits have equal frequencies, the
              ranking uses a consistent tie-break rule based on
              digit value. This means tied digits can receive
              different ranking colors.
            </div>

            <h3
              style={{
                color: COLORS.text,
                fontSize: 15,
                margin: "26px 0 12px",
              }}
            >
              Digits Ranked by Frequency
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 320,
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ color: COLORS.muted }}>
                    {["Rank", "Digit", "Count", "Percentage"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: 12,
                            borderBottom: `1px solid ${COLORS.border}`,
                            fontSize: 12,
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {digitRanks.map((item, index) => (
                    <tr key={item.digit}>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {index + 1}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          color:
                            digitColors[item.digit] ??
                            COLORS.text,
                          fontWeight: 900,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {item.digit}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {item.count}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {percentage(
                          item.count,
                          analyzedTicks.length
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Even and odd */}
        {mode === "evenodd" && (
          <Panel title="Even vs Odd Analysis">
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <StatCard
                label="Even Digits"
                count={evenCount}
                total={analyzedTicks.length}
                color={COLORS.green}
              />

              <StatCard
                label="Odd Digits"
                count={oddCount}
                total={analyzedTicks.length}
                color={COLORS.red}
              />
            </div>

            <h3
              style={{
                fontSize: 15,
                margin: "24px 0 12px",
              }}
            >
              Recent Even / Odd Sequence
            </h3>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {recentSequence.map((tick, index) => {
                const even = tick.digit % 2 === 0;

                return (
                  <div
                    key={`${tick.epoch}-${index}`}
                    title={`Digit ${tick.digit} — ${
                      even ? "Even" : "Odd"
                    }`}
                    style={{
                      minWidth: 42,
                      padding: "10px 6px",
                      textAlign: "center",
                      borderRadius: 8,
                      background: even ? "#123322" : "#3b151b",
                      color: even ? COLORS.green : COLORS.red,
                      fontWeight: 900,
                    }}
                  >
                    {even ? "E" : "O"}

                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        opacity: 0.8,
                      }}
                    >
                      {tick.digit}
                    </div>
                  </div>
                );
              })}
            </div>

            <p
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 14,
              }}
            >
              E = even, O = odd. The newest result appears on
              the right.
            </p>
          </Panel>
        )}

        {/* Over, equal, under */}
        {mode === "overunder" && (
          <Panel title="Over / Equal / Under Analysis">
            <p
              style={{
                color: COLORS.muted,
                fontSize: 13,
                lineHeight: 1.6,
                margin: "0 0 18px",
              }}
            >
              Selected barrier:{" "}
              <strong style={{ color: COLORS.text }}>
                {barrier}
              </strong>
              . Under means a digit less than the barrier,
              equal means the same digit, and over means a
              digit greater than the barrier.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <StatCard
                label={`Under ${barrier}`}
                count={underCount}
                total={analyzedTicks.length}
                color={COLORS.green}
              />

              <StatCard
                label={`Equal ${barrier}`}
                count={equalCount}
                total={analyzedTicks.length}
                color={COLORS.black}
              />

              <StatCard
                label={`Over ${barrier}`}
                count={overCount}
                total={analyzedTicks.length}
                color={COLORS.red}
              />
            </div>

            <h3
              style={{
                fontSize: 15,
                margin: "24px 0 12px",
              }}
            >
              Recent Results
            </h3>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {recentTicks.map((tick, index) => {
                const digit = tick.digit;

                const label =
                  digit < barrier
                    ? "U"
                    : digit === barrier
                      ? "="
                      : "O";

                const color =
                  digit < barrier
                    ? COLORS.green
                    : digit === barrier
                      ? COLORS.black
                      : COLORS.red;

                return (
                  <div
                    key={`${tick.epoch}-${index}`}
                    title={`Digit ${digit}: ${
                      digit < barrier
                        ? "Under"
                        : digit === barrier
                          ? "Equal"
                          : "Over"
                    }`}
                    style={{
                      minWidth: 42,
                      padding: "10px 6px",
                      textAlign: "center",
                      borderRadius: 8,
                      background:
                        digit < barrier
                          ? "#123322"
                          : digit === barrier
                            ? "#263449"
                            : "#3b151b",
                      color:
                        digit === barrier
                          ? COLORS.text
                          : color,
                      fontWeight: 900,
                    }}
                  >
                    {label}

                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        opacity: 0.8,
                      }}
                    >
                      {digit}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Matches and differs */}
        {mode === "matches" && (
          <Panel title="Matches vs Differs Analysis">
            <p
              style={{
                color: COLORS.muted,
                fontSize: 13,
                lineHeight: 1.6,
                margin: "0 0 18px",
              }}
            >
              Selected digit:{" "}
              <strong style={{ color: COLORS.text }}>
                {selectedDigit}
              </strong>
              . Matches counts ticks whose last digit equals
              the selected digit. Differs counts all other
              digits.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <StatCard
                label={`Matches ${selectedDigit}`}
                count={matchCount}
                total={analyzedTicks.length}
                color={COLORS.green}
              />

              <StatCard
                label={`Differs from ${selectedDigit}`}
                count={differCount}
                total={analyzedTicks.length}
                color={COLORS.red}
              />
            </div>

            <h3
              style={{
                fontSize: 15,
                margin: "24px 0 12px",
              }}
            >
              Recent Matches / Differs Sequence
            </h3>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {recentSequence.map((tick, index) => {
                const matches =
                  tick.digit === selectedDigit;

                return (
                  <div
                    key={`${tick.epoch}-${index}`}
                    title={`Digit ${tick.digit}: ${
                      matches ? "Match" : "Differ"
                    }`}
                    style={{
                      minWidth: 42,
                      padding: "10px 6px",
                      textAlign: "center",
                      borderRadius: 8,
                      background: matches
                        ? "#123322"
                        : "#3b151b",
                      color: matches
                        ? COLORS.green
                        : COLORS.red,
                      fontWeight: 900,
                    }}
                  >
                    {matches ? "M" : "D"}

                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        opacity: 0.8,
                      }}
                    >
                      {tick.digit}
                    </div>
                  </div>
                );
              })}
            </div>

            <p
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 14,
              }}
            >
              M = match, D = differ. The newest result appears
              on the right.
            </p>
          </Panel>
        )}

        {/* Shared recent tick history */}
        <div style={{ marginTop: 20 }}>
          <Panel title="Recent Tick History">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 420,
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ color: COLORS.muted }}>
                    {["Time", "Quote", "Last Digit", "Parity"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: 12,
                            borderBottom: `1px solid ${COLORS.border}`,
                            fontSize: 12,
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {[...analyzedTicks]
                    .slice(-20)
                    .reverse()
                    .map((tick, index) => (
                      <tr key={`${tick.epoch}-${index}`}>
                        <td
                          style={{
                            padding: 12,
                            borderBottom: `1px solid ${COLORS.border}`,
                            color: COLORS.muted,
                            fontSize: 13,
                          }}
                        >
                          {new Date(
                            tick.epoch * 1000
                          ).toLocaleTimeString()}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: `1px solid ${COLORS.border}`,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatQuote(
                            tick.quote,
                            decimalPlaces
                          )}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: `1px solid ${COLORS.border}`,
                            fontWeight: 900,
                            color:
                              digitColors[tick.digit] ??
                              COLORS.text,
                          }}
                        >
                          {tick.digit}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: `1px solid ${COLORS.border}`,
                            color:
                              tick.digit % 2 === 0
                                ? COLORS.green
                                : COLORS.red,
                          }}
                        >
                          {tick.digit % 2 === 0
                            ? "Even"
                            : "Odd"}
                        </td>
                      </tr>
                    ))}

                  {analyzedTicks.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: 24,
                          color: COLORS.muted,
                          textAlign: "center",
                        }}
                      >
                        {loading
                          ? "Loading tick history..."
                          : "Waiting for market data..."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Disclaimer */}
        <footer
          style={{
            marginTop: 22,
            color: COLORS.muted,
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <p>
            <strong style={{ color: COLORS.text }}>
              Important:
            </strong>{" "}
            This page provides statistical analysis of recent
            tick data. Frequency percentages describe the
            selected historical sample and do not guarantee
            future outcomes. This page does not place trades.
          </p>
        </footer>
      </div>
    </main>
  );
}

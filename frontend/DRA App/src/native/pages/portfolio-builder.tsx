import { Check, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { C, font, glossary, glossaryTerms, sectorOptions } from "../constants";
import { getPortfolioDraft, savePortfolioDraft } from "../portfolio-store";
import { analytics, market, portfolio } from "../api";
import type { BackendTrade, StockSearchResult } from "../api";
import type { Position, PortfolioSetup, UserData } from "../types";
import { wordCount } from "../utils";
import { AppButton, Field, GlassCard, Pill, SectionTitle } from "../components/ui";

const tagOptions = ["Earnings Play", "Macro Tailwind", "Valuation Gap", "Momentum", "Risk Hedge", "(optional)"];
const tableColumns = [
  { key: "ticker", label: "Ticker", width: 92 },
  { key: "name", label: "Stock", width: 190 },
  { key: "sector", label: "Sector", width: 150 },
  { key: "type", label: "Type", width: 78 },
  { key: "allocation", label: "Alloc.", width: 84 },
  { key: "amount", label: "Amount", width: 112 },
  { key: "buy", label: "Buy", width: 92 },
  { key: "price", label: "Current", width: 96 },
  { key: "thesis", label: "Thesis", width: 180 },
  { key: "action", label: "", width: 64 },
] as const;

function today() {
  return new Date().toLocaleDateString("en-GB");
}

function makeTrade(studentId: string, index: number, capital: number): Position {
  return {
    id: `${Date.now()}-${index}`,
    tradeId: `TRD${String(index + 1).padStart(6, "0")}`,
    studentId,
    addedBy: studentId,
    tradeDate: today(),
    stockTicker: "",
    stockName: "",
    sector: "Technology",
    allocationPercent: 10,
    amountInvested: `$${Math.round(capital * 0.1).toLocaleString()}`,
    buyPrice: "",
    currentSellPrice: "",
    tradeType: "Buy",
    tag1: "Earnings Play",
    tag2: "Macro Tailwind",
    tag3: "(optional)",
    thesis: "",
  };
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function displayDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB");
}

function tradeToPosition(trade: BackendTrade, index: number, studentId: string): Position {
  return {
    id: `server-${trade.trade_id}`,
    tradeId: trade.trade_id,
    studentId,
    addedBy: studentId,
    tradeDate: displayDate(trade.trade_date),
    stockTicker: trade.stock_ticker ?? "",
    stockName: trade.stock_name ?? trade.stock_ticker ?? "",
    sector: trade.sector ?? "Technology",
    allocationPercent: Number(trade.allocation_percent || 0),
    amountInvested: money(trade.amount_invested),
    buyPrice: String(trade.buy_price || ""),
    currentSellPrice: String(trade.current_sell_price || trade.buy_price || ""),
    tradeType: trade.trade_type === "SELL" ? "Sell" : "Buy",
    tag1: trade.tag1 ?? "Earnings Play",
    tag2: trade.tag2 ?? "Macro Tailwind",
    tag3: trade.tag3 ?? "(optional)",
    thesis: trade.thesis ?? "",
  };
}

function isSubmittedPosition(position: Position) {
  return position.id.startsWith("server-");
}

function OptionRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: C.text2, fontFamily: font.medium, fontSize: 10, textTransform: "uppercase" }}>
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((option) => (
          <Pill key={option} label={option} active={value === option} onPress={() => onChange(option)} />
        ))}
      </ScrollView>
    </View>
  );
}

function DraftTradesTable({
  positions,
  selectedId,
  onSelect,
  onDelete,
}: {
  positions: Position[];
  selectedId: string | null;
  onSelect: (position: Position) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.035)" }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: "row", backgroundColor: "rgba(49,230,255,0.10)", borderBottomColor: C.border, borderBottomWidth: 1 }}>
            {tableColumns.map((column) => (
              <View key={column.key} style={{ width: column.width, paddingHorizontal: 10, paddingVertical: 10 }}>
                <Text selectable style={{ color: C.cyan, fontFamily: font.medium, fontSize: 10, textTransform: "uppercase" }}>
                  {column.label}
                </Text>
              </View>
            ))}
          </View>
          {positions.map((position, index) => {
            const cells = [
              position.stockTicker || "-",
              position.stockName || "Select a stock",
              position.sector || "-",
              position.tradeType,
              `${position.allocationPercent || 0}%`,
              position.amountInvested || "-",
              position.buyPrice || "-",
              position.currentSellPrice || "-",
              position.thesis ? `${position.thesis.slice(0, 52)}${position.thesis.length > 52 ? "..." : ""}` : "-",
            ];
            return (
              <TouchableOpacity
                key={position.id}
                activeOpacity={0.78}
                onPress={() => onSelect(position)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: selectedId === position.id ? "rgba(49,230,255,0.12)" : index % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.052)",
                  borderBottomColor: selectedId === position.id ? "rgba(49,230,255,0.28)" : C.border,
                  borderBottomWidth: index < positions.length - 1 ? 1 : 0,
                }}
              >
                {cells.map((value, cellIndex) => (
                  <View key={`${position.id}-${cellIndex}`} style={{ width: tableColumns[cellIndex].width, paddingHorizontal: 10, paddingVertical: 11 }}>
                    <Text
                      selectable
                      numberOfLines={2}
                      style={{
                        color: cellIndex === 0 ? C.text0 : C.text1,
                        fontFamily: cellIndex === 0 || cellIndex >= 4 ? font.mono : font.regular,
                        fontSize: cellIndex === 8 ? 11 : 12,
                        lineHeight: 16,
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
                <View style={{ width: tableColumns[9].width, paddingHorizontal: 10, paddingVertical: 7, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation();
                      onDelete(position.id);
                    }}
                    style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderColor: "rgba(255,95,126,0.34)", borderWidth: 1, backgroundColor: "rgba(255,95,126,0.10)" }}
                  >
                    <Trash2 size={15} color={C.red} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function StockSearchField({
  ticker,
  onSelect,
}: {
  ticker: string;
  onSelect: (data: { ticker: string; name: string; sector: string; buyPrice: string; currentSellPrice: string }) => void;
}) {
  const [query, setQuery] = useState(ticker);
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(ticker);
  }, [ticker]);

  const handleChange = (text: string) => {
    setQuery(text.toUpperCase());
    setShowResults(false);
    setSearchError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await market.search(text);
        setResults(res.results.slice(0, 6));
        setShowResults(res.results.length > 0);
      } catch (err) {
        setResults([]);
        setSearchError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelect = async (result: StockSearchResult) => {
    setQuery(result.ticker);
    setShowResults(false);
    setResults([]);
    setSearching(true);
    try {
      const priceData = await market.getPrice(result.ticker);
      const priceStr = String(priceData.price);
      onSelect({
        ticker: result.ticker,
        name: result.name ?? result.ticker,
        sector: result.sector ?? "Foreign Stock",
        buyPrice: priceStr,
        currentSellPrice: priceStr,
      });
    } catch {
      onSelect({
        ticker: result.ticker,
        name: result.name ?? result.ticker,
        sector: result.sector ?? "Foreign Stock",
        buyPrice: "",
        currentSellPrice: "",
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={{ gap: 4 }}>
      <Text selectable style={{ color: C.text2, fontFamily: font.medium, fontSize: 10, textTransform: "uppercase" }}>
        Search Stock
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder="Name or ticker — e.g. Infosys, AAPL"
          placeholderTextColor={C.text2}
          style={{
            flex: 1,
            height: 50,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 14,
            color: C.text0,
            fontFamily: font.regular,
            fontSize: 14,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />
        {searching && <ActivityIndicator size="small" color={C.cyan} />}
      </View>
      {searchError ? (
        <Text selectable style={{ color: C.red, fontSize: 11, marginTop: 2 }}>{searchError}</Text>
      ) : null}
      {showResults && results.length > 0 && (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginTop: 2 }}>
          {results.map((result, idx) => (
            <TouchableOpacity
              key={result.ticker}
              onPress={() => handleSelect(result)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: idx % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.055)",
                borderBottomWidth: idx < results.length - 1 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text selectable style={{ color: C.cyan, fontFamily: font.mono, fontSize: 13 }}>{result.ticker}</Text>
                <Text selectable style={{ color: C.text1, fontSize: 12, marginTop: 1 }}>{result.name ?? "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text selectable style={{ color: C.text2, fontSize: 11 }}>{result.exchange ?? ""}</Text>
                {result.sector ? (
                  <Text selectable style={{ color: C.text2, fontSize: 10, marginTop: 1 }}>{result.sector}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export function PortfolioBuilder({ userData, onSubmitSuccess }: { userData: UserData | null; onSubmitSuccess?: () => void }) {
  const studentId = userData?.studentId || "202600000000";
  const { width } = useWindowDimensions();
  const isNarrow = width < 430;
  const [capitalAmount, setCapitalAmount] = useState(10000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Position>(() => makeTrade(studentId, 0, capitalAmount));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [setup, setSetup] = useState<PortfolioSetup>({
    studentId,
    totalCapital: "$10,000",
    riskAppetite: "Moderate",
    investmentHorizon: "1 Month",
    competitionRound: "June 2026",
  });
  const [activeGlossary, setActiveGlossary] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");

  useEffect(() => {
    let active = true;
    setDraftStatus("Loading saved portfolio...");
    async function loadSavedPortfolio() {
      try {
        const draft = await getPortfolioDraft(studentId);
        if (!active) return;
        if (draft && draft.positions.length > 0) {
          setSetup(draft.setup);
          setPositions(draft.positions);
          setCurrentPosition(makeTrade(studentId, draft.positions.length, capitalAmount));
          setEditingId(null);
          setDraftStatus(`Draft restored from ${new Date(draft.updatedAt).toLocaleString()}.`);
          return;
        }

        if (userData?.studentId) {
          const response = await portfolio.getTrades(userData.studentId);
          if (!active) return;
          const savedPositions = response.trades
            .slice()
            .reverse()
            .map((trade, index) => tradeToPosition(trade, index, studentId));
          if (savedPositions.length > 0) {
            const nextSetup = draft?.setup ?? {
              studentId,
              totalCapital: "$10,000",
              riskAppetite: "Moderate",
              investmentHorizon: "1 Month",
              competitionRound: "June 2026",
            };
            setSetup(nextSetup);
            setPositions(savedPositions);
            setCurrentPosition(makeTrade(studentId, savedPositions.length, capitalAmount));
            setEditingId(null);
            setDraftStatus(`${savedPositions.length} previously submitted stock${savedPositions.length === 1 ? "" : "s"} loaded.`);
            return;
          }
        }

        if (!active) return;
        setSetup({
          studentId,
          totalCapital: "$10,000",
          riskAppetite: "Moderate",
          investmentHorizon: "1 Month",
          competitionRound: "June 2026",
        });
        setPositions([]);
        setCurrentPosition(makeTrade(studentId, 0, capitalAmount));
        setEditingId(null);
        setDraftStatus("");
      } catch (err) {
        if (!active) return;
        setSetup({
          studentId,
          totalCapital: "$10,000",
          riskAppetite: "Moderate",
          investmentHorizon: "1 Month",
          competitionRound: "June 2026",
        });
        setPositions([]);
        setCurrentPosition(makeTrade(studentId, 0, capitalAmount));
        setEditingId(null);
        setDraftStatus(err instanceof Error ? `Saved stocks could not load: ${err.message}` : "Saved stocks could not load.");
      }
    }
    void loadSavedPortfolio();
    return () => {
      active = false;
    };
  }, [capitalAmount, studentId, userData?.studentId]);

  useEffect(() => {
    if (!userData?.studentId) return;
    portfolio.getSummary(userData.studentId)
      .then((s) => {
        setCapitalAmount(s.total_capital);
        setSetup((prev) => ({ ...prev, totalCapital: `$${s.total_capital.toLocaleString()}` }));
        setCurrentPosition((prev) => {
          if (editingId) return prev;
          return {
            ...prev,
            amountInvested: `$${Math.round((s.total_capital * Number(prev.allocationPercent || 0)) / 100).toLocaleString()}`,
          };
        });
      })
      .catch(() => {});
  }, [editingId, userData?.studentId]);

  const totalAllocation = positions.reduce((sum, position) => sum + (Number(position.allocationPercent) || 0), 0);
  const draftPositions = positions.filter((position) => !isSubmittedPosition(position));
  const uniqueSectors = new Set(positions.map((position) => position.sector).filter(Boolean)).size;
  const overLimit = totalAllocation > 100;
  const meetsMin = uniqueSectors >= 3 && positions.every((position) => position.allocationPercent <= 30);
  const colors = [C.purple, C.cyan, C.green, C.gold, C.red, C.text2];

  const resetCurrentPosition = (nextIndex = positions.length) => {
    setCurrentPosition(makeTrade(studentId, nextIndex, capitalAmount));
    setEditingId(null);
  };

  const updateCurrentPosition = (field: keyof Position, value: string | number) => {
    setCurrentPosition((position) => {
      const next = { ...position, [field]: value };
      if (field === "allocationPercent") next.amountInvested = `$${Math.round((capitalAmount * Number(value || 0)) / 100).toLocaleString()}`;
      return next;
    });
  };

  const selectPositionForEditing = (position: Position) => {
    setCurrentPosition(position);
    setEditingId(position.id);
    setDraftStatus(`${position.stockTicker || "Selected stock"} loaded for editing.`);
  };

  const removePosition = async (id: string) => {
    const nextPositions = positions.filter((position) => position.id !== id);
    setPositions(nextPositions);
    if (editingId === id) resetCurrentPosition(nextPositions.length);
    const draft = await savePortfolioDraft(studentId, setup, nextPositions);
    setSetup(draft.setup);
    setPositions(draft.positions);
    setDraftStatus(`Stock removed from the draft table. ${draft.positions.length} saved stock${draft.positions.length === 1 ? "" : "s"} remaining.`);
  };

  const saveDraft = async () => {
    const hasCurrentStock = Boolean(currentPosition.stockTicker.trim());
    const normalizedCurrent: Position = {
      ...currentPosition,
      id: editingId ?? currentPosition.id,
      studentId,
      addedBy: currentPosition.addedBy || studentId,
      tradeId: editingId ? currentPosition.tradeId : `TRD${String(positions.length + 1).padStart(6, "0")}`,
    };
    const nextPositions = hasCurrentStock
      ? editingId
        ? positions.map((position) => (position.id === editingId ? normalizedCurrent : position))
        : [...positions, normalizedCurrent]
      : positions;

    const draft = await savePortfolioDraft(studentId, setup, nextPositions);
    setSetup(draft.setup);
    setPositions(draft.positions);
    resetCurrentPosition(draft.positions.length);
    setDraftStatus(hasCurrentStock ? "Stock saved to the draft table. The form is ready for the next stock." : "Draft saved.");
  };

  async function submitToBackend() {
    if (!userData?.studentId) {
      setDraftStatus("Not logged in.");
      return;
    }
    setDraftStatus("Submitting trades to server...");
    let successCount = 0;
    try {
      if (draftPositions.length === 0) {
        setDraftStatus("No new draft stocks to submit. Previously submitted stocks are already saved.");
        return;
      }

      for (const position of draftPositions) {
        const enteredPrice = parseFloat(position.buyPrice.replace(/[^0-9.]/g, ""));
        const rawAmount = parseFloat(position.amountInvested.replace(/[^0-9.]/g, ""));
        const rawPrice = enteredPrice > 0 ? enteredPrice : 1;
        const quantity =
          rawPrice > 0 && rawAmount > 0 ? Math.max(1, Math.round(rawAmount / rawPrice)) : 1;

        await portfolio.executeTrade({
          stock_ticker: position.stockTicker,
          stock_name: position.stockName || position.stockTicker,
          sector: position.sector || undefined,
          trade_type: position.tradeType === "Buy" ? "BUY" : "SELL",
          quantity,
          buy_price: rawPrice,
          current_sell_price: parseFloat(position.currentSellPrice.replace(/[^0-9.]/g, "")) || rawPrice,
          tag1: position.tag1 === "(optional)" ? undefined : position.tag1 || undefined,
          tag2: position.tag2 === "(optional)" ? undefined : position.tag2 || undefined,
          tag3: position.tag3 === "(optional)" ? undefined : position.tag3 || undefined,
          thesis: position.thesis || undefined,
          amount_invested: rawAmount > 0 ? rawAmount : undefined,
        });
        successCount++;
      }
      try {
        await analytics.computeScores(userData.studentId);
        setDraftStatus(`${successCount}/${draftPositions.length} trade(s) submitted successfully. Score and leaderboard updated.`);
      } catch {
        setDraftStatus(`${successCount}/${draftPositions.length} trade(s) submitted successfully. Score will update after the next scoring run.`);
      }
      await savePortfolioDraft(studentId, setup, []);
      const response = await portfolio.getTrades(userData.studentId);
      const savedPositions = response.trades
        .slice()
        .reverse()
        .map((trade, index) => tradeToPosition(trade, index, studentId));
      setPositions(savedPositions);
      resetCurrentPosition(savedPositions.length);
      portfolio.getSummary(userData.studentId)
        .then((s) => setCapitalAmount(s.total_capital))
        .catch(() => {});
      setSubmitted(true);
      onSubmitSuccess?.();
    } catch (err) {
      setDraftStatus(
        `${successCount}/${draftPositions.length} submitted. Error: ${err instanceof Error ? err.message : "Submission failed"}`
      );
    }
  }

  const statusText = useMemo(() => {
    if (overLimit) return "Total allocation exceeds 100%. Reduce position weights.";
    if (!meetsMin) return `Need min 3 sectors and max 30% per asset. Currently ${uniqueSectors} sectors.`;
    return "Meets diversification requirements.";
  }, [meetsMin, overLimit, uniqueSectors]);

  return (
    <View style={{ gap: 16 }}>
      {submitted ? (
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: "rgba(30,230,163,0.12)", borderColor: "rgba(30,230,163,0.30)", borderWidth: 1, flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Check size={18} color={C.green} />
          <Text selectable style={{ color: C.green, fontFamily: font.medium, fontSize: 13 }}>
            Portfolio setup and trade log saved
          </Text>
        </View>
      ) : null}
      {draftStatus ? (
        <View style={{ padding: 12, borderRadius: 14, backgroundColor: "rgba(49,230,255,0.08)", borderColor: "rgba(49,230,255,0.22)", borderWidth: 1 }}>
          <Text selectable style={{ color: C.cyan, fontFamily: font.medium, fontSize: 12, lineHeight: 17 }}>
            {draftStatus}
          </Text>
        </View>
      ) : null}

      <View>
        <Text selectable style={{ color: C.text0, fontFamily: font.heading, fontSize: 29, textTransform: "uppercase" }}>
          Portfolio Setup
        </Text>
      </View>

      <GlassCard style={{ padding: 16, gap: 14, backgroundColor: "rgba(21,18,47,0.92)", borderColor: "rgba(141,124,255,0.30)" }} accent={C.purple}>
        <SectionTitle title="Portfolio Setup" accent={C.purple} />
        <Field label="User ID" value={setup.studentId} onChangeText={() => undefined} placeholder="202600000001" />
        <Field label="Total Capital" value={setup.totalCapital} onChangeText={() => undefined} placeholder="$10,000" />
        <OptionRow label="Risk Appetite" options={["High", "Moderate", "Low"]} value={setup.riskAppetite} onChange={(value) => setSetup((prev) => ({ ...prev, riskAppetite: value as PortfolioSetup["riskAppetite"] }))} />
        <OptionRow label="Investment Horizon" options={["1 Month", "2 Months", "3 Months"]} value={setup.investmentHorizon} onChange={(value) => setSetup((prev) => ({ ...prev, investmentHorizon: value }))} />
        <Field label="Competition Round" value={setup.competitionRound} onChangeText={(value) => setSetup((prev) => ({ ...prev, competitionRound: value }))} placeholder="June 2026" />
      </GlassCard>

      <GlassCard style={{ padding: 16, gap: 14, backgroundColor: "rgba(8,35,33,0.82)", borderColor: overLimit ? "rgba(255,95,126,0.34)" : "rgba(30,230,163,0.30)" }} accent={overLimit ? C.red : C.green}>
        <SectionTitle title="Allocation" accent={overLimit ? C.red : C.green} right={<Text selectable style={{ color: overLimit ? C.red : C.green, fontFamily: font.mono, fontSize: 16 }}>{totalAllocation}%</Text>} />
        <Text selectable style={{ color: C.text2, fontSize: 12, lineHeight: 17 }}>
          Keep total allocation within 100%, use at least 3 sectors, and cap each asset at 30%.
        </Text>
        <View style={{ flexDirection: "row", height: 14, borderRadius: 14, overflow: "hidden", gap: 2 }}>
          {positions.map((position, index) => (
            <View key={position.id} style={{ width: `${Math.min(position.allocationPercent, 30)}%`, minWidth: position.allocationPercent > 0 ? 2 : 0, backgroundColor: colors[index % colors.length] }} />
          ))}
        </View>
        <Text selectable style={{ color: meetsMin && !overLimit ? C.green : C.red, fontFamily: font.medium, fontSize: 12 }}>
          {statusText}
        </Text>
      </GlassCard>

      <GlassCard style={{ padding: 16, gap: 12, backgroundColor: "rgba(10,16,32,0.94)", borderColor: "rgba(49,230,255,0.24)" }} accent={C.cyan}>
        <SectionTitle
          title={editingId ? "Edit Stock" : "Select Stock"}
          accent={C.cyan}
          right={<TouchableOpacity onPress={() => resetCurrentPosition(positions.length)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", borderColor: C.border2, borderWidth: 1 }}>
            <X size={14} color={C.text1} />
            <Text selectable style={{ color: C.text1, fontFamily: font.medium, fontSize: 12 }}>Clear</Text>
          </TouchableOpacity>}
        />
        <Text selectable style={{ color: C.text2, fontSize: 12, lineHeight: 17 }}>
          Fill one stock at a time. Save Draft records it in the table below, clears the form, and lets you add the next stock.
        </Text>
        <View style={{ gap: 10, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.045)", borderColor: C.border, borderWidth: 1, borderTopWidth: 3, borderTopColor: editingId ? C.gold : C.cyan }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Trade ID" value={currentPosition.tradeId} onChangeText={() => undefined} placeholder="TRD000001" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Trade Date" value={currentPosition.tradeDate} onChangeText={(value) => updateCurrentPosition("tradeDate", value)} placeholder="01/06/2026" />
            </View>
          </View>
          <Field label="User ID" value={currentPosition.studentId} onChangeText={() => undefined} placeholder="202600000001" />
          <Field label="Added By" value={currentPosition.addedBy} onChangeText={(value) => updateCurrentPosition("addedBy", value.toUpperCase())} placeholder="202600000002" />
          <StockSearchField
            ticker={currentPosition.stockTicker}
            onSelect={(data) => {
              setCurrentPosition((position) => ({
                ...position,
                stockTicker: data.ticker,
                stockName: data.name,
                sector: data.sector,
                buyPrice: data.buyPrice,
                currentSellPrice: data.currentSellPrice,
              }));
            }}
          />
          <Field label="Stock Name" value={currentPosition.stockName} onChangeText={(value) => updateCurrentPosition("stockName", value)} placeholder="Apple Inc" />
          <OptionRow label="Sector" options={sectorOptions} value={currentPosition.sector} onChange={(value) => updateCurrentPosition("sector", value)} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Allocation %" value={String(currentPosition.allocationPercent)} onChangeText={(value) => updateCurrentPosition("allocationPercent", Number(value.replace(/\D/g, "").slice(0, 3)) || 0)} placeholder="20" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Amount Invested" value={currentPosition.amountInvested} onChangeText={(value) => updateCurrentPosition("amountInvested", value)} placeholder="$2,000" />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Buy Price" value={currentPosition.buyPrice} onChangeText={(value) => updateCurrentPosition("buyPrice", value)} placeholder="$189.50" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Current / Sell Price" value={currentPosition.currentSellPrice} onChangeText={(value) => updateCurrentPosition("currentSellPrice", value)} placeholder="$201.00" keyboardType="decimal-pad" />
            </View>
          </View>
          <OptionRow label="Trade Type" options={["Buy", "Sell"]} value={currentPosition.tradeType} onChange={(value) => updateCurrentPosition("tradeType", value)} />
          <OptionRow label="Tag 1" options={tagOptions} value={currentPosition.tag1} onChange={(value) => updateCurrentPosition("tag1", value)} />
          <OptionRow label="Tag 2" options={tagOptions} value={currentPosition.tag2} onChange={(value) => updateCurrentPosition("tag2", value)} />
          <OptionRow label="Tag 3" options={tagOptions} value={currentPosition.tag3} onChange={(value) => updateCurrentPosition("tag3", value)} />
          <Field label="Thesis" value={currentPosition.thesis} onChangeText={(value) => updateCurrentPosition("thesis", value)} placeholder="Max 50 words" multiline />
          <Text selectable style={{ color: wordCount(currentPosition.thesis) <= 50 ? C.text2 : C.red, fontSize: 10, alignSelf: "flex-end" }}>
            {wordCount(currentPosition.thesis)}/50 words
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <SectionTitle
            title="Saved Draft Stocks"
            accent={C.green}
            right={<Text selectable style={{ color: C.green, fontFamily: font.mono, fontSize: 12 }}>{positions.length} row{positions.length === 1 ? "" : "s"}</Text>}
          />
          {positions.length === 0 ? (
            <View style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.035)" }}>
              <Text selectable style={{ color: C.text2, fontSize: 12 }}>
                No saved stocks yet. Fill the stock fields above and click Save Draft.
              </Text>
            </View>
          ) : (
            <DraftTradesTable positions={positions} selectedId={editingId} onSelect={selectPositionForEditing} onDelete={(id) => void removePosition(id)} />
          )}
        </View>
      </GlassCard>

      {activeGlossary && glossary[activeGlossary] ? (
        <GlassCard style={{ padding: 16, gap: 10, borderColor: "rgba(49,230,255,0.35)" }} accent={C.cyan}>
          <SectionTitle title={glossary[activeGlossary].term} accent={C.cyan} />
          <Text selectable style={{ color: C.text1, fontSize: 12, lineHeight: 19 }}>{glossary[activeGlossary].def}</Text>
          {glossary[activeGlossary].formula ? (
            <Text selectable style={{ color: C.purple, fontFamily: font.mono, fontSize: 11, lineHeight: 17, backgroundColor: C.bg3, padding: 9, borderRadius: 8 }}>
              {glossary[activeGlossary].formula}
            </Text>
          ) : null}
        </GlassCard>
      ) : null}

      <GlassCard style={{ padding: 16, gap: 12 }} accent={C.gold}>
        <SectionTitle title="Concept Library" accent={C.gold} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {glossaryTerms.map((term) => {
            const active = activeGlossary === term.key;
            return (
              <TouchableOpacity key={term.label} disabled={!term.key} onPress={() => setActiveGlossary(active ? null : term.key)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderColor: `${term.color}55`, borderWidth: 1, backgroundColor: active ? `${term.color}24` : `${term.color}12`, opacity: term.key ? 1 : 0.72 }}>
                <Text selectable style={{ color: term.color, fontFamily: font.medium, fontSize: 12 }}>{term.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </GlassCard>

      <View style={{ flexDirection: isNarrow ? "column" : "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppButton label={editingId ? "Update Draft" : "Save Draft"} onPress={() => void saveDraft()} variant="ghost" />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton label="Submit" onPress={() => {
            void submitToBackend();
          }} disabled={draftPositions.length === 0} />
        </View>
      </View>
    </View>
  );
}

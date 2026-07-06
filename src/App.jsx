import React, { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const h = React.createElement;

const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CROPS = {
      pepper: {
              nameEn: "Pepper",
              color: "#A63D2F", basePriceINR: 690,
              harvest: [11, 0, 1], harvestLabelEn: "Dec - Feb",
              seasonalIndex: [88, 84, 90, 98, 104, 108, 112, 115, 118, 112, 100, 92],
              noteEn: "Prices trough at harvest, climb through monsoon lean season (Jul-Sep) when farmer stock thins.",
              grades: [{ id: "faq", nameEn: "Standard FAQ", premium: 0 }]
      },
      cardamom: {
              nameEn: "Cardamom",
              color: "#7C8B6F", basePriceINR: 2850,
              harvest: [7, 8, 9, 10], harvestLabelEn: "Aug - Nov",
              seasonalIndex: [106, 110, 108, 102, 96, 92, 90, 85, 82, 88, 95, 102],
              noteEn: "Auction-driven (Vandanmedu). Sharp dip during peak picking, firms into festive-season demand (Oct-Dec).",
              grades: [{ id: "std", nameEn: "Auction Standard", premium: 0 }]
      },
      rubber: {
              nameEn: "Rubber",
              color: "#5C6B4F", basePriceINR: 269,
              harvest: [5, 6, 7, 8, 9], harvestLabelEn: "Jun - Oct (tapping season)",
              seasonalIndex: [94, 92, 95, 101, 106, 112, 110, 103, 97, 95, 93, 96],
              noteEn: "Kottayam Rubber Board spot. Tapping season floods supply; lean season (Nov-Feb) firms prices as trees rest.",
              grades: [
                  { id: "rss4", nameEn: "RSS-4 (Premium)", premium: 0 },
                  { id: "rss5", nameEn: "RSS-5 Sheet", premium: -8 },
                  { id: "lot", nameEn: "RSS LOT Mixed", premium: -15 },
                  { id: "ottupal", nameEn: "Ottupal (Scrap)", premium: -90 }
                      ]
      },
      coffee: {
              nameEn: "Coffee (Robusta)",
              color: "#C89B3C", basePriceINR: 207,
              harvest: [10, 11, 0, 1], harvestLabelEn: "Nov - Feb",
              seasonalIndex: [90, 87, 91, 97, 103, 107, 110, 113, 111, 105, 95, 89],
              noteEn: "Tracks ICO composite indicator with a lag; India crop pressure is heaviest Dec-Jan.",
              grades: [
                  { id: "whole", nameEn: "Brown Whole", premium: 0 },
                  { id: "chips", nameEn: "Coffee Chips", premium: -22 }
                      ]
      },
      areca: {
              nameEn: "Areca Nut",
              color: "#8A6E4B", basePriceINR: 400,
              harvest: [10, 11, 0, 1], harvestLabelEn: "Nov - Feb",
              seasonalIndex: [95, 92, 96, 101, 106, 110, 113, 109, 104, 98, 90, 93],
              noteEn: "Karnataka/Kerala supply dominates pricing; import-substitution policy shifts can override seasonality entirely.",
              grades: [{ id: "std", nameEn: "Standard", premium: 0 }]
      },
};

function formatINR(n) {
      return "Rs " + Math.round(n).toLocaleString("en-IN");
}

function currentSignal(seasonalIndex, monthIdx) {
      const avg = 100;
      const val = seasonalIndex[monthIdx];
      const diff = val - avg;
      if (diff <= -8) return { key: "good", tone: "good", diff: diff };
      if (diff <= -2) return { key: "mild-good", tone: "mild-good", diff: diff };
      if (diff < 6) return { key: "neutral", tone: "neutral", diff: diff };
      return { key: "caution", tone: "caution", diff: diff };
}

const toneColor = { good: "#7C8B6F", "mild-good": "#9CAF88", neutral: "#C89B3C", caution: "#A63D2F" };
const signalLabel = { good: "Strong buy window", "mild-good": "Favorable", neutral: "Neutral", caution: "Above average -- hold if possible" };

function localKey(cropKey, gradeId) {
      return "da_traders_rate_" + cropKey + "_" + gradeId;
}

export default function SpiceSeasonality() {
      const nowIdx = new Date().getMonth();
      const [selected, setSelected] = useState("pepper");
      const crop = CROPS[selected];

  const [selectedGrade, setSelectedGrade] = useState(crop.grades[0].id);
      const grade = crop.grades.find(function (g) { return g.id === selectedGrade; }) || crop.grades[0];

  const [scraped, setScraped] = useState(null);
      const [scrapedLoaded, setScrapedLoaded] = useState(false);
      const [manualRates, setManualRates] = useState({});
      const [manualLoaded, setManualLoaded] = useState(false);
      const [draftPrice, setDraftPrice] = useState("");

  useEffect(function () {
          fetch("/rates.json")
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                        setScraped(data);
                        setScrapedLoaded(true);
            })
            .catch(function () { setScrapedLoaded(true); });
  }, []);

  useEffect(function () {
          const next = {};
          try {
                    for (let i = 0; i < localStorage.length; i++) {
                                const k = localStorage.key(i);
                                if (k && k.indexOf("da_traders_rate_") === 0) {
                                              try { next[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
                                }
                    }
          } catch (e) {}
          setManualRates(next);
          setManualLoaded(true);
  }, []);

  function selectCrop(key) {
          setSelected(key);
          setSelectedGrade(CROPS[key].grades[0].id);
  }

  const manualKey = localKey(selected, selectedGrade);
      const manualOverride = manualRates[manualKey];

  const scrapedForCrop = scraped ? scraped[selected] : null;
      const scrapedBasePrice = scrapedForCrop && scrapedForCrop.price ? scrapedForCrop.price + grade.premium : null;

  const gradedBasePrice = manualOverride
        ? manualOverride.price
          : scrapedBasePrice != null
        ? scrapedBasePrice
          : crop.basePriceINR + grade.premium;

  const priceSource = manualOverride ? "manual" : scrapedBasePrice != null ? "scraped" : "baseline";

  const monthlyData = useMemo(function () {
          return MONTHS_EN.map(function (m, i) {
                    return {
                                month: m,
                                price: Math.round((crop.seasonalIndex[i] / 100) * gradedBasePrice),
                                isHarvest: crop.harvest.indexOf(i) !== -1,
                    };
          });
  }, [crop, gradedBasePrice]);

  const signal = currentSignal(crop.seasonalIndex, nowIdx);
      const currentPrice = Math.round((crop.seasonalIndex[nowIdx] / 100) * gradedBasePrice);
      const priceRange = {
              min: Math.round((Math.min.apply(null, crop.seasonalIndex) / 100) * gradedBasePrice),
              max: Math.round((Math.max.apply(null, crop.seasonalIndex) / 100) * gradedBasePrice),
      };

  function saveManualPrice() {
          const val = Number(draftPrice);
          if (!val || val <= 0) return;
          const record = { price: val, savedAt: new Date().toISOString() };
          try {
                    localStorage.setItem(manualKey, JSON.stringify(record));
                    setManualRates(function (prev) {
                                const next = Object.assign({}, prev);
                                next[manualKey] = record;
                                return next;
                    });
                    setDraftPrice("");
          } catch (e) {}
  }

  const cropName = crop.nameEn;
      const gradeName = grade.nameEn;

  const lastUpdatedLabel = priceSource === "manual"
        ? new Date(manualOverride.savedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " (manual entry)"
          : priceSource === "scraped"
        ? (scrapedForCrop.date || "today") + " -- auto-updated from " + (scrapedForCrop.marketsReporting || "?") + " Kerala mandi(s)"
          : "No live data yet -- showing baseline reference price";

  const cropTabs = h(
          "div",
      { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 } },
          Object.entries(CROPS).map(function (entry) {
                    const k = entry[0];
                    const c = entry[1];
                    return h(
                                "button",
                        {
                                      key: k,
                                      onClick: function () { selectCrop(k); },
                                      style: {
                                                      padding: "10px 16px",
                                                      background: selected === k ? c.color : "#2A241D",
                                                      color: selected === k ? "#211C17" : "#EDE6D6",
                                                      border: "1px solid " + c.color,
                                                      cursor: "pointer",
                                      },
                        },
                                c.nameEn
                              );
          })
        );

  const gradeTabs = h(
          "div",
      { style: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" } },
          crop.grades.map(function (g) {
                    return h(
                                "button",
                        {
                                      key: g.id,
                                      onClick: function () { setSelectedGrade(g.id); },
                                      style: {
                                                      padding: "6px 12px",
                                                      background: g.id === selectedGrade ? "#C89B3C" : "#2A241D",
                                                      color: g.id === selectedGrade ? "#211C17" : "#EDE6D6",
                                                      border: "1px solid #4a4038",
                                                      fontSize: 12,
                                                      cursor: "pointer",
                                      },
                        },
                                g.nameEn
                              );
          })
        );

  const priceBox = h(
          "div",
      { style: { background: "#EDE6D6", color: "#211C17", padding: 24, marginBottom: 20 } },
          h("div", { style: { fontSize: 12, color: "#6b5f4f", marginBottom: 6 } },
                  cropName + " - " + gradeName + " - " + (!scrapedLoaded || !manualLoaded ? "Loading..." : lastUpdatedLabel)),
          h("div", { style: { fontSize: 36, fontWeight: 700 } }, formatINR(currentPrice) + "/kg"),
          h("div", { style: { fontSize: 14, marginTop: 6, color: toneColor[signal.tone], fontWeight: 600 } }, signalLabel[signal.key]),
          h("div", { style: { fontSize: 12, marginTop: 6, color: "#6b5f4f" } },
                  (signal.diff > 0 ? "+" : "") + signal.diff + "% vs. year-average - range " + formatINR(priceRange.min) + " to " + formatINR(priceRange.max))
        );

  const manualBox = priceSource !== "scraped"
        ? h(
                    "div",
            { style: { background: "#2A241D", border: "1px solid #4a4038", padding: 16, marginBottom: 20 } },
                    h("div", { style: { fontSize: 12, color: "#8A7D6A", marginBottom: 8 } },
                                "No auto-scraped rate found for " + cropName + " today -- enter it manually as a fallback:"),
                    h(
                                  "div",
                        { style: { display: "flex", gap: 8, alignItems: "center" } },
                                  h("input", {
                                                  type: "number",
                                                  value: draftPrice,
                                                  onChange: function (e) { setDraftPrice(e.target.value); },
                                                  placeholder: String(crop.basePriceINR + grade.premium),
                                                  style: { padding: 8, width: 110, background: "#211C17", color: "#EDE6D6", border: "1px solid #4a4038" },
                                  }),
                                  h(
                                                  "button",
                                      { onClick: saveManualPrice, style: { padding: "8px 14px", background: "#C89B3C", border: "none", cursor: "pointer" } },
                                                  "Save"
                                                )
                                )
                  )
          : null;

  const chartBox = h(
          "div",
      { style: { background: "#2A241D", border: "1px solid #4a4038", padding: 20 } },
          h("div", { style: { fontSize: 12, color: "#8A7D6A", marginBottom: 12 } },
                  cropName + " - " + gradeName + " - TYPICAL PRICE BY MONTH (Rs/KG)"),
          h(
                    ResponsiveContainer,
              { width: "100%", height: 260 },
                    h(
                                AreaChart,
                        { data: monthlyData },
                                h(
                                              "defs",
                                              null,
                                              h(
                                                              "linearGradient",
                                                  { id: "fillArea", x1: "0", y1: "0", x2: "0", y2: "1" },
                                                              h("stop", { offset: "0%", stopColor: crop.color, stopOpacity: 0.35 }),
                                                              h("stop", { offset: "100%", stopColor: crop.color, stopOpacity: 0.02 })
                                                            )
                                            ),
                                h(CartesianGrid, { stroke: "#3a332a", vertical: false }),
                                h(XAxis, { dataKey: "month", stroke: "#8A7D6A", fontSize: 12 }),
                                h(YAxis, {
                                              stroke: "#8A7D6A",
                                              fontSize: 11,
                                              tickFormatter: function (v) { return "Rs" + v; },
                                              domain: ["dataMin - 20", "dataMax + 20"],
                                }),
                                h(ReferenceLine, { y: gradedBasePrice, stroke: "#8A7D6A", strokeDasharray: "3 3" }),
                                h(Tooltip, { formatter: function (v) { return [formatINR(v) + "/kg", "Price"]; } }),
                                h(Area, { type: "monotone", dataKey: "price", stroke: crop.color, strokeWidth: 2, fill: "url(#fillArea)" })
                              )
                  )
        );

  return h(
          "div",
      { style: { minHeight: "100vh", background: "#211C17", color: "#EDE6D6", fontFamily: "sans-serif", padding: 20 } },
          h(
                    "div",
              { style: { maxWidth: 880, margin: "0 auto" } },
                    h("h1", { style: { fontSize: 28, marginBottom: 4 } }, "D.A. Traders -- Wayanad Procurement Ledger"),
                    h("p", { style: { color: "#A99C86", fontSize: 14, marginBottom: 20 } },
                              "Rates auto-update daily from Kerala mandi data via GitHub Actions. A manual box appears below only if a day's scrape is missing."),
                    cropTabs,
                    gradeTabs,
                    priceBox,
                    manualBox,
                    chartBox
                  )
        );
}

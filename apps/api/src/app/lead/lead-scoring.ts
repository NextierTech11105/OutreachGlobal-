// Scoring matrix configuration
export const DISTRESS_SIGNAL_MATRIX = {
  lisPendens: { score: 10, tag: "PreForeclosure" },
  reverseMortgage: { score: 10, tag: "SeniorOwner" },
  vacantProperty: { score: 10, tag: "VacantProp" },
  estateTrustOwner: { score: 10, tag: "NonOccupant" },
  highEquity: { score: 10, tag: "HighEquity" },
  lowEquity: { score: 10, tag: "LowEquity" },
  negativeEquity: { score: 10, tag: "Underwater" },
  loanMaturityRisk: { score: 10, tag: "LoanMaturityRisk" },
  buildableZoning: { score: 10, tag: "BuildableZoning" },
} as const;

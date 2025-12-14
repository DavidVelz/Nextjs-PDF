import { PerBandEntry } from "./perBandEntry";
import { ElementNode } from "./elementNode";

export type ExportedData = {
  generatedAt?: string;
  title?: string;
  body?: string;
  parameters?: { massPerArea_kg_per_m2?: number; area_m2?: number; sourceLevel_dB?: number };
  frequencies_used_Hz?: number[];
  perBand_TL_dB_octave?: { octaveBands_Hz?: number[]; perBand_TL_dB?: number[]; overall_TL_dB?: number };
  perBand_Lp_exterior_dB?: PerBandEntry[];
  perBand_Lw_dB?: PerBandEntry[];
  facade_impacts_dB?: { name: string; impact_dB: number }[];
  summary?: Record<string, any>;
  elements?: ElementNode[];
  diagnostic?: Record<string, any>;
  criticalPoints?: any[];
  improvementStrategy?: any[];
  notes?: string;
  templates?: {
    cover?: string;
    results?: string;
    bands?: string;
    materials?: string;
    recommendations?: string;
  };
};

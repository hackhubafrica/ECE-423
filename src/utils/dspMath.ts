import { DigitalModScheme, LineCodingScheme } from '../types/ece423';

/**
 * High-precision complementary error function erfc(x) using Abramowitz & Stegun 7.1.26
 * Max error < 1.5e-7 across all x >= 0.
 */
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const ans = poly * Math.exp(-z * z);
  return x >= 0 ? ans : 2 - ans;
}

/**
 * Standard Gaussian tail probability Q(x) = 0.5 * erfc(x / sqrt(2))
 */
export function qFunction(x: number): number {
  if (x < -10) return 1;
  if (x > 10) return 0;
  return 0.5 * erfc(x / Math.SQRT2);
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 10);
}

export function linearToDb(val: number): number {
  if (val <= 0) return -Infinity;
  return 10 * Math.log10(val);
}

/**
 * µ-Law compression transfer function for normalized input x in [-1, 1]
 */
export function muLawCompress(x: number, mu: number): number {
  if (mu <= 0) return x;
  const absX = Math.min(1, Math.abs(x));
  return Math.sign(x) * (Math.log(1 + mu * absX) / Math.log(1 + mu));
}

/**
 * µ-Law expansion (inverse) transfer function for normalized y in [-1, 1]
 */
export function muLawExpand(y: number, mu: number): number {
  if (mu <= 0) return y;
  const absY = Math.min(1, Math.abs(y));
  return Math.sign(y) * ((Math.pow(1 + mu, absY) - 1) / mu);
}

/**
 * A-Law compression transfer function for normalized input x in [-1, 1]
 */
export function aLawCompress(x: number, A: number): number {
  if (A <= 1) return x;
  const absX = Math.min(1, Math.abs(x));
  const lnA = Math.log(A);
  if (absX < 1 / A) {
    return Math.sign(x) * ((A * absX) / (1 + lnA));
  }
  return Math.sign(x) * ((1 + Math.log(A * absX)) / (1 + lnA));
}

/**
 * A-Law expansion (inverse) transfer function
 */
export function aLawExpand(y: number, A: number): number {
  if (A <= 1) return y;
  const absY = Math.min(1, Math.abs(y));
  const lnA = Math.log(A);
  const threshold = 1 / (1 + lnA);
  if (absY < threshold) {
    return Math.sign(y) * ((absY * (1 + lnA)) / A);
  }
  return Math.sign(y) * (Math.exp(absY * (1 + lnA) - 1) / A);
}

/**
 * Overall PCM SNR including both quantization noise and channel bit-error noise:
 * SNR_total = 1 / (2^(-2n) + 4 * P_e)
 * Returns linear and dB values alongside SQNR-only baseline.
 */
export function calculateOverallPcmSnr(nBits: number, pe: number) {
  const qNoiseRatio = Math.pow(2, -2 * nBits); // 1 / 2^(2n) for full-scale uniform sine wave: 3/2 * 2^(2n) -> standard textbook forms
  // Standard Lathi / Haykin overall PCM SNR for sinusoidal full-load:
  // (S/N)_o = (3 * 2^(2n)) / (2 + 8 * 2^(2n) * P_e) = 1.5 / (2^(-2n) + 4 * P_e)
  // Using standard Haykin/Taub-Schilling full-load sinusoid formula:
  const sqnrLinear = 1.5 * Math.pow(2, 2 * nBits);
  const sqnrDb = 6.02 * nBits + 1.76;
  const totalSnrLinear = 1.5 / (qNoiseRatio + 4 * pe);
  const totalSnrDb = linearToDb(totalSnrLinear);
  const degradationDb = sqnrDb - totalSnrDb;
  return {
    sqnrLinear,
    sqnrDb,
    totalSnrLinear,
    totalSnrDb,
    degradationDb,
    inThresholdRegion: degradationDb > 1.0,
  };
}

export interface LineCodeMetrics {
  name: string;
  dcComponent: string;
  clockRecovery: string;
  errorDetection: string;
  bandwidthFactor: string;
  description: string;
}

export const LINE_CODE_INFO: Record<LineCodingScheme, LineCodeMetrics> = {
  unipolar_nrz: {
    name: 'Unipolar NRZ',
    dcComponent: 'High (Non-zero average)',
    clockRecovery: 'Poor (lost on long 0s or 1s)',
    errorDetection: 'None',
    bandwidthFactor: 'Rb (Null-to-Null)',
    description: '1 maps to +V, 0 maps to 0V. Simple TTL logic but suffers DC wander and loss of bit sync.',
  },
  polar_nrz: {
    name: 'Polar NRZ-L',
    dcComponent: 'Moderate (Zero for equiprobable bits)',
    clockRecovery: 'Poor on long runs of identical bits',
    errorDetection: 'None',
    bandwidthFactor: 'Rb (Null-to-Null)',
    description: '1 maps to +V, 0 maps to -V. 3 dB power advantage over Unipolar NRZ, still lacks clock sync.',
  },
  polar_rz: {
    name: 'Polar RZ',
    dcComponent: 'Low',
    clockRecovery: 'Good (guaranteed transition every bit)',
    errorDetection: 'None',
    bandwidthFactor: '2·Rb (Double bandwidth)',
    description: 'Returns to 0V mid-bit (+V/0 for 1, -V/0 for 0). Strong clock recovery at 2x bandwidth cost.',
  },
  manchester: {
    name: 'Manchester (Split-Phase)',
    dcComponent: 'Zero (Strictly DC-free)',
    clockRecovery: 'Excellent (mid-bit transition always)',
    errorDetection: 'Good (missing mid-bit edge = fault)',
    bandwidthFactor: '2·Rb (Null-to-Null)',
    description: 'IEEE 802.3 standard: 1 = +V→-V (or low-to-high), 0 = -V→+V. Zero DC component & guaranteed sync.',
  },
  bipolar_ami: {
    name: 'Bipolar AMI',
    dcComponent: 'Zero (Alternating mark polarity)',
    clockRecovery: 'Good for 1s, poor on long 0s',
    errorDetection: 'Yes (bipolar violation check)',
    bandwidthFactor: 'Rb (Peaks at Rb/2)',
    description: '0 maps to 0V; 1 alternates between +V and -V. Zero DC, single-error detection, compact spectrum.',
  },
};

export interface ModulationInfo {
  id: DigitalModScheme;
  name: string;
  shortName: string;
  bitsPerSymbol: number; // k = log2(M)
  spectralEfficiency: number; // bps/Hz based on Nyquist / null-to-null standard
  bandwidthFormula: string;
  detectionType: string;
  berFormulaLabel: string;
  description: string;
}

export const MODULATION_CATALOG: Record<DigitalModScheme, ModulationInfo> = {
  ask: {
    id: 'ask',
    name: 'Binary ASK (OOK Coherent)',
    shortName: 'BASK / OOK',
    bitsPerSymbol: 1,
    spectralEfficiency: 0.5,
    bandwidthFormula: 'B = 2·Rb (Null-to-Null)',
    detectionType: 'Coherent or Envelope Detector',
    berFormulaLabel: 'Pb = Q(√(Eb / N0))',
    description: 'Carrier amplitude switched ON for 1 and OFF for 0. Simple but 3 dB worse in Eb/N0 than BPSK.',
  },
  bpsk: {
    id: 'bpsk',
    name: 'Binary Phase Shift Keying',
    shortName: 'BPSK',
    bitsPerSymbol: 1,
    spectralEfficiency: 0.5,
    bandwidthFormula: 'B = 2·Rb (Null-to-Null)',
    detectionType: 'Coherent Matched Filter / Costas Loop',
    berFormulaLabel: 'Pb = Q(√(2·Eb / N0))',
    description: 'Antipodal signaling (±180° phase). Optimal binary power efficiency; requires coherent carrier recovery.',
  },
  qpsk: {
    id: 'qpsk',
    name: 'Quadrature Phase Shift Keying',
    shortName: 'QPSK',
    bitsPerSymbol: 2,
    spectralEfficiency: 1.0,
    bandwidthFormula: 'B = Rb (Null-to-Null)',
    detectionType: 'Coherent I/Q Correlator',
    berFormulaLabel: 'Pb ≈ Q(√(2·Eb / N0))',
    description: '2 bits per symbol across 4 phases (45°, 135°, 225°, 315°). Doubles spectral efficiency at same Eb/N0 as BPSK.',
  },
  dpsk: {
    id: 'dpsk',
    name: 'Differential PSK',
    shortName: 'DPSK',
    bitsPerSymbol: 1,
    spectralEfficiency: 0.5,
    bandwidthFormula: 'B = 2·Rb (Null-to-Null)',
    detectionType: 'Non-Coherent Differential Delay',
    berFormulaLabel: 'Pb = 0.5 · exp(-Eb / N0)',
    description: 'Encodes bits in phase transitions rather than absolute phase. Avoids carrier recovery; ~1 dB penalty at high SNR.',
  },
  bfsk_coh: {
    id: 'bfsk_coh',
    name: 'Binary FSK (Coherent Orthogonal)',
    shortName: 'BFSK (Coh)',
    bitsPerSymbol: 1,
    spectralEfficiency: 0.4,
    bandwidthFormula: 'B ≈ 2·Δf + 2·Rb',
    detectionType: 'Coherent Dual-Branch Correlator',
    berFormulaLabel: 'Pb = Q(√(Eb / N0))',
    description: 'Uses two orthogonal carrier frequencies (Δf = 0.5·Rb min). 3 dB worse power efficiency than BPSK.',
  },
  bfsk_noncoh: {
    id: 'bfsk_noncoh',
    name: 'Binary FSK (Non-Coherent)',
    shortName: 'BFSK (NC)',
    bitsPerSymbol: 1,
    spectralEfficiency: 0.33,
    bandwidthFormula: 'B ≈ 2·Δf + 2·Rb',
    detectionType: 'Non-Coherent Dual Envelope Detector',
    berFormulaLabel: 'Pb = 0.5 · exp(-Eb / (2·N0))',
    description: 'Low-cost receiver using two bandpass filters and envelope detectors without phase synchronization.',
  },
  msk: {
    id: 'msk',
    name: 'Minimum Shift Keying',
    shortName: 'MSK',
    bitsPerSymbol: 1,
    spectralEfficiency: 0.67,
    bandwidthFormula: 'B_null = 1.5·Rb (99% power in 1.18·Rb)',
    detectionType: 'Coherent OQPSK-Equivalent Correlator',
    berFormulaLabel: 'Pb = Q(√(2·Eb / N0))',
    description: 'Continuous-phase FSK with Δf = 0.5·Rb (h=0.5). Constant envelope + fast spectral sidelobe roll-off + BPSK BER.',
  },
  qam16: {
    id: 'qam16',
    name: '16-Quadrature Amplitude Modulation',
    shortName: '16-QAM',
    bitsPerSymbol: 4,
    spectralEfficiency: 2.0,
    bandwidthFormula: 'B = Rb / 2 (Null-to-Null)',
    detectionType: 'Coherent I/Q Multi-Level Slicer',
    berFormulaLabel: 'Pb ≈ (3/8)·erfc(√(0.4·Eb / N0))',
    description: '4 bits per symbol using both amplitude and phase. 4x spectral efficiency of BPSK, requires higher Eb/N0.',
  },
};

/**
 * Exact or tight textbook BER calculation as a function of Eb/N0 (in dB)
 */
export function computeBer(scheme: DigitalModScheme, ebNoDb: number): number {
  const gamma = dbToLinear(ebNoDb);
  switch (scheme) {
    case 'ask':
      return qFunction(Math.sqrt(gamma));
    case 'bpsk':
    case 'qpsk':
    case 'msk':
      return qFunction(Math.sqrt(2 * gamma));
    case 'dpsk':
      return 0.5 * Math.exp(-gamma);
    case 'bfsk_coh':
      return qFunction(Math.sqrt(gamma));
    case 'bfsk_noncoh':
      return 0.5 * Math.exp(-0.5 * gamma);
    case 'qam16':
      return 0.75 * qFunction(Math.sqrt(0.8 * gamma));
    default:
      return qFunction(Math.sqrt(2 * gamma));
  }
}

export function formatSci(val: number): string {
  if (val === 0) return '0.00';
  if (val < 1e-12) return '< 1.00×10⁻¹²';
  if (val >= 0.001) return val.toFixed(4);
  const exp = Math.floor(Math.log10(val));
  const mant = val / Math.pow(10, exp);
  return `${mant.toFixed(2)}e${exp}`;
}

/**
 * Deterministic pseudo-random Gaussian noise generator (Box-Muller with seed)
 * so constellation scatter updates cleanly without chaotic flicker.
 */
export function seededGaussian(seed: number): [number, number] {
  const u1 = Math.max(1e-7, ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1);
  const u2 = ((Math.sin((seed + 1.37) * 78.233) * 43758.5453) % 1 + 1) % 1;
  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

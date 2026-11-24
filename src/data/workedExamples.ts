import { SyllabusModule, WorkedExample } from '../types/ece423';

export const WORKED_EXAMPLES: WorkedExample[] = [
  // MODULE 1: PCM SYSTEMS
  {
    id: 'ex-pcm-1',
    module: SyllabusModule.PCM,
    title: 'Nyquist Guard Band, Bit Rate & Uniform SQNR',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'An analog signal bandlimited to 4 kHz is sampled at 25% above the Nyquist rate and uniformly quantized using 256 levels. Calculate (a) the sampling frequency, (b) the PCM bit rate, (c) the minimum null-to-null baseband bandwidth using Polar NRZ, and (d) the peak sinusoidal SQNR in dB.',
    given: ['fm = 4 kHz', 'Oversampling = 25% above Nyquist', 'L = 256 quantization levels'],
    find: ['fs (kHz)', 'Rb (kbps)', 'Baseband Bandwidth B (kHz)', 'SQNR (dB)'],
    governingEquations: [
      'f_Nyquist = 2 · fm',
      'n = log2(L)',
      'Rb = n · fs',
      'SQNR_dB = 6.02·n + 1.76 dB',
    ],
    steps: [
      {
        label: '1. Find Nyquist rate and actual sampling frequency',
        calculation: 'f_Nyq = 2 × 4 kHz = 8 kHz  →  fs = 1.25 × 8 kHz = 10 kHz',
      },
      {
        label: '2. Determine bits per sample (n)',
        calculation: 'n = log2(256) = 8 bits/sample',
      },
      {
        label: '3. Compute PCM bit rate (Rb) and NRZ bandwidth',
        calculation: 'Rb = 8 × 10 kHz = 80 kbps  →  B_NRZ (null-to-null) = Rb = 80 kHz (min Nyquist BW = Rb/2 = 40 kHz)',
        note: 'State whether you are quoting Nyquist minimum bandwidth (Rb/2) or Polar NRZ first-null bandwidth (Rb).',
      },
      {
        label: '4. Compute peak sinusoidal SQNR',
        calculation: 'SQNR = 6.02(8) + 1.76 = 48.16 + 1.76 = 49.92 dB',
      },
    ],
    finalAnswer: 'fs = 10 kHz, Rb = 80 kbps, B_min = 40 kHz (80 kHz null-to-null), SQNR = 49.92 dB',
    examTrap: 'Do not confuse Nyquist sampling rate (2·fm) with Nyquist minimum pulse bandwidth (Rb/2). Also watch "+25% above Nyquist" vs "25% guard band on fm".',
  },
  {
    id: 'ex-pcm-2',
    module: SyllabusModule.PCM,
    title: 'TDM Frame Multiplexing & Synchronization Overhead',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'Twenty-four voice channels, each bandlimited to 3.4 kHz, are sampled at 8 kHz and encoded into 8-bit PCM words. One synchronization framing bit is appended to every TDM frame. Determine (a) bits per TDM frame, (b) frame duration, (c) aggregate TDM line bit rate, and (d) individual bit duration.',
    given: ['N_ch = 24 channels', 'fs = 8 kHz', 'n = 8 bits/channel', 'Sync bits/frame = 1'],
    find: ['Bits/frame', 'Frame duration Tf', 'Line bit rate Rb', 'Bit duration Tb'],
    governingEquations: [
      'Bits/frame = (N_ch · n) + N_sync',
      'Tf = 1 / fs',
      'Rb = (Bits/frame) × fs',
      'Tb = 1 / Rb',
    ],
    steps: [
      {
        label: '1. Total bits inside one TDM frame',
        calculation: 'Bits/frame = (24 × 8) + 1 = 192 + 1 = 193 bits/frame',
      },
      {
        label: '2. Frame duration (sampling period)',
        calculation: 'Tf = 1 / 8,000 Hz = 125 μs',
      },
      {
        label: '3. Aggregate TDM bit rate (North American T1 DS1)',
        calculation: 'Rb = 193 bits/frame × 8,000 frames/s = 1,544,000 bps = 1.544 Mbps',
      },
      {
        label: '4. Duration of a single transmitted bit',
        calculation: 'Tb = 1 / 1.544 Mbps = 0.6477 μs ≈ 648 ns',
      },
    ],
    finalAnswer: '193 bits/frame · Tf = 125 μs · Rb = 1.544 Mbps · Tb = 647.7 ns',
    examTrap: 'Students frequently forget to add the framing/sync bit before multiplying by fs, giving 1.536 Mbps instead of 1.544 Mbps.',
  },
  {
    id: 'ex-pcm-3',
    module: SyllabusModule.PCM,
    title: 'μ-Law Companding Compression Output',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'A PCM compressor uses μ-Law companding with μ = 255. Compute the normalized compressed output y for two normalized inputs: (a) a weak speech sample x = 0.05 and (b) a strong peak sample x = -0.80. Compare the effective gain given to the weak signal.',
    given: ['μ = 255', 'x1 = +0.05', 'x2 = -0.80'],
    find: ['y1', 'y2', 'Weak-signal amplitude boost ratio'],
    governingEquations: [
      'y = sgn(x) · ln(1 + μ|x|) / ln(1 + μ)',
    ],
    steps: [
      {
        label: '1. Compute denominator ln(1 + μ)',
        calculation: 'ln(1 + 255) = ln(256) = 5.5452',
      },
      {
        label: '2. Evaluate weak input x1 = 0.05',
        calculation: 'y1 = +ln(1 + 255 × 0.05) / 5.5452 = ln(13.75) / 5.5452 = 2.6210 / 5.5452 = +0.4727',
        note: '5% of full-scale input occupies 47.3% of the quantizer range!',
      },
      {
        label: '3. Evaluate strong input x2 = -0.80',
        calculation: 'y2 = -ln(1 + 255 × 0.80) / 5.5452 = -ln(205) / 5.5452 = -5.3230 / 5.5452 = -0.9599',
      },
      {
        label: '4. Weak-signal amplification factor',
        calculation: 'Gain = |y1 / x1| = 0.4727 / 0.05 = 9.45× (+19.5 dB step resolution boost)',
      },
    ],
    finalAnswer: 'y1 = +0.4727 · y2 = -0.9599 · Weak-signal gain = 9.45×',
    examTrap: 'Always preserve the sign sgn(x) and use natural logarithm (ln), or ensure the same log base in both numerator and denominator.',
  },
  {
    id: 'ex-pcm-4',
    module: SyllabusModule.PCM,
    title: 'Overall PCM SNR with Channel Bit Errors (Threshold Effect)',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'An 8-bit uniform PCM system carries a full-scale sinusoidal signal over a noisy binary link with bit error probability Pe = 10⁻⁴. Compute (a) the ideal quantization-only SQNR, (b) the overall output SNR including transmission errors, and (c) the SNR degradation in dB.',
    given: ['n = 8 bits', 'Pe = 10⁻⁴'],
    find: ['SQNR_only (dB)', 'SNR_overall (dB)', 'Degradation (dB)'],
    governingEquations: [
      'SQNR_dB = 6.02n + 1.76',
      'SNR_overall = 1.5 / (2^(-2n) + 4·Pe)',
    ],
    steps: [
      {
        label: '1. Quantization-only SQNR',
        calculation: 'SQNR_dB = 6.02(8) + 1.76 = 49.92 dB (linear = 98,304)',
      },
      {
        label: '2. Compute quantization term vs bit-error term',
        calculation: '2^(-2×8) = 2^(-16) = 1.5259 × 10⁻⁵   |   4·Pe = 4 × 10⁻⁴ = 4.0 × 10⁻⁴',
        note: 'Notice 4·Pe is 26× larger than 2^(-2n)—channel noise now dominates!',
      },
      {
        label: '3. Overall output SNR',
        calculation: 'SNR_overall = 1.5 / (1.5259e-5 + 4.0e-4) = 1.5 / 4.1526e-4 = 3,612.2  →  10·log10(3612.2) = 35.58 dB',
      },
      {
        label: '4. Threshold degradation',
        calculation: 'Loss = 49.92 - 35.58 = 14.34 dB drop because Pe > 10⁻⁵ (past PCM threshold)',
      },
    ],
    finalAnswer: 'SQNR = 49.92 dB · Overall SNR = 35.58 dB · Loss = 14.34 dB (Threshold violated)',
    examTrap: 'To prevent threshold collapse in 8-bit PCM, Pe must satisfy 4·Pe << 2⁻¹⁶, meaning Pe < 10⁻⁶.',
  },

  // MODULE 2: COMPRESSION TECHNIQUES
  {
    id: 'ex-comp-1',
    module: SyllabusModule.COMPRESSION,
    title: 'Shannon-Hartley Capacity & Bandwidth-SNR Trade-off',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'A telephone channel has a bandwidth of 3.4 kHz and an average signal-to-noise ratio of 30 dB. (a) What is the theoretical Shannon channel capacity? (b) If the bandwidth is reduced to 2 kHz, what SNR (in dB) is needed to maintain the same capacity?',
    given: ['B1 = 3.4 kHz', 'SNR1_dB = 30 dB', 'B2 = 2.0 kHz'],
    find: ['C (kbps)', 'Required SNR2 (dB)'],
    governingEquations: [
      'S/N (linear) = 10^(SNR_dB / 10)',
      'C = B · log2(1 + S/N)',
    ],
    steps: [
      {
        label: '1. Convert SNR from dB to linear power ratio',
        calculation: 'S/N = 10^(30/10) = 10³ = 1,000',
      },
      {
        label: '2. Compute Shannon capacity C',
        calculation: 'C = 3,400 × log2(1 + 1000) = 3,400 × 9.9672 = 33,888.6 bps ≈ 33.89 kbps',
      },
      {
        label: '3. Solve for new linear SNR at B2 = 2 kHz',
        calculation: '33,888.6 = 2,000 × log2(1 + SNR2)  →  log2(1 + SNR2) = 16.9443  →  1 + SNR2 = 2^16.9443 = 126,105',
      },
      {
        label: '4. Convert required SNR2 back to dB',
        calculation: 'SNR2_dB = 10 · log10(126,104) = 51.01 dB',
      },
    ],
    finalAnswer: 'C = 33.89 kbps · Required SNR2 = 51.01 dB',
    examTrap: 'Never plug SNR in dB directly into log2(1 + S/N). Always convert dB → linear first!',
  },
  {
    id: 'ex-comp-2',
    module: SyllabusModule.COMPRESSION,
    title: 'Delta Modulation: Avoiding Slope Overload',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'A sinusoidal test signal m(t) = 2·cos(2π·1000·t) Volts is encoded using a Delta Modulator operating at fs = 32 kHz. (a) Find the minimum step size Δ required to avoid slope overload distortion. (b) If Δ = 0.5 V, calculate the granular quantization noise power and signal-to-quantization-noise ratio (assume LPF bandwidth W = 4 kHz).',
    given: ['Am = 2 V', 'fm = 1,000 Hz', 'fs = 32,000 Hz', 'W = 4,000 Hz'],
    find: ['Δ_min (V)', 'Granular Noise Power Nq', 'DM SNR (dB)'],
    governingEquations: [
      '|dm(t)/dt|_max = 2π · fm · Am',
      'No slope overload: Δ · fs >= 2π · fm · Am',
      'DM SNR = (3 · fs³) / (8π² · fm² · W)   [at Δ = Δ_min]',
    ],
    steps: [
      {
        label: '1. Maximum signal slope',
        calculation: '|dm/dt|_max = 2π × 1000 × 2 = 4000π ≈ 12,566.4 V/s',
      },
      {
        label: '2. Minimum step size Δ_min',
        calculation: 'Δ_min = 12,566.4 / 32,000 = 0.3927 V',
      },
      {
        label: '3. In-band granular noise power for Δ = 0.5 V',
        calculation: 'Nq = (Δ² · W) / (3 · fs) = (0.25 × 4000) / (3 × 32000) = 1000 / 96000 = 0.01042 V²',
        note: 'Total unfiltered noise power is Δ²/3 = 0.0833 V²; LPF reduces it by factor W/fs.',
      },
      {
        label: '4. Output DM SNR',
        calculation: 'S = Am² / 2 = 2 V²  →  SNR = 2 / 0.01042 = 192  →  10·log10(192) = 22.83 dB',
      },
    ],
    finalAnswer: 'Δ_min = 0.3927 V · Nq = 0.01042 V² · SNR = 22.83 dB',
    examTrap: 'Remember the baseband low-pass filter factor (W / fs) when computing output DM noise power, and verify fs is in Hz (not rad/s).',
  },
  {
    id: 'ex-comp-3',
    module: SyllabusModule.COMPRESSION,
    title: 'DPCM Prediction Gain & Bit-Rate Reduction',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'A speech signal with variance σ_x² = 4.0 V² has normalized first-order autocorrelation R(1)/R(0) = 0.85. A 1-tap DPCM predictor x̂[k] = a1·x[k-1] uses optimal weight a1 = 0.85. Calculate (a) the prediction error variance σ_e², (b) the prediction gain Gp in dB, and (c) how many bits per sample DPCM saves compared to PCM at equal SNR.',
    given: ['σ_x² = 4.0 V²', 'ρ1 = 0.85', 'a1 = 0.85'],
    find: ['σ_e²', 'Gp (dB)', 'Bits saved per sample'],
    governingEquations: [
      'σ_e² = σ_x² · (1 - ρ1²)',
      'Gp = σ_x² / σ_e²',
      'Bits saved ≈ Gp_dB / 6.02',
    ],
    steps: [
      {
        label: '1. Compute prediction error variance',
        calculation: 'σ_e² = 4.0 × (1 - 0.85²) = 4.0 × (1 - 0.7225) = 4.0 × 0.2775 = 1.11 V²',
      },
      {
        label: '2. Compute prediction gain Gp',
        calculation: 'Gp = 4.0 / 1.11 = 3.6036  →  Gp_dB = 10·log10(3.6036) = 5.57 dB',
      },
      {
        label: '3. Equivalent bit savings',
        calculation: 'Δn ≈ 5.57 / 6.02 ≈ 0.93 bits/sample (≈ 1 bit saved for 1-tap; multi-tap speech saves 2–3 bits)',
      },
    ],
    finalAnswer: 'σ_e² = 1.11 V² · Gp = 5.57 dB · Saves ≈ 1 bit/sample',
    examTrap: 'High correlation (ρ → 1) makes (1 - ρ²) very small, dramatically boosting prediction gain Gp.',
  },
  {
    id: 'ex-comp-4',
    module: SyllabusModule.COMPRESSION,
    title: 'Non-Waveform Coding Bit-Budget Comparison (LPC vs PCM)',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'Compare standard 64 kbps PCM against an LPC-10 vocoder transmitting 10 filter coefficients, 1 gain parameter, and 1 pitch/voiced flag every 22.5 ms frame using 54 bits per frame. Compute (a) the LPC bit rate and (b) the compression ratio.',
    given: ['R_PCM = 64,000 bps', 'LPC frame = 54 bits', 'Frame interval = 22.5 ms'],
    find: ['R_LPC (bps)', 'Compression Ratio'],
    governingEquations: [
      'R_LPC = Bits_per_frame / T_frame',
      'Compression Ratio = R_PCM / R_LPC',
    ],
    steps: [
      {
        label: '1. Calculate LPC-10 output bit rate',
        calculation: 'R_LPC = 54 bits / 0.0225 s = 2,400 bps = 2.4 kbps',
      },
      {
        label: '2. Calculate compression ratio',
        calculation: 'CR = 64,000 / 2,400 = 26.67 : 1',
      },
    ],
    finalAnswer: 'R_LPC = 2.4 kbps · Compression Ratio = 26.7 : 1',
    examTrap: 'Non-waveform coders (LPC/CELP) discard exact time-domain waveform fidelity and instead transmit vocal-tract synthesis parameters.',
  },

  // MODULE 3: DIGITAL MODULATION SCHEMES
  {
    id: 'ex-mod-1',
    module: SyllabusModule.MODULATION,
    title: 'QPSK vs 16-QAM Bandwidth & Spectral Efficiency',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'A digital microwave link must transmit Rb = 24 Mbps. Calculate the symbol rate (baud), null-to-null RF bandwidth, and spectral efficiency η if the link uses (a) BPSK, (b) QPSK, and (c) 16-QAM.',
    given: ['Rb = 24 Mbps'],
    find: ['Symbol rate Rs', 'Null-to-null bandwidth B = 2·Rs', 'Spectral efficiency η = Rb / B'],
    governingEquations: [
      'Rs = Rb / k, where k = log2(M)',
      'B_null = 2 · Rs = 2·Rb / k',
      'η = Rb / B_null = k / 2  (or Rb / B_nyquist = k)',
    ],
    steps: [
      {
        label: '1. BPSK (M = 2, k = 1 bit/symbol)',
        calculation: 'Rs = 24 MBaud · B_null = 2 × 24 = 48 MHz · η = 24 / 48 = 0.5 bps/Hz (Nyquist η = 1.0)',
      },
      {
        label: '2. QPSK (M = 4, k = 2 bits/symbol)',
        calculation: 'Rs = 24 / 2 = 12 MBaud · B_null = 2 × 12 = 24 MHz · η = 24 / 24 = 1.0 bps/Hz (Nyquist η = 2.0)',
      },
      {
        label: '3. 16-QAM (M = 16, k = 4 bits/symbol)',
        calculation: 'Rs = 24 / 4 = 6 MBaud · B_null = 2 × 6 = 12 MHz · η = 24 / 12 = 2.0 bps/Hz (Nyquist η = 4.0)',
      },
    ],
    finalAnswer: 'BPSK: 48 MHz (0.5 bps/Hz) · QPSK: 24 MHz (1.0 bps/Hz) · 16-QAM: 12 MHz (2.0 bps/Hz)',
    examTrap: 'Always clarify whether bandwidth is Null-to-Null (2·Rs) or Ideal Nyquist / Raised-Cosine α=0 (Rs).',
  },
  {
    id: 'ex-mod-2',
    module: SyllabusModule.MODULATION,
    title: 'Bit Error Rate Comparison at Eb/N0 = 10 dB',
    catRelevance: 'CAT High-Yield',
    problemStatement:
      'A binary digital link operates at Eb/N0 = 10 dB. Evaluate the bit error probability Pb for (a) Coherent BPSK, (b) Differential PSK (DPSK), and (c) Non-Coherent BFSK. Given Q(3.162) ≈ 7.8 × 10⁻⁴ and Q(4.472) ≈ 3.87 × 10⁻⁶.',
    given: ['Eb/N0 = 10 dB → γb = 10¹ = 10'],
    find: ['Pb(BPSK)', 'Pb(DPSK)', 'Pb(Non-Coherent BFSK)'],
    governingEquations: [
      'BPSK: Pb = Q(√(2·γb))',
      'DPSK: Pb = 0.5 · exp(-γb)',
      'NC-BFSK: Pb = 0.5 · exp(-γb / 2)',
    ],
    steps: [
      {
        label: '1. Coherent BPSK',
        calculation: '√(2·10) = √20 = 4.472  →  Pb = Q(4.472) ≈ 3.87 × 10⁻⁶',
      },
      {
        label: '2. DPSK (Differential Non-Coherent)',
        calculation: 'Pb = 0.5 · e^(-10) = 0.5 × 4.54 × 10⁻⁵ = 2.27 × 10⁻⁵',
      },
      {
        label: '3. Non-Coherent BFSK',
        calculation: 'Pb = 0.5 · e^(-10/2) = 0.5 · e^(-5) = 0.5 × 6.738 × 10⁻³ = 3.37 × 10⁻³',
      },
    ],
    finalAnswer: 'BPSK: 3.87×10⁻⁶ · DPSK: 2.27×10⁻⁵ · NC-BFSK: 3.37×10⁻³',
    examTrap: 'Do not substitute Eb/N0 = 10 dB directly without converting 10 dB → linear 10! At 10 dB, BPSK is nearly 1000× more reliable than Non-Coherent BFSK.',
  },
  {
    id: 'ex-mod-3',
    module: SyllabusModule.MODULATION,
    title: 'Minimum Shift Keying (MSK) Carrier Spacing & Bandwidth',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'An MSK transmitter sends data at Rb = 1.2 Mbps around a center carrier fc = 900 MHz. Determine (a) the two signaling frequencies f1 and f2, (b) the modulation index h, and (c) the null-to-null mainlobe bandwidth.',
    given: ['Rb = 1.2 Mbps', 'fc = 900 MHz'],
    find: ['f1 and f2', 'Modulation index h', 'Null-to-null bandwidth'],
    governingEquations: [
      'MSK frequency separation Δf = f2 - f1 = Rb / 2  (h = 0.5)',
      'f1 = fc - Rb/4,  f2 = fc + Rb/4',
      'B_null (MSK) = 1.5 · Rb',
    ],
    steps: [
      {
        label: '1. Frequency deviation & modulation index',
        calculation: 'Peak deviation = Rb / 4 = 1.2 MHz / 4 = 300 kHz  →  Δf = 600 kHz  →  h = Δf / Rb = 0.5',
      },
      {
        label: '2. Mark and Space frequencies',
        calculation: 'f1 = 900 MHz - 0.3 MHz = 899.7 MHz   |   f2 = 900 MHz + 0.3 MHz = 900.3 MHz',
      },
      {
        label: '3. Null-to-null mainlobe bandwidth',
        calculation: 'B_null = 1.5 × 1.2 MHz = 1.8 MHz (99% power contained in 1.18·Rb = 1.416 MHz)',
      },
    ],
    finalAnswer: 'f1 = 899.7 MHz, f2 = 900.3 MHz · h = 0.5 · B_null = 1.8 MHz',
    examTrap: 'Coherent BFSK requires h = 0.5 minimum orthogonality, and MSK achieves it with continuous phase—giving BPSK BER and faster sidelobe decay (1/f⁴ vs 1/f²).',
  },
  {
    id: 'ex-mod-4',
    module: SyllabusModule.MODULATION,
    title: 'Matched Filter Receiver Peak SNR & Sampling Instant',
    catRelevance: 'Final Exam Core',
    problemStatement:
      'A polar baseband pulse of amplitude A = 2 V and duration Tb = 10 μs is transmitted over an AWGN channel with two-sided PSD N0/2 = 10⁻⁸ W/Hz. Find (a) the bit energy Eb, (b) the maximum output SNR of a matched filter at t = Tb, and (c) the resulting bit error probability Pb.',
    given: ['A = 2 V', 'Tb = 10 μs', 'N0/2 = 10⁻⁸ W/Hz → N0 = 2×10⁻⁸ W/Hz'],
    find: ['Eb (J)', 'Max Matched Filter SNR_max', 'Pb'],
    governingEquations: [
      'Eb = A² · Tb',
      '(S/N)_max = 2·Eb / N0',
      'Pb = Q(√(2·Eb / N0))',
    ],
    steps: [
      {
        label: '1. Compute bit energy Eb',
        calculation: 'Eb = (2)² × (10 × 10⁻⁶) = 4 × 10⁻⁵ J = 40 μJ',
      },
      {
        label: '2. Compute maximum matched filter SNR at t = Tb',
        calculation: 'SNR_max = (2 × 4×10⁻⁵) / (2×10⁻⁸) = 4,000  (36.02 dB)',
        note: 'Wait: argument inside Q(·) is √(2·Eb/N0) = √4000? Let us check realistic scale: if N0/2 = 10⁻⁶ W/Hz then SNR_max = 40. Here with N0/2 = 10⁻⁸, Eb/N0 = 2000.',
      },
      {
        label: '3. Compute error probability',
        calculation: 'Pb = Q(√4000) = Q(63.2) ≈ 0 (virtually error-free; thermal noise negligible)',
      },
    ],
    finalAnswer: 'Eb = 40 μJ · SNR_max = 4,000 (36.02 dB) · Pb < 10⁻¹²',
    examTrap: 'Remember N0/2 is the TWO-SIDED noise PSD, so N0 = 2 × (N0/2). Mixing up N0 and N0/2 causes a 3 dB error.',
  },
];

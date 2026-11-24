import { LabType, SyllabusModule, SyllabusTopic } from '../types/ece423';

export const MODULE_META: Record<
  SyllabusModule,
  { title: string; subtitle: string; weightNote: string }
> = {
  [SyllabusModule.PCM]: {
    title: '01. PCM Systems & Synchronization',
    subtitle: 'Sampling, Quantization, Companding, TDM, Noise & Line Coding',
    weightNote: 'High CAT Probability · Numerical Core',
  },
  [SyllabusModule.COMPRESSION]: {
    title: '02. Compression & Information Theory',
    subtitle: 'Shannon Capacity, DPCM, DM, ADPCM, LPC, CELP, JPEG & MPEG',
    weightNote: 'Derivations & Comparative Schemes',
  },
  [SyllabusModule.MODULATION]: {
    title: '03. Digital Modulation & Detection',
    subtitle: 'ASK, PSK, FSK, QPSK, DPSK, MSK, QAM, Receivers & BER',
    weightNote: 'Constellations, Bandwidth & Error Rates',
  },
};

export const STUDY_METHOD_STEPS = [
  {
    step: '1. Lock the Core Equations First (30 min)',
    detail:
      'In ECE 423 CATs, 60–70% of marks come from Nyquist/TDM bit rates, SQNR = 6.02n + 1.76 dB, DM slope-overload threshold, Shannon capacity, and M-ary bandwidth/BER substitutions. Memorize the physical meaning of every variable before grinding problems.',
  },
  {
    step: '2. Visual Intuition via Simulation (45 min)',
    detail:
      'Use the Signal Labs tab to force aliasing (fs < 2fm), trigger DM slope overload, and scatter QAM constellations with noise. Seeing why a failure happens prevents sign errors and factor-of-2 mistakes in exams.',
  },
  {
    step: '3. Solve Without Looking at Solutions (60 min)',
    detail:
      'Attempt the 12 worked examples on paper first using the Given/Find prompt, then check step-by-step derivations and exam traps in the Solver tab.',
  },
  {
    step: '4. Simulate CAT Time Pressure (20 min)',
    detail:
      'Take the 15-question CAT Sprint under the 20-minute timer. Review every missed derivation immediately and re-drill weak topics.',
  },
];

export const TONIGHT_CAT_TIMELINE = [
  {
    block: 'Block 1 · 60 min',
    focus: 'PCM Systems & Line Coding',
    tasks: [
      'Derive bit rate Rb = n · fs and minimum Nyquist rate fs >= 2W (watch guard bands!).',
      'Drill SQNR = 6.02n + 1.76 dB (or + 4.77 dB for full-scale peak/uniform RMS) and overall SNR with Pe.',
      'Practice T1/E1 TDM frame bit rate calculations including framing/sync bits.',
      'Sketch Unipolar NRZ, Polar NRZ, RZ, Manchester, and Bipolar AMI for any 8-bit sequence.',
    ],
  },
  {
    block: 'Block 2 · 50 min',
    focus: 'Shannon, DPCM & Delta Modulation',
    tasks: [
      'Apply C = B · log2(1 + S/N) and trade off bandwidth vs SNR cleanly.',
      'Check the DM no-slope-overload rule: Δ · fs >= 2π · fm · Am (and granular noise Δ²/3).',
      'Contrast PCM, DPCM, ADPCM, and DM on bit rate, prediction filter, and complexity.',
      'Review key non-waveform concepts: LPC vocal-tract filter, CELP codebook, JPEG DCT, MPEG motion compensation.',
    ],
  },
  {
    block: 'Block 3 · 50 min',
    focus: 'Digital Modulation & Error Performance',
    tasks: [
      'Memorize spectral efficiency η = Rb / B and null-to-null bandwidth for BPSK, QPSK, BFSK, MSK, 16-QAM.',
      'Compare coherent (matched filter / correlator) vs non-coherent (envelope / differential) receivers.',
      'Rank error performance at fixed Eb/N0: BPSK = QPSK = MSK > DPSK > Coh-BFSK = ASK > NonCoh-BFSK.',
    ],
  },
  {
    block: 'Block 4 · 25 min',
    focus: 'Timed CAT Sprint & Mistake Audit',
    tasks: [
      'Complete the 15-question CAT Sprint in the Timed Quiz tab without notes.',
      'Audit any missed question formula hints and sleep well—fatigue causes unit conversion errors.',
    ],
  },
];

export const FOUR_WEEK_EXAM_PLAN = [
  {
    week: 'Week 1 · PCM & Multiplexing Deep Dive',
    goal: 'Master derivations & synchronization hardware',
    deliverables: [
      'Derive uniform quantization noise power Δ²/12 from probability density function.',
      'Calculate μ-Law (μ=255) and A-Law (A=87.6) step compression and weak-signal SNR gain.',
      'Understand bit sync (PLL/early-late gate), word sync, frame alignment words, and bit-stuffing in PDH/TDM.',
      'Analyze PCM threshold effect: why SNR collapses sharply when Pe rises above ~10⁻⁵.',
    ],
  },
  {
    week: 'Week 2 · Information Theory & Predictive Coding',
    goal: 'Connect prediction gain to speech/image/video standards',
    deliverables: [
      'Derive Shannon-Hartley limit (Eb/N0 >= -1.59 dB as B -> ∞).',
      'Compute prediction filter coefficients and DPCM SNR improvement G_p = σ_x² / σ_e².',
      'Derive optimal DM output SNR = (3·fs³) / (8π²·fm²·W) and compare ADPCM (G.726 32 kbps).',
      'Map non-waveform coding blocks: LPC-10 (2.4 kbps), CELP (4.8–16 kbps), JPEG (8×8 DCT + Huffman), MPEG (I/P/B frames).',
    ],
  },
  {
    week: 'Week 3 · Bandpass Modulation & Receiver Design',
    goal: 'Master constellations, PSDs, and matched-filter receivers',
    deliverables: [
      'Draw block diagrams for coherent correlator/matched filter and Costas loop carrier recovery.',
      'Derive QPSK and MSK pulse shaping, phase continuity, and 99% power bandwidth.',
      'Calculate symbol error rate Ps vs bit error rate Pb for Gray-coded M-PSK and M-QAM.',
    ],
  },
  {
    week: 'Week 4 · Full-Exam Integration & Speed Drills',
    goal: 'Score 85%+ across 30-question timed mocks',
    deliverables: [
      'Complete 3 full 45-minute mock exams in the Timed Quiz simulator.',
      'Solve mixed-system problems (e.g., voice -> 8-bit μ-law PCM -> TDM -> QPSK link budget & BER).',
      'Verify every unit conversion (kbps vs kHz, dB vs linear ratio, Pe vs Eb/N0) without hesitation.',
    ],
  },
];

export const SYLLABUS_TOPICS: SyllabusTopic[] = [
  // Module 1: PCM Systems
  {
    id: 'pcm-nyquist',
    module: SyllabusModule.PCM,
    title: 'Sampling Theorem (Nyquist) & Aliasing',
    keyFormula: 'fs >= 2·fm (Nyquist rate = 2·W)',
    catPriority: 'Critical',
    summary: 'Bandlimited signals require sampling above twice the highest frequency component; guard bands account for practical non-ideal reconstruction filters.',
    recommendedLab: LabType.SAMPLING_PCM,
    recommendedCalc: 'pcm_snr',
  },
  {
    id: 'pcm-quantization',
    module: SyllabusModule.PCM,
    title: 'Uniform Quantization, Encoding & SQNR',
    keyFormula: 'SQNR_dB = 6.02·n + 1.76 dB (sine)',
    catPriority: 'Critical',
    summary: 'Maps continuous samples to L = 2^n levels separated by Δ = 2Vp/L. Noise power is Δ²/12; each extra bit adds +6.02 dB SQNR.',
    recommendedLab: LabType.SAMPLING_PCM,
    recommendedCalc: 'pcm_snr',
  },
  {
    id: 'pcm-companding',
    module: SyllabusModule.PCM,
    title: 'Companding (μ-Law & A-Law)',
    keyFormula: 'y = sgn(x)·ln(1+μ|x|)/ln(1+μ)',
    catPriority: 'High',
    summary: 'Non-uniform quantization compresses large amplitudes and expands small amplitudes (μ=255 North America/Japan, A=87.6 Europe/ITU) to maintain constant SNR across wide dynamic range.',
    recommendedLab: LabType.COMPANDING,
    recommendedCalc: 'companding',
  },
  {
    id: 'pcm-tdm',
    module: SyllabusModule.PCM,
    title: 'TDM Frame, Multiplexing & Synchronization',
    keyFormula: 'Rb = N_ch · n · fs + R_sync',
    catPriority: 'Critical',
    summary: 'Interleaves multiple PCM channels per 125 μs frame (T1: 24 ch + 1 sync bit = 193 bits → 1.544 Mbps; E1: 32 slots → 2.048 Mbps). Requires bit, word, and frame sync.',
    recommendedCalc: 'tdm_frame',
  },
  {
    id: 'pcm-noise-threshold',
    module: SyllabusModule.PCM,
    title: 'Transmission Noise, Overall SNR & Threshold Effect',
    keyFormula: 'SNR_o = 1.5 / (2^(-2n) + 4·Pe)',
    catPriority: 'High',
    summary: 'Combines quantization noise with channel bit-error noise. Above threshold (Eb/N0 ~ 11 dB, Pe < 10⁻⁵) quantization dominates; below threshold, bit errors cause rapid SNR collapse.',
    recommendedCalc: 'pcm_snr',
  },
  {
    id: 'pcm-line-coding',
    module: SyllabusModule.PCM,
    title: 'Line Coding (NRZ, RZ, Manchester, AMI)',
    keyFormula: 'Manchester BW = 2·Rb, Zero DC',
    catPriority: 'Critical',
    summary: 'Baseband pulse shaping balances DC elimination, clock recovery (bit sync), error detection (bipolar violations), and transmission bandwidth.',
    recommendedLab: LabType.LINE_CODING,
  },

  // Module 2: Compression Techniques
  {
    id: 'comp-shannon',
    module: SyllabusModule.COMPRESSION,
    title: "Shannon's Law & Channel Capacity",
    keyFormula: 'C = B · log2(1 + S/N) bps',
    catPriority: 'Critical',
    summary: 'Sets the theoretical maximum error-free data rate for an AWGN channel of bandwidth B and signal-to-noise ratio S/N. Ultimate limit: Eb/N0 >= -1.59 dB.',
    recommendedCalc: 'shannon',
  },
  {
    id: 'comp-dpcm',
    module: SyllabusModule.COMPRESSION,
    title: 'Prediction Filters & Differential PCM (DPCM)',
    keyFormula: 'SNR_DPCM = G_p · SNR_PCM',
    catPriority: 'High',
    summary: 'Exploits sample-to-sample correlation by quantizing only the prediction error e[k] = x[k] - x̂[k], achieving prediction gain G_p with fewer bits per sample.',
  },
  {
    id: 'comp-dm',
    module: SyllabusModule.COMPRESSION,
    title: 'Delta Modulation (DM), Slope Overload & Granular Noise',
    keyFormula: 'Δ · fs >= 2π · fm · Am',
    catPriority: 'Critical',
    summary: '1-bit DPCM tracker. Too small Δ causes slope overload distortion; too large Δ causes granular quantization noise on flat segments.',
    recommendedLab: LabType.DELTA_MOD,
    recommendedCalc: 'delta_mod',
  },
  {
    id: 'comp-adaptive',
    module: SyllabusModule.COMPRESSION,
    title: 'Adaptive Coding (ADPCM & ADM)',
    keyFormula: 'G.726 ADPCM: 32 kbps (4 bits/sample)',
    catPriority: 'Exam Core',
    summary: 'Dynamically scales step size Δ[k] and/or predictor coefficients to track non-stationary speech signals, bridging toll-quality voice at half standard PCM bit rate.',
  },
  {
    id: 'comp-nonwaveform',
    module: SyllabusModule.COMPRESSION,
    title: 'Non-Waveform Coding (LPC, CELP, JPEG, MPEG)',
    keyFormula: 'LPC-10: 2.4 kbps · JPEG: 8×8 DCT',
    catPriority: 'Exam Core',
    summary: 'Parametric speech models (LPC vocal tract filter + pitch; CELP excitation codebook) and transform/inter-frame media codecs (JPEG 2D-DCT + quantization + entropy; MPEG I/P/B motion compensation).',
  },

  // Module 3: Digital Modulation Schemes
  {
    id: 'mod-metrics',
    module: SyllabusModule.MODULATION,
    title: 'Modulation Performance Metrics (η, BER, Power Efficiency)',
    keyFormula: 'η = Rb / B (bps/Hz)',
    catPriority: 'Critical',
    summary: 'Evaluates trade-off between spectral efficiency (bits/sec per Hz) and power efficiency (minimum Eb/N0 required for target BER such as 10⁻⁵).',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'mod-binary',
    module: SyllabusModule.MODULATION,
    title: 'Binary Bandpass Schemes (ASK, BPSK, BFSK, DPSK)',
    keyFormula: 'BPSK: Pb = Q(√(2·Eb/N0))',
    catPriority: 'Critical',
    summary: 'Antipodal BPSK yields best binary error rate; DPSK removes carrier recovery via differential phase comparison; BFSK trades wider bandwidth for simple non-coherent detection.',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'mod-mary',
    module: SyllabusModule.MODULATION,
    title: 'Higher-Order & Constant-Envelope (QPSK, MSK, M-QAM)',
    keyFormula: '16-QAM: k = 4 bits/sym, η = 2.0 bps/Hz',
    catPriority: 'High',
    summary: 'QPSK packs 2 bits/sym with BPSK power efficiency; MSK smooths phase transitions with half-sine pulses for compact sidelobes and constant envelope; 16-QAM boosts throughput at higher Eb/N0 cost.',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'mod-receivers',
    module: SyllabusModule.MODULATION,
    title: 'Detection Techniques & Receiver Architectures',
    keyFormula: 'Matched Filter h(t) = s(T - t)',
    catPriority: 'Exam Core',
    summary: 'Coherent correlator/matched filter maximizes output SNR at sampling instant T (requires carrier sync via squaring/Costas loop); non-coherent envelope/differential detectors eliminate phase tracking.',
  },
];

export const COMPRESSION_COMPARISON_ROWS = [
  {
    scheme: 'Standard PCM (G.711)',
    bitsPerSample: '8 bits (64 kbps voice)',
    predictor: 'None (memoryless)',
    stepSize: 'Fixed (or μ/A-Law)',
    keyFailureMode: 'High bit rate; threshold effect below Eb/N0 ≈ 11 dB',
    typicalUse: 'PSTN trunks, uncompressed studio audio',
  },
  {
    scheme: 'DPCM',
    bitsPerSample: '4–6 bits (32–48 kbps)',
    predictor: 'Fixed linear predictor',
    stepSize: 'Fixed uniform',
    keyFailureMode: 'Mismatch if signal statistics drift',
    typicalUse: 'Correlated telemetry, differential audio/image coding',
  },
  {
    scheme: 'ADPCM (G.726)',
    bitsPerSample: '2–5 bits (16–40 kbps)',
    predictor: 'Adaptive predictor',
    stepSize: 'Adaptive step Δ[k]',
    keyFailureMode: 'Higher codec complexity than DM',
    typicalUse: 'DECT cordless voice, VoIP toll-quality trunks',
  },
  {
    scheme: 'Delta Modulation (DM)',
    bitsPerSample: '1 bit (fs >> 2W)',
    predictor: '1-step accumulator',
    stepSize: 'Fixed ±Δ',
    keyFailureMode: 'Slope overload (Δ too small) & granular noise (Δ too big)',
    typicalUse: 'Low-cost voice ADC, tactical/legacy links',
  },
];

export const NON_WAVEFORM_COMPARISON_ROWS = [
  {
    scheme: 'LPC (Linear Predictive Coding)',
    domain: 'Speech (2.4 kbps)',
    mechanism: 'Models vocal tract as all-pole AR filter + voiced/unvoiced switch + pitch period',
    tradeoff: 'Ultra-low bit rate, robotic/synthetic voice quality',
  },
  {
    scheme: 'CELP (Code-Excited LP)',
    domain: 'Speech (4.8–16 kbps)',
    mechanism: 'Combines LPC synthesis filter with stochastic & adaptive excitation codebooks (analysis-by-synthesis)',
    tradeoff: 'Natural conversational voice at low cellular rates (GSM/CDMA)',
  },
  {
    scheme: 'JPEG',
    domain: 'Still Images',
    mechanism: 'YCbCr color transform → 8×8 2D-DCT → perceptual quantization matrix → zig-zag RLE + Huffman',
    tradeoff: 'Blocking artifacts at high compression; exploits spatial redundancy',
  },
  {
    scheme: 'MPEG (1/2/4/H.264)',
    domain: 'Video',
    mechanism: 'Spatial DCT (I-frames) + temporal motion estimation/compensation (P & B macroblocks)',
    tradeoff: 'Dramatic bit-rate reduction; sensitive to frame loss without I-frame refresh',
  },
];

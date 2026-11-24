import { QuizQuestion, SyllabusModule } from '../types/ece423';

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // MODULE 1: PCM SYSTEMS (10 questions, 5 CAT High-Yield)
  {
    id: 'q-pcm-1',
    module: SyllabusModule.PCM,
    topic: 'Sampling Theorem',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'A signal x(t) = 4·cos(2000πt) + 3·sin(6000πt) is sampled uniformly. What is the minimum Nyquist sampling rate to avoid aliasing?',
    options: ['3,000 Hz', '6,000 Hz', '12,000 Hz', '1,500 Hz'],
    correctIndex: 1,
    formulaHint: 'ω_max = 2π·fm  ⇒  fs ≥ 2·fm',
    explanation:
      'The highest angular frequency is 6000π rad/s, so fm = 6000π / (2π) = 3000 Hz. Nyquist rate = 2 × 3000 = 6000 Hz.',
  },
  {
    id: 'q-pcm-2',
    module: SyllabusModule.PCM,
    topic: 'Uniform Quantization',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'Increasing the word length of a uniform PCM encoder from 8 bits to 10 bits increases the sinusoidal SQNR by approximately:',
    options: ['2.0 dB', '6.02 dB', '12.04 dB', '20.0 dB'],
    correctIndex: 2,
    formulaHint: 'SQNR_dB = 6.02·n + 1.76 dB',
    explanation:
      'Each additional bit adds 6.02 dB to SQNR. Adding 2 bits (10 − 8) yields 2 × 6.02 = 12.04 dB improvement.',
  },
  {
    id: 'q-pcm-3',
    module: SyllabusModule.PCM,
    topic: 'TDM Multiplexing',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'A standard E1 (European) PCM frame carries 32 time slots (30 voice + 2 signaling/sync), each using 8 bits, sampled at 8 kHz. What is the total E1 bit rate?',
    options: ['1.544 Mbps', '1.920 Mbps', '2.048 Mbps', '2.560 Mbps'],
    correctIndex: 2,
    formulaHint: 'Rb = Slots × n × fs',
    explanation:
      'Bits/frame = 32 × 8 = 256 bits. Line rate = 256 × 8,000 = 2,048,000 bps = 2.048 Mbps.',
  },
  {
    id: 'q-pcm-4',
    module: SyllabusModule.PCM,
    topic: 'Companding',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Why are μ-Law (μ=255) and A-Law (A=87.6) companders used in digital telephony instead of uniform quantization?',
    options: [
      'To reduce the Nyquist sampling rate below 2·W',
      'To provide smaller quantization steps for weak signals and preserve SNR across wide dynamic range',
      'To eliminate bit errors over noisy RF channels',
      'To double the TDM frame rate without adding bits',
    ],
    correctIndex: 1,
    formulaHint: 'Logarithmic compression boosts small amplitudes prior to uniform quantizer',
    explanation:
      'Speech is mostly low-amplitude. Logarithmic companding allocates finer steps near zero and coarser steps at peaks, keeping SNR nearly constant for quiet and loud talkers.',
  },
  {
    id: 'q-pcm-5',
    module: SyllabusModule.PCM,
    topic: 'Line Coding',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'Which baseband line code guarantees a strictly zero DC component AND a timing transition inside every single bit interval for clock recovery?',
    options: ['Unipolar NRZ', 'Polar NRZ-L', 'Bipolar AMI', 'Manchester (Split-Phase)'],
    correctIndex: 3,
    formulaHint: 'Manchester encodes 1 and 0 as mid-bit transitions',
    explanation:
      'Manchester coding puts a mid-bit edge in every bit period (eliminating DC and ensuring clock sync at 2·Rb bandwidth). Bipolar AMI has zero DC but loses clock sync on long strings of 0s.',
  },
  {
    id: 'q-pcm-6',
    module: SyllabusModule.PCM,
    topic: 'Overall PCM SNR & Threshold',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'In a PCM system operating in the presence of both quantization noise and channel bit errors, the "threshold effect" refers to:',
    options: [
      'Quantizer saturation when input voltage exceeds ±Vp',
      'A sudden sharp drop in output SNR when channel Eb/N0 falls low enough that bit error noise (4·Pe) overtakes quantization noise',
      'Loss of frame sync when sampling below the Nyquist rate',
      'Slope overload when step size Δ is too small',
    ],
    correctIndex: 1,
    formulaHint: 'SNR_o = 1.5 / (2^(-2n) + 4·Pe)',
    explanation:
      'Below ~10–11 dB Eb/N0 (Pe > 10⁻⁵), bit errors in MSB positions cause massive amplitude spikes, causing overall SNR to plummet sharply.',
  },
  {
    id: 'q-pcm-7',
    module: SyllabusModule.PCM,
    topic: 'Synchronization',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'Which synchronization hierarchy level in a digital multiplexer ensures the demultiplexer routes each 8-bit PCM word to the correct subscriber channel?',
    options: ['Carrier phase sync', 'Bit (clock) sync', 'Frame sync', 'Frequency offset sync'],
    correctIndex: 2,
    formulaHint: 'Bit sync extracts clock; Frame sync identifies slot #1 boundary',
    explanation:
      'Bit sync recovers the bit clock Tb, while Frame synchronization detects the unique frame alignment word (FAW) so slots 1..N map to their exact output channels.',
  },
  {
    id: 'q-pcm-8',
    module: SyllabusModule.PCM,
    topic: 'Line Coding',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'In Bipolar AMI line coding, if a receiver observes two consecutive positive pulses (+V, +V) separated by zeros, this indicates:',
    options: [
      'A valid Manchester transition',
      'A single-bit transmission error (bipolar violation)',
      'Zero DC wander',
      'An intentional Nyquist guard band',
    ],
    correctIndex: 1,
    formulaHint: 'AMI marks alternate +V, -V, +V, -V',
    explanation:
      'Valid AMI strictly alternates mark polarities. Two consecutive pulses of the same polarity (unless deliberate B8ZS/HDB3 substitution) flag a transmission error.',
  },
  {
    id: 'q-pcm-9',
    module: SyllabusModule.PCM,
    topic: 'Quantization Noise',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'For a uniform quantizer with step size Δ, assuming the quantization error is uniformly distributed over [-Δ/2, +Δ/2], the mean-square quantization noise power is:',
    options: ['Δ² / 3', 'Δ² / 6', 'Δ² / 12', 'Δ / 2'],
    correctIndex: 2,
    formulaHint: '∫_{-Δ/2}^{Δ/2} (e² / Δ) de = Δ² / 12',
    explanation:
      'Evaluating the second moment of a uniform distribution of width Δ gives variance σ_q² = Δ² / 12.',
  },
  {
    id: 'q-pcm-10',
    module: SyllabusModule.PCM,
    topic: 'PCM Bit Rate',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'An analog signal with bandwidth 5 kHz is sampled at 12 kHz and quantized to 64 levels. What is the required PCM bit rate?',
    options: ['60 kbps', '72 kbps', '96 kbps', '768 kbps'],
    correctIndex: 1,
    formulaHint: 'n = log2(64) = 6 bits; Rb = n × fs',
    explanation: '64 levels require n = log2(64) = 6 bits/sample. Thus Rb = 6 × 12 kHz = 72 kbps.',
  },

  // MODULE 2: COMPRESSION TECHNIQUES (10 questions, 5 CAT High-Yield)
  {
    id: 'q-comp-1',
    module: SyllabusModule.COMPRESSION,
    topic: "Shannon's Law",
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'A channel has bandwidth B = 4 kHz and SNR = 15 (linear, not dB). What is the Shannon channel capacity C?',
    options: ['12 kbps', '16 kbps', '20 kbps', '60 kbps'],
    correctIndex: 1,
    formulaHint: 'C = B · log2(1 + S/N)',
    explanation: 'C = 4,000 × log2(1 + 15) = 4,000 × log2(16) = 4,000 × 4 = 16,000 bps = 16 kbps.',
  },
  {
    id: 'q-comp-2',
    module: SyllabusModule.COMPRESSION,
    topic: 'Delta Modulation',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Slope overload distortion occurs in a Delta Modulator whenever:',
    options: [
      'The step size Δ is much larger than the maximum signal slope',
      'The analog input slope |dm(t)/dt| exceeds the tracker maximum rate Δ · fs',
      'The sampling frequency fs exceeds 10 times the Nyquist rate',
      'The input signal remains constant (DC) for many clock cycles',
    ],
    correctIndex: 1,
    formulaHint: 'Slope overload condition: |dm/dt|_max > Δ · fs',
    explanation:
      'Because DM can only change by ±Δ per sample period Ts = 1/fs, its maximum tracking slew rate is Δ·fs. Steeper input slopes cause the staircase to lag behind.',
  },
  {
    id: 'q-comp-3',
    module: SyllabusModule.COMPRESSION,
    topic: 'Delta Modulation Numerical',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'A Delta Modulator samples a 1 kHz sine wave of amplitude 1 V at fs = 20 kHz. What minimum step size Δ avoids slope overload?',
    options: ['0.157 V', '0.314 V', '0.628 V', '1.00 V'],
    correctIndex: 1,
    formulaHint: 'Δ_min = (2π · fm · Am) / fs',
    explanation:
      'Δ_min = (2π × 1000 × 1) / 20000 = 2000π / 20000 = π / 10 ≈ 0.3142 V.',
  },
  {
    id: 'q-comp-4',
    module: SyllabusModule.COMPRESSION,
    topic: 'DPCM & Prediction',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'Differential PCM (DPCM) achieves a lower bit rate than standard PCM at the same reconstruction SNR primarily because:',
    options: [
      'It drops every second sample before transmission',
      'Adjacent samples are highly correlated, so the prediction error variance σ_e² is smaller than σ_x²',
      'It transmits only the sign of the signal slope',
      'It replaces uniform quantization with Manchester coding',
    ],
    correctIndex: 1,
    formulaHint: 'Gp = σ_x² / σ_e² > 1',
    explanation:
      'Predicting x[k] from past samples leaves a smaller-variance residual e[k] = x[k] - x̂[k], requiring fewer quantization bits for the same step size.',
  },
  {
    id: 'q-comp-5',
    module: SyllabusModule.COMPRESSION,
    topic: 'Non-Waveform Coding',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'Which speech coding technique models the human vocal tract as a linear all-pole filter driven by pitch pulses or white noise, achieving ~2.4 kbps?',
    options: ['G.711 μ-Law PCM', 'Delta Modulation (DM)', 'Linear Predictive Coding (LPC)', 'JPEG Transform Coding'],
    correctIndex: 2,
    formulaHint: 'LPC transmits filter coefficients + pitch/gain instead of waveform samples',
    explanation:
      'LPC is a parametric (non-waveform) vocoder modeling vocal-tract resonances and excitation source parameters at ultra-low bit rates (~2.4 kbps).',
  },
  {
    id: 'q-comp-6',
    module: SyllabusModule.COMPRESSION,
    topic: 'Shannon Limit',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'As channel bandwidth B approaches infinity (B → ∞) for a fixed signal power S, Shannon capacity approaches a finite limit corresponding to minimum Eb/N0 of:',
    options: ['0 dB', '-1.59 dB', '+3.01 dB', '-10 dB'],
    correctIndex: 1,
    formulaHint: 'C_∞ = 1.44 · (S/N0)  ⇒  Eb/N0 ≥ ln(2) = -1.59 dB',
    explanation:
      'In the wideband limit B → ∞, C = (S/N0)·log2(e) ≈ 1.44·S/N0, meaning reliable communication requires Eb/N0 > ln(2) ≈ 0.693 = -1.59 dB.',
  },
  {
    id: 'q-comp-7',
    module: SyllabusModule.COMPRESSION,
    topic: 'ADPCM vs DM',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'How does Adaptive DPCM (ADPCM, e.g., ITU-T G.726) overcome the dynamic range limits of fixed DPCM and DM?',
    options: [
      'By doubling the sampling frequency dynamically',
      'By adapting both the quantizer step size and predictor coefficients to local signal energy',
      'By switching between ASK and QPSK on the fly',
      'By removing the feedback loop at the transmitter',
    ],
    correctIndex: 1,
    formulaHint: 'Adaptive step Δ[k] tracks loudness variations',
    explanation:
      'ADPCM scales the quantizer step Δ[k] up during loud bursts (preventing overload) and down during quiet intervals (reducing granular noise).',
  },
  {
    id: 'q-comp-8',
    module: SyllabusModule.COMPRESSION,
    topic: 'CELP Speech Coding',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'Compared to basic LPC-10, Code-Excited Linear Prediction (CELP) achieves much more natural speech quality (at 4.8–16 kbps) by:',
    options: [
      'Searching fixed & adaptive excitation codebooks to minimize perceptually weighted error (analysis-by-synthesis)',
      'Using 16 bits per sample at 44.1 kHz',
      'Eliminating the vocal-tract synthesis filter',
      'Applying 2D Discrete Cosine Transforms to audio',
    ],
    correctIndex: 0,
    formulaHint: 'CELP = LPC filter + perceptual codebook search',
    explanation:
      'CELP replaces the crude binary voiced/unvoiced switch of LPC with a searched codebook of excitation vectors evaluated through a perceptual weighting filter.',
  },
  {
    id: 'q-comp-9',
    module: SyllabusModule.COMPRESSION,
    topic: 'JPEG Image Coding',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'In baseline JPEG compression, where does the actual lossy data reduction (discarding perceptually invisible high frequencies) occur?',
    options: [
      'During RGB-to-YCbCr conversion',
      'During the 8×8 2D-DCT calculation itself',
      'When dividing DCT coefficients by the quantization matrix and rounding to integers',
      'During Huffman entropy encoding',
    ],
    correctIndex: 2,
    formulaHint: 'DCT is reversible; Quantization introduces controlled loss',
    explanation:
      'The 2D-DCT is mathematically invertible. Loss happens when high-frequency DCT coefficients are divided by large quantization table entries and rounded toward zero.',
  },
  {
    id: 'q-comp-10',
    module: SyllabusModule.COMPRESSION,
    topic: 'MPEG Video Coding',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'In an MPEG Group of Pictures (GOP), which frame type exploits bidirectional motion compensation from both past and future reference frames?',
    options: ['I-frame (Intra)', 'P-frame (Predicted)', 'B-frame (Bidirectional)', 'S-frame (Sync)'],
    correctIndex: 2,
    formulaHint: 'I = intra only, P = forward predicted, B = forward + backward',
    explanation:
      'B-frames achieve the highest compression ratio by interpolating motion vectors from both preceding and succeeding I/P anchor frames.',
  },

  // MODULE 3: DIGITAL MODULATION SCHEMES (10 questions, 5 CAT High-Yield)
  {
    id: 'q-mod-1',
    module: SyllabusModule.MODULATION,
    topic: 'Power Efficiency & BER',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'At the same bit energy-to-noise ratio (Eb/N0), which binary modulation scheme achieves the LOWEST bit error probability Pb?',
    options: ['Non-coherent BFSK', 'Coherent BASK (OOK)', 'Coherent BPSK', 'Differential PSK (DPSK)'],
    correctIndex: 2,
    formulaHint: 'BPSK: Q(√(2·Eb/N0)) vs Coherent ASK/BFSK: Q(√(Eb/N0))',
    explanation:
      'BPSK uses antipodal signals (+s(t), -s(t)), giving 3 dB better distance-squared per bit than orthogonal BFSK or OOK/ASK, and outperforms non-coherent DPSK.',
  },
  {
    id: 'q-mod-2',
    module: SyllabusModule.MODULATION,
    topic: 'Spectral Efficiency',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'A 16-QAM system transmits at Rb = 16 Mbps. What is the symbol rate (baud rate) and null-to-null RF bandwidth?',
    options: [
      '16 MBaud, 32 MHz',
      '8 MBaud, 16 MHz',
      '4 MBaud, 8 MHz',
      '2 MBaud, 4 MHz',
    ],
    correctIndex: 2,
    formulaHint: 'k = log2(16) = 4; Rs = Rb/4; B_null = 2·Rs',
    explanation:
      '16-QAM carries k = 4 bits/symbol. Rs = 16 Mbps / 4 = 4 MBaud. Null-to-null passband bandwidth = 2 × Rs = 8 MHz.',
  },
  {
    id: 'q-mod-3',
    module: SyllabusModule.MODULATION,
    topic: 'QPSK vs BPSK',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Compared to BPSK at the same data bit rate Rb and same Eb/N0, Gray-coded QPSK offers:',
    options: [
      'Half the RF bandwidth with the same bit error probability Pb',
      'Double the RF bandwidth with 3 dB worse BER',
      'Half the RF bandwidth with 6 dB worse BER',
      'Identical bandwidth and 3 dB better BER',
    ],
    correctIndex: 0,
    formulaHint: 'QPSK transmits two orthogonal BPSK streams on I and Q carriers',
    explanation:
      'Because I and Q channels are orthogonal, QPSK halves the symbol rate (and required bandwidth) while preserving the exact same bit error rate Pb = Q(√(2·Eb/N0)).',
  },
  {
    id: 'q-mod-4',
    module: SyllabusModule.MODULATION,
    topic: 'DPSK Detection',
    catHighYield: true,
    difficulty: 'Standard',
    question:
      'What is the main practical motivation for using DPSK instead of coherent BPSK?',
    options: [
      'DPSK doubles spectral efficiency',
      'DPSK eliminates the need for an absolute local carrier phase reference (Costas/squaring loop)',
      'DPSK gives 3 dB lower BER than BPSK',
      'DPSK uses only envelope amplitude changes',
    ],
    correctIndex: 1,
    formulaHint: 'DPSK compares current symbol phase against 1-symbol delayed received signal',
    explanation:
      'DPSK encodes information in phase transitions and detects differentially using a Tb delay line, avoiding complex coherent carrier phase synchronization.',
  },
  {
    id: 'q-mod-5',
    module: SyllabusModule.MODULATION,
    topic: 'MSK Properties',
    catHighYield: true,
    difficulty: 'Analytical',
    question:
      'Which combination of properties makes Minimum Shift Keying (MSK) prized in satellite and cellular power amplifiers?',
    options: [
      'Non-constant envelope and 16-level amplitude slicing',
      'Constant envelope, continuous phase (h = 0.5), rapid sidelobe roll-off, and BPSK error rate',
      'Zero carrier frequency shift and non-coherent envelope detection only',
      'Infinite bandwidth and 4 bits per symbol',
    ],
    correctIndex: 1,
    formulaHint: 'MSK = Continuous-Phase FSK with Δf = 0.5·Rb',
    explanation:
      'MSK has a constant envelope (allowing nonlinear Class-C amplifiers without distortion), continuous phase transitions (fast spectral decay), and coherent BER equal to BPSK.',
  },
  {
    id: 'q-mod-6',
    module: SyllabusModule.MODULATION,
    topic: 'Matched Filter Receiver',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'In a coherent receiver over an AWGN channel, a filter matched to a pulse s(t) of duration T maximizes output SNR at t = T when its impulse response is:',
    options: ['h(t) = s(t)', 'h(t) = s(T − t)', 'h(t) = d/dt s(t)', 'h(t) = 1 / s(t)'],
    correctIndex: 1,
    formulaHint: 'Time-reversed and shifted replica h(t) = s(T - t)',
    explanation:
      'Convolution of s(t) with h(t) = s(T − t) computes the autocorrelation at lag 0 at t = T, achieving maximum output SNR = 2·Eb/N0.',
  },
  {
    id: 'q-mod-7',
    module: SyllabusModule.MODULATION,
    topic: 'ASK vs BPSK Distance',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'Why does coherent OOK (ASK) require 3 dB more average Eb/N0 than BPSK to achieve the same bit error probability?',
    options: [
      'ASK uses twice as much bandwidth',
      'In OOK, 0-bits transmit zero energy, halving squared Euclidean distance per average bit energy',
      'ASK suffers from frequency drift',
      'BPSK uses 4 constellation points instead of 2',
    ],
    correctIndex: 1,
    formulaHint: 'Pb(ASK) = Q(√(Eb/N0)) vs Pb(BPSK) = Q(√(2·Eb/N0))',
    explanation:
      'The factor of 2 inside the square root (2·Eb/N0 vs Eb/N0) translates directly to 10·log10(2) = 3.01 dB power penalty for OOK/ASK.',
  },
  {
    id: 'q-mod-8',
    module: SyllabusModule.MODULATION,
    topic: 'BFSK Orthogonality',
    catHighYield: false,
    difficulty: 'Analytical',
    question:
      'For coherent BFSK over symbol duration Tb, what is the minimum frequency separation Δf = f2 − f1 required to ensure the two tones are orthogonal?',
    options: ['Δf = 1 / (4·Tb)', 'Δf = 1 / (2·Tb)', 'Δf = 1 / Tb', 'Δf = 2 / Tb'],
    correctIndex: 1,
    formulaHint: '∫ cos(2πf1t)cos(2πf2t) dt = 0 when Δf = k / (2Tb)',
    explanation:
      'Coherent orthogonality requires Δf = Rb / 2 = 1 / (2·Tb) (which corresponds to MSK). Non-coherent BFSK requires twice that: Δf = 1 / Tb.',
  },
  {
    id: 'q-mod-9',
    module: SyllabusModule.MODULATION,
    topic: 'Constellation & Gray Coding',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'What is the purpose of Gray coding when assigning multi-bit labels to QPSK or 16-QAM constellation points?',
    options: [
      'To reduce the peak-to-average power ratio',
      'To ensure the most likely symbol errors (adjacent points) cause only a single bit error',
      'To double the symbol rate without increasing power',
      'To remove the need for carrier synchronization',
    ],
    correctIndex: 1,
    formulaHint: 'Adjacent constellation symbols differ by exactly 1 bit',
    explanation:
      'With Gray coding, noise pushing a received symbol across the nearest decision boundary flips only 1 out of k bits, giving Pb ≈ Ps / k.',
  },
  {
    id: 'q-mod-10',
    module: SyllabusModule.MODULATION,
    topic: 'Receiver Synchronization',
    catHighYield: false,
    difficulty: 'Standard',
    question:
      'Why can a standard PLL NOT lock directly onto a suppressed-carrier BPSK signal without preprocessing?',
    options: [
      'BPSK has infinite bandwidth',
      'A balanced BPSK signal has zero discrete carrier spectral line at fc (180° phase flips cancel the average)',
      'BPSK has only positive amplitudes',
      'A PLL only works below 10 kHz',
    ],
    correctIndex: 1,
    formulaHint: 'Squaring loop or Costas loop strips ±1 data modulation to recover 2·fc or fc',
    explanation:
      'Because ±1 bit transitions suppress the carrier spike at fc, a squaring loop (squares signal to yield cos(4πfct)) or Costas I/Q loop is required for coherent carrier recovery.',
  },
];

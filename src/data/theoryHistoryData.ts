import {
  EssayPrompt,
  HistoricalMilestone,
  LabType,
  SyllabusModule,
  TheoryPrinciple,
} from '../types/ece423';

export const CORE_THEORY_PRINCIPLES: TheoryPrinciple[] = [
  // MODULE 1: PCM SYSTEMS
  {
    id: 'th-pcm-sampling',
    module: SyllabusModule.PCM,
    title: 'Why Sampling Works & What Causes Aliasing',
    plainEnglishIntuition:
      'Multiplying a continuous signal by a regular train of narrow pulses creates infinitely repeating copies of the signal’s frequency spectrum spaced every fs Hz. As long as fs > 2·fm, those copies never touch, so a simple low-pass filter carves out the original baseband untouched.',
    physicalMechanism:
      'In the time domain, ideal sampling multiplies m(t) by an impulse train δ_Ts(t). Multiplication in time equals convolution in frequency, shifting the spectrum M(f) to ±fs, ±2fs, ±3fs... If fs < 2·fm, the upper edge of baseband (+fm) collides with the lower edge of the first copy (fs - fm), folding high frequencies down as fake low-frequency aliases.',
    whyItMatters:
      'Practical anti-aliasing low-pass filters do not drop infinitely fast at fm; they need a transition roll-off ("guard band"). That is why telephone speech bandlimited to 3.4 kHz is sampled at 8 kHz instead of 6.8 kHz.',
    commonMisconception:
      'Sampling above Nyquist does NOT magically digitize amplitude—samples are still continuous-amplitude analog pulses (PAM) until quantized and binary-encoded into PCM.',
    pioneerHighlight: 'Harry Nyquist (1928) & Vladimir Kotelnikov (1933)',
    recommendedLab: LabType.SAMPLING_PCM,
    recommendedCalc: 'pcm_snr',
  },
  {
    id: 'th-pcm-quantization',
    module: SyllabusModule.PCM,
    title: 'Quantization Irreversibility, Companding & Threshold Collapse',
    plainEnglishIntuition:
      'Quantization rounds an infinite continuum of voltages onto a finite ladder of 2^n rungs. That rounding error is permanent—no filter can undo it. Companding bends the ladder rungs closer together near zero volts so quiet whispers get the same relative accuracy as loud shouts.',
    physicalMechanism:
      'Uniform rounding within [-Δ/2, +Δ/2] acts like additive white noise of power Δ²/12, yielding ~6 dB SQNR per bit. When the resulting bits travel over a noisy wire or wireless channel, rare bit flips in the Most Significant Bit (MSB) create huge voltage spikes. Above ~11 dB Eb/N0 (Pe < 10⁻⁵), quantization noise dominates; below that threshold, MSB bit errors overwhelm the signal and overall SNR collapses.',
    whyItMatters:
      'Explains why 8-bit logarithmic μ-Law/A-Law PCM achieves 12-to-13-bit dynamic range for human speech at just 64 kbps, and why digital links employ error-correcting codes to stay above the PCM threshold.',
    commonMisconception:
      'Companding does NOT eliminate quantization noise—it redistributes step sizes non-uniformly so weak signals no longer drown in uniform Δ²/12 noise.',
    pioneerHighlight: 'Alec Reeves (1937), William Bennett (1948) & Bernard Smith (1957)',
    recommendedLab: LabType.COMPANDING,
    recommendedCalc: 'companding',
  },
  {
    id: 'th-pcm-sync',
    module: SyllabusModule.PCM,
    title: 'Line Coding, Multiplexing & Three-Level Synchronization',
    plainEnglishIntuition:
      'A stream of raw 1s and 0s on a copper wire has no separate clock wire. Line coding shapes the voltage pulses so the receiver can extract timing edges ("bit sync"), reject DC buildup across transformers, and spot single bit flips—while TDM framing tells the demultiplexer which 8-bit slot belongs to which caller.',
    physicalMechanism:
      'Digital multiplexers rely on three nested sync layers: (1) Bit synchronization recovers the symbol clock Tb from pulse transitions (using a PLL or mid-bit transitions as in Manchester coding); (2) Word synchronization groups every n bits into an amplitude sample; (3) Frame synchronization locks onto a known Frame Alignment Word (or framing bit in T1/E1) so channel #1 is never swapped with channel #2.',
    whyItMatters:
      'Long runs of identical bits in NRZ starve the receiver PLL of edges, causing bit-slip and frame loss. Bipolar AMI solves DC wander and detects errors via bipolar violations, while HDB3/B8ZS and Manchester guarantee clock transitions.',
    commonMisconception:
      'Bipolar AMI eliminates DC wander, NOT long zero-run clock loss—pure AMI still loses clock sync on long strings of 0s unless modified with B8ZS/HDB3.',
    pioneerHighlight: 'Bell Labs T1 Engineering Team (1962)',
    recommendedLab: LabType.LINE_CODING,
    recommendedCalc: 'tdm_frame',
  },

  // MODULE 2: COMPRESSION TECHNIQUES
  {
    id: 'th-comp-shannon',
    module: SyllabusModule.COMPRESSION,
    title: "Shannon's Law: Bandwidth–Power Trade-off & Source Compression",
    plainEnglishIntuition:
      'Think of a communication channel as a noisy highway: Bandwidth B is the number of lanes, and Signal-to-Noise Ratio (S/N) is visibility through the fog. Shannon proved that as long as your bit rate stays below C = B·log₂(1 + S/N), clever coding can make errors arbitrarily rare.',
    physicalMechanism:
      'Channel capacity grows linearly with bandwidth B (until thermal noise N = N0·B dilutes SNR) and logarithmically with power S/N. Even as B → ∞, finite signal power bounds capacity to 1.44·(S/N0), establishing the absolute Shannon Limit of Eb/N0 ≥ ln(2) = -1.59 dB.',
    whyItMatters:
      'Shannon separates source coding (removing redundancy to compress data below C) from channel coding (adding structured redundancy to fight noise up to C).',
    commonMisconception:
      'Shannon’s limit does NOT mean infinite bandwidth gives infinite capacity—because wider bandwidth lets in more white noise N0·B, driving capacity to the finite limit 1.44·(S/N0).',
    pioneerHighlight: 'Claude E. Shannon (1948)',
    recommendedCalc: 'shannon',
  },
  {
    id: 'th-comp-predictive',
    module: SyllabusModule.COMPRESSION,
    title: 'Predictive Waveform Coding: DPCM, ADPCM & Delta Modulation',
    plainEnglishIntuition:
      'Adjacent samples of speech or sensor waveforms rarely jump randomly—the next sample is usually close to the previous one. Instead of transmitting the full sample value every time (PCM), predictive coders guess the next sample and transmit only the tiny surprise (prediction error).',
    physicalMechanism:
      'DPCM uses a multi-tap linear prediction filter x̂[k] = Σ a_i·x[k-i] inside a closed feedback loop (using reconstructed samples so transmitter and receiver stay synchronized). Delta Modulation simplifies this to a 1-bit quantizer with a fixed step ±Δ at high oversampling. If the signal rises faster than Δ·fs, the staircase lags behind (slope overload); if Δ is too big on flat segments, the staircase hunts up and down (granular noise). ADPCM resolves both by adapting Δ[k] dynamically.',
    whyItMatters:
      'Explains why DPCM/ADPCM cuts speech bit rates from 64 kbps down to 32 kbps (ITU-T G.726) with toll quality, while basic DM trades high oversampling for ultra-simple 1-bit hardware.',
    commonMisconception:
      'Increasing DM step size Δ fixes slope overload, NOT overall distortion—pushing Δ too high severely worsens granular noise during quiet intervals.',
    pioneerHighlight: 'C. Chapin Cutler (DPCM, 1952) & Frits de Jager (DM, 1952)',
    recommendedLab: LabType.DELTA_MOD,
    recommendedCalc: 'delta_mod',
  },
  {
    id: 'th-comp-nonwaveform',
    module: SyllabusModule.COMPRESSION,
    title: 'Non-Waveform & Transform Codecs: LPC, CELP, JPEG & MPEG',
    plainEnglishIntuition:
      'Instead of copying a sound wave or pixel grid sample-by-sample, non-waveform coders extract a compact recipe: speech vocoders send vocal-tract shape and pitch ("synthesize a buzz through this throat filter"), while image/video coders convert spatial blocks into frequency importance and track moving blocks across frames.',
    physicalMechanism:
      'LPC models the throat as an all-pole filter driven by a pitch pulse train (voiced) or noise (unvoiced) at 2.4 kbps. CELP improves naturalness by searching an excitation codebook via analysis-by-synthesis. For images, JPEG transforms 8×8 pixel blocks via 2D-DCT, discards subtle high-frequency details using perceptual quantization matrices, and entropy-codes zeros. MPEG adds temporal motion vectors: I-frames (spatial only), P-frames (forward predicted), and B-frames (bidirectional).',
    whyItMatters:
      'Makes mobile cellular voice (4.8–13 kbps), web photography, and HD streaming physically possible inside tight wireless and internet bandwidth budgets.',
    commonMisconception:
      'In JPEG, the 2D-DCT step itself is mathematically lossless—the irreversible loss happens during division by the quantization table.',
    pioneerHighlight: 'Bishnu Atal & Manfred Schroeder (1967–1985), Nasir Ahmed (1974) & Leonardo Chiariglione (1988)',
    recommendedCalc: 'examples',
  },

  // MODULE 3: DIGITAL MODULATION SCHEMES
  {
    id: 'th-mod-matched',
    module: SyllabusModule.MODULATION,
    title: 'Matched Filtering, Correlators & Carrier Synchronization',
    plainEnglishIntuition:
      'When a faint digital pulse arrives buried in thermal white noise, an ordinary low-pass filter smears both signal and noise. A matched filter uses a time-reversed copy of the expected pulse shape so all signal energy aligns coherently at one exact sampling instant t = T while random noise averages out.',
    physicalMechanism:
      'By Cauchy-Schwarz inequality, impulse response h(t) = s(T - t) maximizes instantaneous output SNR to 2·Eb/N0 regardless of pulse shape—only bit energy Eb matters. For bandpass BPSK/QPSK, coherent detection requires a local carrier locked in exact frequency and phase. Because ±1 phase flips erase the spectral carrier line at fc, receivers use squaring loops or Costas I/Q loops to recover the suppressed carrier.',
    whyItMatters:
      'Explains why BPSK, QPSK, and MSK achieve identical optimal bit error probability Pb = Q(√(2·Eb/N0)) over AWGN, and why non-coherent DPSK or envelope-detected BFSK accept a small SNR penalty to eliminate carrier-phase tracking.',
    commonMisconception:
      'Matched filter peak SNR depends on pulse ENERGY Eb, NOT peak pulse amplitude or bandwidth—a wider low-power pulse and a sharp high-power pulse of equal energy yield the exact same BER.',
    pioneerHighlight: 'Dwight O. North (1943) & John P. Costas (1956)',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'th-mod-tradeoff',
    module: SyllabusModule.MODULATION,
    title: 'The Fundamental Trade-Off: Power Efficiency vs. Spectral Efficiency',
    plainEnglishIntuition:
      'Constellation diagrams map bits onto a 2D map of I (cosine) and Q (sine) waves. Packing 16 points onto that map (16-QAM) sends 4 bits per symbol—slashing required RF bandwidth—but squeezes points closer together so smaller noise gusts cause symbol errors.',
    physicalMechanism:
      'Minimum Euclidean distance d_min between constellation points governs error probability, while k = log₂(M) bits/symbol scales symbol rate Rs = Rb/k and bandwidth B = 2·Rs. Moving from BPSK (η = 0.5) to QPSK (η = 1.0) doubles spectral efficiency for FREE in Eb/N0 because I and Q carriers are orthogonal. Pushing to 16-QAM (η = 2.0) shrinks inter-point spacing relative to average energy, costing roughly +4 dB Eb/N0 for the same 10⁻⁵ BER.',
    whyItMatters:
      'Drives real link engineering: deep-space probes with tiny power budgets choose BPSK/QPSK (power-efficient), while fiber/Wi-Fi/5G links with high SNR choose 16-QAM or 64-QAM (bandwidth-efficient).',
    commonMisconception:
      'QPSK does NOT suffer a 3 dB Eb/N0 penalty compared to BPSK—its symbol energy is 2·Eb (3 dB higher), leaving Eb/N0 per bit identical when Gray-coded.',
    pioneerHighlight: 'Claude Shannon (Geometric Signal Space, 1949) & Gray Coding (Frank Gray, 1953)',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'th-mod-msk',
    module: SyllabusModule.MODULATION,
    title: 'Continuous-Phase MSK & Nonlinear Amplifier Immunity',
    plainEnglishIntuition:
      'Standard QPSK jumps abruptly by 180° at symbol boundaries, creating amplitude dips when filtered and high spectral sidelobes that splatter into neighboring radio channels. MSK smooths those phase corners into gentle linear ramps using half-sine pulse shaping, keeping the RF envelope completely flat.',
    physicalMechanism:
      'MSK is simultaneously Continuous-Phase FSK with modulation index h = 0.5 (Δf = Rb/2) and Offset QPSK with half-sinusoidal weighting. Because phase never jumps discontinuously, its power spectral density decays rapidly as 1/f⁴ (vs 1/f² for QPSK), containing 99% of signal power within 1.18·Rb while preserving coherent BPSK error performance.',
    whyItMatters:
      'Constant-envelope modulation lets satellites and cellular handsets run nonlinear Class-C/saturated power amplifiers at maximum battery efficiency without spectral regrowth (which motivated GMSK in GSM).',
    commonMisconception:
      'MSK is NOT ordinary wide-band FSK—it achieves minimum orthogonal tone spacing (h = 0.5) AND coherent phase continuity, matching BPSK BER rather than FSK’s 3 dB penalty.',
    pioneerHighlight: 'Rudi de Buda (1972) & Subbarayan Pasupathy (1979)',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
];

export const HISTORICAL_TIMELINE: HistoricalMilestone[] = [
  {
    id: 'hist-1924-nyquist',
    year: '1924–1928',
    yearNumeric: 1928,
    era: '1920s–1940s',
    module: SyllabusModule.PCM,
    pioneer: 'Harry Nyquist',
    affiliation: 'AT&T / Bell Telephone Laboratories',
    breakthrough: 'Telegraph Signaling Limits, ISI-Free Pulses & 2W Sampling Criterion',
    storyAndContext:
      'Investigating how fast telegraph dots could travel down bandlimited submarine cables without smearing into one another (intersymbol interference), Nyquist proved in 1924 and 1928 that a channel of bandwidth W Hz supports at most 2W independent pulse values per second—laying the bedrock for both Nyquist sampling and baseband pulse shaping.',
    ece423Connection:
      'Directly underpins the Nyquist sampling theorem (fs ≥ 2·fm) and minimum baseband transmission bandwidth (B_min = Rb/2).',
    recommendedLab: LabType.SAMPLING_PCM,
  },
  {
    id: 'hist-1933-kotelnikov',
    year: '1933',
    yearNumeric: 1933,
    era: '1920s–1940s',
    module: SyllabusModule.PCM,
    pioneer: 'Vladimir A. Kotelnikov',
    affiliation: 'Moscow Power Engineering Institute',
    breakthrough: 'Exact Mathematical Proof of the Sampling & Reconstruction Theorem',
    storyAndContext:
      'In a landmark 1933 paper ("On the Carrying Capacity of Ether and Wire in Electrocommunications"), Kotelnikov gave the first rigorous continuous-to-discrete-to-continuous Fourier proof showing exact sinc-interpolation recovery when sampling strictly above twice the highest signal frequency.',
    ece423Connection:
      'Often cited alongside Nyquist and Shannon as the Whittaker–Kotelnikov–Shannon sampling theorem.',
    recommendedLab: LabType.SAMPLING_PCM,
  },
  {
    id: 'hist-1937-reeves',
    year: '1937',
    yearNumeric: 1937,
    era: '1920s–1940s',
    module: SyllabusModule.PCM,
    pioneer: 'Alec Harley Reeves',
    affiliation: 'ITT Laboratories, Paris',
    breakthrough: 'Invention & Patent of Pulse Code Modulation (PCM)',
    storyAndContext:
      'Frustrated by cumulative analog noise across long-haul telephone repeaters, British engineer Alec Reeves conceived PCM in 1937 (French patent 1938, US patent 1942): sample the voice, quantize to discrete levels, and transmit binary pulses that regenerative repeaters could cleanly rebuild at every hop without noise accumulation. Vacuum-tube hardware was too bulky until the transistor arrived, making Reeves decades ahead of his time.',
    ece423Connection:
      'Defines the entire 3-stage PCM chain: Sampling → Quantization → Binary Encoding (Module 1 core).',
    recommendedLab: LabType.SAMPLING_PCM,
  },
  {
    id: 'hist-1943-north',
    year: '1943',
    yearNumeric: 1943,
    era: '1920s–1940s',
    module: SyllabusModule.MODULATION,
    pioneer: 'Dwight O. North',
    affiliation: 'RCA Laboratories',
    breakthrough: 'Discovery of the Matched Filter for Optimal Radar & Pulse Detection',
    storyAndContext:
      'Working on wartime radar echo detection in 1943, Dwight North proved in a classified RCA report that a linear filter whose impulse response mirrors the time-reversed signal waveform h(t) = s(T - t) achieves the highest mathematically possible output SNR in white Gaussian noise.',
    ece423Connection:
      'Forms the optimal receiver front-end for coherent ASK, BPSK, QPSK, BFSK, and MSK error-rate derivations.',
    recommendedLab: LabType.DIGITAL_MOD,
  },
  {
    id: 'hist-1948-shannon',
    year: '1948',
    yearNumeric: 1948,
    era: '1920s–1940s',
    module: SyllabusModule.COMPRESSION,
    pioneer: 'Claude Elwood Shannon',
    affiliation: 'Bell Telephone Laboratories',
    breakthrough: 'Information Theory, Entropy & Channel Capacity C = B·log₂(1 + S/N)',
    storyAndContext:
      'Shannon’s 1948 monograph "A Mathematical Theory of Communication" unified all communications under one unit—the "bit"—and shocked engineers by proving noise does NOT force errors: as long as source rate R < C, error probability can be driven arbitrarily close to zero via coding.',
    ece423Connection:
      'Governs Shannon’s Law, channel capacity calculations, the -1.59 dB Shannon limit, and lossless compression bounds.',
  },
  {
    id: 'hist-1948-bennett',
    year: '1948',
    yearNumeric: 1948,
    era: '1920s–1940s',
    module: SyllabusModule.PCM,
    pioneer: 'William R. Bennett',
    affiliation: 'Bell Telephone Laboratories',
    breakthrough: 'Quantization Noise Spectrum & Δ²/12 Statistical Model',
    storyAndContext:
      'In "Spectra of Quantized Signals" (1948), Bennett modeled uniform quantization error as an additive white noise source uniformly distributed across [-Δ/2, +Δ/2], deriving the classic Δ²/12 noise power and the ~6.02 dB-per-bit SQNR scaling rule.',
    ece423Connection:
      'Underpins every PCM SQNR derivation (6.02n + 1.76 dB) and uniform vs. companded noise analysis.',
    recommendedLab: LabType.SAMPLING_PCM,
  },
  {
    id: 'hist-1952-cutler',
    year: '1952',
    yearNumeric: 1952,
    era: '1950s–1960s',
    module: SyllabusModule.COMPRESSION,
    pioneer: 'C. Chapin Cutler',
    affiliation: 'Bell Telephone Laboratories',
    breakthrough: 'Differential Pulse Code Modulation (DPCM)',
    storyAndContext:
      'Patented in 1952 ("Differential Quantization of Communication Signals"), Cutler recognized that successive voice and television samples are strongly correlated. By inserting a linear predictor inside a feedback quantizer loop, DPCM transmitted only small prediction residuals.',
    ece423Connection:
      'Explains prediction filters, prediction gain Gp = σ_x² / σ_e², and why DPCM outperforms memoryless PCM.',
  },
  {
    id: 'hist-1952-dejager',
    year: '1952',
    yearNumeric: 1952,
    era: '1950s–1960s',
    module: SyllabusModule.COMPRESSION,
    pioneer: 'Frits Willem de Jager',
    affiliation: 'Philips Research Laboratories, Eindhoven',
    breakthrough: 'Delta Modulation (DM) & Slope Overload Theory',
    storyAndContext:
      'Formalized in 1952 ("Deltamodulation: A Method of PCM Transmission Using the 1-Unit Code"), de Jager replaced multi-bit PCM ADCs with a single comparator and integrator staircase, analyzing the fundamental trade-off between slope overload and granular quantization noise.',
    ece423Connection:
      'Directly gives the DM condition Δ·fs ≥ 2π·fm·Am and baseband DM SNR formulas.',
    recommendedLab: LabType.DELTA_MOD,
  },
  {
    id: 'hist-1956-costas',
    year: '1956',
    yearNumeric: 1956,
    era: '1950s–1960s',
    module: SyllabusModule.MODULATION,
    pioneer: 'John P. Costas',
    affiliation: 'General Electric',
    breakthrough: 'The Costas Loop for Coherent Suppressed-Carrier Synchronization',
    storyAndContext:
      'In 1956, John Costas solved a nagging receiver dilemma: BPSK and DSB-SC suppress the carrier line so normal PLLs cannot lock. His dual-branch I/Q phase-locked loop simultaneously recovered the coherent carrier reference and demodulated the baseband data.',
    ece423Connection:
      'Key hardware block in coherent PSK/QPSK receiver implementations (Module 3 synchronization).',
    recommendedLab: LabType.DIGITAL_MOD,
  },
  {
    id: 'hist-1962-companding-t1',
    year: '1957–1962',
    yearNumeric: 1962,
    era: '1950s–1960s',
    module: SyllabusModule.PCM,
    pioneer: 'Bernard Smith & K. W. Cattermole (Bell T1 Team)',
    affiliation: 'Bell Labs (USA) & Standard Telecommunication Labs (UK)',
    breakthrough: 'μ-Law / A-Law Companding & First Commercial T1 TDM Trunk',
    storyAndContext:
      'Bernard Smith (1957) analyzed logarithmic instantaneous companding (μ-Law) while K. W. Cattermole formalized segmented A-Law in Europe. In 1962, Bell System deployed the landmark 24-channel T1 carrier at 1.544 Mbps using 8-kHz sampling, Bipolar AMI line coding, and 193-bit TDM frames—launching the global digital telephone network.',
    ece423Connection:
      'Explains μ=255 / A=87.6 companding curves, T1/E1 TDM frame arithmetic, Bipolar AMI, and bit/frame sync.',
    recommendedLab: LabType.COMPANDING,
  },
  {
    id: 'hist-1967-atal-celp',
    year: '1967–1985',
    yearNumeric: 1985,
    era: '1970s–Modern',
    module: SyllabusModule.COMPRESSION,
    pioneer: 'Bishnu S. Atal & Manfred R. Schroeder',
    affiliation: 'Bell Telephone Laboratories',
    breakthrough: 'Linear Predictive Coding (LPC) & Code-Excited Linear Prediction (CELP)',
    storyAndContext:
      'Atal and Schroeder introduced adaptive predictive speech coding in 1967–1971 (LPC) and revolutionized cellular voice in 1985 with CELP—combining a vocal-tract all-pole filter with an excitation codebook searched via perceptual analysis-by-synthesis to achieve natural voice below 8 kbps.',
    ece423Connection:
      'Core non-waveform speech coding schemes (LPC & CELP) contrasting parametric synthesis against waveform PCM/ADPCM.',
  },
  {
    id: 'hist-1972-debuda-msk',
    year: '1972',
    yearNumeric: 1972,
    era: '1970s–Modern',
    module: SyllabusModule.MODULATION,
    pioneer: 'Rudi de Buda (with Subbarayan Pasupathy, 1979)',
    affiliation: 'McMaster University & University of Toronto',
    breakthrough: 'Minimum Shift Keying (MSK) Coherent Continuous-Phase Theory',
    storyAndContext:
      'Building on Doelz & Heald’s 1961 patent, Rudi de Buda (1972) proved that fast FSK with modulation index h = 0.5 achieves coherent BPSK error performance with a constant envelope and compact spectrum—later popularized by Pasupathy (1979) and adapted into GMSK for billions of GSM phones.',
    ece423Connection:
      'Connects FSK orthogonality (Δf = Rb/2), Offset-QPSK equivalence, and constant-envelope spectral efficiency.',
    recommendedLab: LabType.DIGITAL_MOD,
  },
  {
    id: 'hist-1974-ahmed-jpeg-mpeg',
    year: '1974–1992',
    yearNumeric: 1988,
    era: '1970s–Modern',
    module: SyllabusModule.COMPRESSION,
    pioneer: 'Nasir Ahmed (DCT) & Leonardo Chiariglione (MPEG)',
    affiliation: 'Kansas State Univ. / CSELT & ISO/IEC Standards',
    breakthrough: 'Discrete Cosine Transform (DCT), JPEG Still Image & MPEG Video Coding',
    storyAndContext:
      'In 1974, Nasir Ahmed, T. Natarajan, and K. R. Rao invented the Discrete Cosine Transform (DCT), showing it packed image energy almost as efficiently as the optimal Karhunen-Loève transform. JPEG (1992) paired 8×8 2D-DCT with perceptual quantization, while Chiariglione founded MPEG (1988) to add temporal I/P/B motion compensation for digital TV and streaming.',
    ece423Connection:
      'Covers transform & inter-frame non-waveform multimedia compression (JPEG & MPEG) in Module 2.',
  },
];

export const INLINE_TOPIC_THEORY: Record<
  string,
  { intuition: string; pioneerNote: string; historyYear: string }
> = {
  'pcm-nyquist': {
    intuition:
      'Sampling creates periodic copies of the signal spectrum every fs Hz. Keeping fs ≥ 2·fm leaves an empty gap between copies so a low-pass filter recovers the original analog wave without distortion.',
    pioneerNote: 'Harry Nyquist (1928) & Vladimir Kotelnikov (1933)',
    historyYear: '1928 / 1933',
  },
  'pcm-quantization': {
    intuition:
      'Quantization rounds each continuous sample to the nearest of 2^n discrete amplitude rungs, introducing permanent additive noise of variance Δ²/12 (~6.02 dB SNR gain per added bit).',
    pioneerNote: 'Alec Reeves (1937 PCM patent) & William Bennett (1948 quantization noise)',
    historyYear: '1937 / 1948',
  },
  'pcm-companding': {
    intuition:
      'Human speech spends most time at low amplitudes. Companding compresses peaks and stretches small values before uniform quantization, giving quiet sounds finer voltage steps.',
    pioneerNote: 'Bernard Smith (μ-Law, 1957) & K. W. Cattermole (A-Law)',
    historyYear: '1957–1962',
  },
  'pcm-tdm': {
    intuition:
      'Time-Division Multiplexing slices time into 125 μs frames (at 8 kHz) and assigns one 8-bit slot per caller plus framing sync bits so a single trunk carries dozens of conversations simultaneously.',
    pioneerNote: 'Bell System T1 Engineering Team (24-channel DS1, 1.544 Mbps)',
    historyYear: '1962',
  },
  'pcm-noise-threshold': {
    intuition:
      'Above ~11 dB Eb/N0, channel bit flips are rare and quantization noise sets output quality. Below threshold, MSB bit flips cause massive decoding spikes and SNR collapses sharply.',
    pioneerNote: 'Extension of Reeves & Bennett PCM link noise analysis',
    historyYear: '1948–1960s',
  },
  'pcm-line-coding': {
    intuition:
      'Line codes convert logical 1s and 0s into physical wire voltages that prevent transformer DC saturation (AMI/Manchester) and guarantee clock edges so receiver timing stays locked.',
    pioneerNote: 'Bell T1 Bipolar AMI & IEEE 802.3 Manchester',
    historyYear: '1962–1970s',
  },
  'comp-shannon': {
    intuition:
      'Channel capacity C = B·log₂(1 + S/N) is the ultimate speed limit for error-free transmission through Gaussian noise—trading bandwidth lanes against signal-to-noise visibility.',
    pioneerNote: 'Claude Shannon ("A Mathematical Theory of Communication")',
    historyYear: '1948',
  },
  'comp-dpcm': {
    intuition:
      'Because consecutive signal samples are correlated, predicting the next sample and encoding only the smaller residual e[k] saves bits without sacrificing reconstruction fidelity.',
    pioneerNote: 'C. Chapin Cutler (Bell Labs DPCM patent)',
    historyYear: '1952',
  },
  'comp-dm': {
    intuition:
      'Delta Modulation tracks the input with a 1-bit ±Δ staircase. Too small Δ fails to keep up with steep slopes (slope overload); too large Δ creates jagged hunting on flat segments (granular noise).',
    pioneerNote: 'Frits Willem de Jager (Philips Research Labs)',
    historyYear: '1952',
  },
  'comp-adaptive': {
    intuition:
      'ADPCM automatically expands its step size during loud bursts and shrinks it during pauses, keeping speech crisp at 32 kbps (half of G.711 PCM).',
    pioneerNote: 'P. Cummiskey, N. S. Jayant & J. L. Flanagan (Bell Labs)',
    historyYear: '1973 / G.726',
  },
  'comp-nonwaveform': {
    intuition:
      'Instead of storing raw waveforms, LPC/CELP model the human vocal tract while JPEG/MPEG exploit spatial 2D-DCT frequency pruning and temporal motion prediction.',
    pioneerNote: 'Bishnu Atal & Manfred Schroeder (LPC/CELP), Nasir Ahmed (DCT), Leonardo Chiariglione (MPEG)',
    historyYear: '1967–1992',
  },
  'mod-metrics': {
    intuition:
      'Modulation design balances spectral efficiency (packing more bits per Hz) against power efficiency (keeping constellation points far enough apart to survive noise at low Eb/N0).',
    pioneerNote: 'Claude Shannon (Geometric Signal Space) & Frank Gray (Gray Coding)',
    historyYear: '1949–1953',
  },
  'mod-binary': {
    intuition:
      'Antipodal BPSK puts +s(t) and -s(t) at maximum 180° separation for top power efficiency, while ASK and orthogonal BFSK sit closer in signal space (3 dB penalty).',
    pioneerNote: 'Mid-century RF / Space Telemetry & Costas/North Detection Theory',
    historyYear: '1943–1956',
  },
  'mod-mary': {
    intuition:
      'QPSK transmits two independent BPSK streams on orthogonal cosine/sine carriers (doubling rate in the same bandwidth), while 16-QAM adds amplitude levels at higher Eb/N0 cost, and MSK smooths phase edges.',
    pioneerNote: 'Rudi de Buda (1972 MSK) & Subbarayan Pasupathy (1979)',
    historyYear: '1972–1979',
  },
  'mod-receivers': {
    intuition:
      'A coherent matched filter h(t) = s(T - t) aligns signal energy at t = T while rejecting out-of-phase noise, relying on Costas/squaring loops when the carrier is suppressed.',
    pioneerNote: 'Dwight North (Matched Filter, 1943) & John Costas (Costas Loop, 1956)',
    historyYear: '1943 / 1956',
  },
};

export const ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: 'essay-pcm-1',
    module: SyllabusModule.PCM,
    catRelevance: 'CAT High-Yield',
    title: 'Explain the PCM Threshold Effect & Noise Regimes',
    question:
      'Distinguish between quantization noise and transmission (bit-error) noise in a PCM system. Explain physically why a PCM receiver exhibits a sharp "threshold effect" as channel Eb/N0 drops.',
    marksGuide: '6 Marks · Theory & System Performance',
    keyPoints: [
      'Quantization noise (Δ²/12) is fixed at the transmitter encoder and depends on word length n (SQNR = 6.02n + 1.76 dB).',
      'Transmission noise arises from channel thermal noise flipping decoded bits with probability Pe.',
      'Overall SNR follows 1.5 / (2^(-2n) + 4·Pe). When Pe < 10⁻⁵ (above threshold), 4·Pe << 2^(-2n) so output SNR stays flat at the quantization ceiling.',
      'Below threshold (~10–11 dB Eb/N0), Pe rises exponentially and bit errors hit Most Significant Bits (MSBs), creating huge amplitude clicks that cause SNR to plummet sharply.',
    ],
    modelAnswer:
      'In a PCM link, total distortion combines transmitter quantization error (Δ²/12) and receiver decoding errors caused by channel bit flips (Pe). At high channel Eb/N0, Pe is negligible (below ~10⁻⁵), so overall SNR plateaus at the quantization limit 6.02n + 1.76 dB. However, once Eb/N0 drops below the PCM threshold (~10–11 dB), bit errors increase exponentially; flipping an MSB introduces half-full-scale amplitude spikes, causing output SNR to collapse rapidly.',
    recommendedLab: LabType.SAMPLING_PCM,
  },
  {
    id: 'essay-pcm-2',
    module: SyllabusModule.PCM,
    catRelevance: 'CAT High-Yield',
    title: 'Compare Line Coding Schemes for Synchronization & DC Elimination',
    question:
      'Why is raw binary TTL logic unsuitable for long-distance PCM trunks? Compare Polar NRZ, Bipolar AMI, and Manchester line codes across DC content, bit clock recovery, and bandwidth.',
    marksGuide: '6 Marks · Baseband Transmission',
    keyPoints: [
      'Raw TTL/Unipolar NRZ has a large DC component (blocked by transformer/AC-coupled repeaters) and loses clock sync on long runs of 0s or 1s.',
      'Polar NRZ (±V) cuts average DC for equiprobable bits and saves 3 dB power, but still loses bit sync during long constant runs.',
      'Bipolar AMI alternates +V/-V for 1s and 0V for 0s: strictly zero DC, compact Rb bandwidth, and single-error detection via bipolar violations—but still needs scrambling (B8ZS/HDB3) for long 0-runs.',
      'Manchester embeds a mid-bit transition in every bit interval: strictly zero DC and guaranteed clock recovery, at the cost of double (2·Rb) bandwidth.',
    ],
    modelAnswer:
      'Long-haul trunks are AC-coupled through transformers and require clock recovery without a dedicated clock wire. Unipolar NRZ fails both criteria due to DC wander and flat runs. Polar NRZ improves power efficiency by 3 dB but still lacks transitions on long runs of identical bits. Bipolar AMI eliminates DC and enables error checking via bipolar violations within Rb bandwidth, though long zero runs require B8ZS/HDB3 substitution. Manchester guarantees both zero DC and mid-bit clock sync on every bit, trading off double null-to-null bandwidth (2·Rb).',
    recommendedLab: LabType.LINE_CODING,
  },
  {
    id: 'essay-pcm-3',
    module: SyllabusModule.PCM,
    catRelevance: 'Final Exam Core',
    title: 'Bit, Word, and Frame Synchronization in Digital Multiplexers',
    question:
      'Describe the three synchronization levels required in a TDM PCM digital multiplexer/demultiplexer and explain what fails if frame synchronization is lost.',
    marksGuide: '5 Marks · Multiplexing & Sync',
    keyPoints: [
      'Bit (clock) sync recovers the exact bit period Tb and optimal sampling instant using PLLs or line-code edges.',
      'Word sync identifies the n-bit boundary of each PCM sample word.',
      'Frame sync detects the unique Frame Alignment Word (FAW) or framing bit pattern to locate channel slot #1.',
      'If frame sync slips while bit sync remains locked, valid voice words are routed to the wrong output subscribers (crosstalk / garbled channels).',
    ],
    modelAnswer:
      'A TDM demultiplexer depends on three hierarchical sync loops: bit synchronization extracts the clock Tb to sample incoming pulses cleanly; word synchronization groups consecutive bits into n-bit PCM words; and frame synchronization searches for a repeating Frame Alignment Word (such as the T1 framing bit or E1 TS0 pattern) to anchor channel #1. Losing frame sync misaligns all time slots, routing each caller’s audio into wrong destination channels until re-framing completes.',
  },
  {
    id: 'essay-comp-1',
    module: SyllabusModule.COMPRESSION,
    catRelevance: 'CAT High-Yield',
    title: 'Slope Overload vs. Granular Noise in Delta Modulation',
    question:
      'Explain the physical origin of slope overload distortion and granular noise in Delta Modulation, and discuss why Adaptive DM (or ADPCM) resolves the conflict between them.',
    marksGuide: '6 Marks · Waveform Compression',
    keyPoints: [
      'DM updates its staircase approximation by ±Δ every Ts = 1/fs, giving maximum slew rate Δ·fs.',
      'Slope overload occurs when the input slope |dm(t)/dt| exceeds Δ·fs, causing the staircase to lag behind steep signal edges.',
      'Granular noise occurs on slowly varying or flat signal segments when Δ is large, causing the staircase to oscillate by ±Δ around the signal.',
      'Because fixing slope overload demands larger Δ while reducing granular noise demands smaller Δ, fixed DM faces an unavoidable compromise.',
      'Adaptive DM / ADPCM dynamically scales Δ[k] up on consecutive identical bits (overload) and down on alternating bits (granular regions).',
    ],
    modelAnswer:
      'In Delta Modulation, the 1-bit feedback staircase can change by only ±Δ per sample interval, capping its tracking slope at Δ·fs. Whenever the analog message rises steeper than Δ·fs, slope overload occurs and the output lags behind. Conversely, increasing Δ to track steep edges worsens granular noise—the ±Δ hunting oscillation around flat portions of the signal. Adaptive schemes (ADM/ADPCM) eliminate this fixed compromise by increasing step size during consecutive same-sign bits and shrinking it during alternating quiet segments.',
    recommendedLab: LabType.DELTA_MOD,
  },
  {
    id: 'essay-comp-2',
    module: SyllabusModule.COMPRESSION,
    catRelevance: 'Final Exam Core',
    title: 'Waveform Coding vs. Non-Waveform Parametric Coding (LPC & CELP)',
    question:
      'Contrast waveform coders (PCM, DPCM, ADPCM) with non-waveform parametric vocoders (LPC, CELP) in terms of bit rate, signal assumptions, and perceptual quality.',
    marksGuide: '6 Marks · Speech Compression',
    keyPoints: [
      'Waveform coders attempt to reproduce the exact time-domain pressure waveform sample-by-sample and work for general signals (speech, music, tones) at 16–64 kbps.',
      'LPC models the human speech production mechanism: an all-pole vocal-tract synthesis filter driven by either a periodic pitch pulse (voiced) or white noise (unvoiced).',
      'Because LPC transmits model parameters rather than waveform samples, it achieves ultra-low bit rates (~2.4 kbps) at the cost of synthetic/robotic quality and failure on music.',
      'CELP bridges both worlds (4.8–16 kbps) by replacing LPC’s simple excitation switch with a searched excitation codebook using a perceptual weighting filter.',
    ],
    modelAnswer:
      'Waveform coders (PCM, DPCM, ADPCM) preserve the literal time-domain shape of any audio signal, delivering transparent quality at 32–64 kbps. Non-waveform coders like LPC abandon waveform matching and instead transmit parameters of a physical speech model—vocal-tract filter coefficients, pitch period, and voiced/unvoiced excitation—reaching 2.4 kbps with robotic quality. CELP refines LPC for cellular networks by searching an excitation codebook via analysis-by-synthesis, achieving natural conversational voice around 4.8–13 kbps.',
  },
  {
    id: 'essay-comp-3',
    module: SyllabusModule.COMPRESSION,
    catRelevance: 'Final Exam Core',
    title: 'How JPEG and MPEG Achieve High Media Compression',
    question:
      'Outline the core compression stages in JPEG still-image coding and explain the extra temporal mechanism MPEG uses for video.',
    marksGuide: '6 Marks · Multimedia Codecs',
    keyPoints: [
      'JPEG converts RGB to YCbCr and optionally subsamples chrominance (exploiting lower eye sensitivity to color detail).',
      'Each 8×8 block undergoes a 2D-DCT, concentrating energy into the top-left DC and low-frequency coefficients.',
      'Quantization divides DCT coefficients by a perceptual matrix and rounds—this is the primary lossy step that zeroes out high-frequency detail.',
      'Zig-zag scanning groups trailing zeros for Run-Length Encoding (RLE) followed by lossless Huffman coding.',
      'MPEG adds temporal inter-frame prediction using motion vectors across I-frames (intra), P-frames (forward predicted), and B-frames (bidirectionally interpolated).',
    ],
    modelAnswer:
      'Baseline JPEG reduces spatial redundancy by transforming 8×8 YCbCr blocks via 2D-DCT into frequency coefficients, dividing by a perceptual quantization table (the irreversible lossy stage that zeroes high frequencies), and entropy-coding the zig-zagged runs with RLE and Huffman coding. MPEG extends this spatial compression across time via motion-compensated prediction: anchor I-frames use JPEG-like intra-coding, P-frames encode only motion vectors and residual differences from past frames, and B-frames interpolate bidirectionally for maximum video compression.',
  },
  {
    id: 'essay-mod-1',
    module: SyllabusModule.MODULATION,
    catRelevance: 'CAT High-Yield',
    title: 'Coherent Matched-Filter vs. Non-Coherent Receiver Implementation',
    question:
      'Explain how a coherent matched-filter receiver works for BPSK, why a Costas or squaring loop is needed, and when engineers choose non-coherent DPSK or BFSK instead.',
    marksGuide: '6 Marks · Detection & Receivers',
    keyPoints: [
      'A coherent receiver multiplies the incoming passband signal by an exact phase-locked local carrier cos(2πfct) and passes it through a matched filter h(t) = s(T-t) sampled at t = T.',
      'BPSK reverses phase by ±180°, suppressing the carrier spectral spike at fc; a squaring loop (doubles frequency to 2fc) or Costas I/Q loop is required to regenerate phase reference.',
      'Coherent BPSK achieves minimum error rate Q(√(2·Eb/N0)) but adds receiver complexity and vulnerability to fast fading phase jitter.',
      'Non-coherent DPSK (1-bit delay detector) and non-coherent BFSK (dual envelope detectors) eliminate carrier phase recovery in exchange for a ~1–4 dB Eb/N0 penalty.',
    ],
    modelAnswer:
      'Coherent BPSK detection relies on a local oscillator locked to the incoming carrier phase and a matched filter or correlator sampled at t = T, maximizing output SNR to 2·Eb/N0. Because ±1 data modulation suppresses the carrier component at fc, the receiver requires a squaring loop or Costas loop for carrier recovery. When channel phase fluctuates rapidly or receiver cost must be minimal, engineers adopt non-coherent DPSK (comparing consecutive symbol phases via a Tb delay) or dual-filter envelope BFSK, accepting a modest SNR penalty to avoid carrier synchronization.',
    recommendedLab: LabType.DIGITAL_MOD,
  },
  {
    id: 'essay-mod-2',
    module: SyllabusModule.MODULATION,
    catRelevance: 'CAT High-Yield',
    title: 'Power Efficiency vs. Spectral Efficiency Across ASK, BPSK, QPSK, and 16-QAM',
    question:
      'Compare BPSK, QPSK, and 16-QAM in terms of bandwidth efficiency, constellation spacing, and required Eb/N0 for a target BER of 10⁻⁵.',
    marksGuide: '6 Marks · Performance Analysis',
    keyPoints: [
      'BPSK sends 1 bit/sym (null-to-null BW = 2·Rb, η = 0.5 bps/Hz) with antipodal separation, achieving 10⁻⁵ BER around Eb/N0 ≈ 9.6 dB.',
      'QPSK sends 2 bits/sym on orthogonal I and Q axes, halving bandwidth (BW = Rb, η = 1.0 bps/Hz) while keeping the exact same Eb/N0 ≈ 9.6 dB for 10⁻⁵ BER.',
      '16-QAM packs 4 bits/sym across amplitude and phase (BW = Rb/2, η = 2.0 bps/Hz), quadrupling BPSK throughput.',
      'Closer constellation spacing in 16-QAM requires roughly +4 dB more Eb/N0 (~13.5 dB) to maintain 10⁻⁵ BER, and requires linear power amplifiers.',
    ],
    modelAnswer:
      'Moving from BPSK to QPSK doubles spectral efficiency from 0.5 to 1.0 bps/Hz (null-to-null) at zero Eb/N0 penalty (~9.6 dB for 10⁻⁵ BER) because the in-phase and quadrature carriers are mutually orthogonal. Advancing to 16-QAM doubles spectral efficiency again to 2.0 bps/Hz (4 bits/symbol), but packing 16 points into a fixed average power grid shrinks minimum Euclidean distance—requiring roughly 4 dB higher Eb/N0 and highly linear amplification to prevent amplitude distortion.',
    recommendedLab: LabType.DIGITAL_MOD,
  },
  {
    id: 'essay-mod-3',
    module: SyllabusModule.MODULATION,
    catRelevance: 'Final Exam Core',
    title: 'Why MSK Outperforms Standard QPSK & BFSK on Satellite Links',
    question:
      'Define Minimum Shift Keying (MSK) and explain why its constant envelope and continuous phase make it superior to QPSK and non-coherent BFSK in power-limited nonlinear RF transmitters.',
    marksGuide: '5 Marks · Advanced Bandpass Schemes',
    keyPoints: [
      'MSK is continuous-phase FSK with minimum orthogonal frequency separation Δf = Rb/2 (modulation index h = 0.5).',
      'Equivalently, it acts as Offset-QPSK with half-sinusoidal pulse shaping, achieving coherent BPSK error performance Pb = Q(√(2·Eb/N0)) (3 dB better than coherent BFSK).',
      'Continuous phase at symbol transitions eliminates abrupt 180° jumps, making PSD sidelobes fall off as 1/f⁴ instead of QPSK’s 1/f².',
      'Its strictly constant amplitude envelope allows efficient nonlinear Class-C amplifiers without causing sidelobe regrowth.',
    ],
    modelAnswer:
      'Minimum Shift Keying (MSK) is continuous-phase binary FSK with modulation index h = 0.5 (Δf = Rb/2), which is mathematically equivalent to half-sine pulse-shaped Offset QPSK. Unlike ordinary BFSK, MSK achieves coherent BPSK error performance (3 dB power gain over orthogonal BFSK). Unlike standard QPSK, MSK exhibits no instantaneous phase jumps and maintains a strictly constant RF envelope—yielding rapid 1/f⁴ spectral sidelobe decay and permitting saturated Class-C amplification without spectral splatter.',
    recommendedLab: LabType.DIGITAL_MOD,
  },
];

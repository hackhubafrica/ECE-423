import { FlashcardItem, LabType, SyllabusModule } from '../types/ece423';

export const ECE423_FLASHCARDS: FlashcardItem[] = [
  // =========================================================================
  // MODULE 1: PCM SYSTEMS
  // =========================================================================
  {
    id: 'fc-pcm-nyquist',
    syllabusTopicId: 'pcm-nyquist',
    module: SyllabusModule.PCM,
    title: 'Nyquist Sampling Rate & Anti-Aliasing Guard Band',
    catPriority: 'Critical',
    formulaDisplay: 'fs ≥ 2 · fm   (Practical: fs = (2.2 to 2.5) · fm)',
    variableLegend: [
      'fs : Sampling frequency (Hz or samples/s)',
      'fm : Highest baseband frequency W (Hz)',
      'f_alias = |fs − fm| : Folded alias when fs < 2·fm',
    ],
    promptQuestion:
      'Why do real voice and telemetry systems sample above 2·fm instead of exactly at the Nyquist boundary?',
    practicalApplication:
      'Public Switched Telephone Networks (PSTN) bandlimit voice to 3.4 kHz (not 4.0 kHz) and sample at 8.0 kHz. That 1.2 kHz guard band lets practical analog RC/butterworth anti-aliasing filters roll off smoothly before the first spectral copy at fs − fm = 4.6 kHz.',
    systemConsequence:
      'Sampling below 2·fm causes upper baseband frequencies to fold back into the audible band as irreversible false tones (aliasing) that cannot be removed by post-sampling filters.',
    catTrap:
      'Watch percentages: "25% above Nyquist rate" means fs = 1.25 × (2·fm), NOT 1.25 × fm.',
    recommendedLab: LabType.SAMPLING_PCM,
    recommendedCalc: 'pcm_snr',
  },
  {
    id: 'fc-pcm-quantization',
    syllabusTopicId: 'pcm-quantization',
    module: SyllabusModule.PCM,
    title: 'Uniform Quantization Noise & 6 dB/Bit Rule',
    catPriority: 'Critical',
    formulaDisplay: 'Nq = Δ² / 12   |   SQNR_dB = 6.02·n + 1.76 dB',
    variableLegend: [
      'Δ = (2·Vp) / 2^n : Uniform quantizer step size (V)',
      'n : Quantization bits per sample (L = 2^n levels)',
      'SQNR_dB : Full-scale sinusoidal signal-to-quantization noise',
    ],
    promptQuestion:
      'How does adding 1 bit per sample affect step size, bit rate, and quantization noise power?',
    practicalApplication:
      'CD-quality digital audio uses n = 16 bits at fs = 44.1 kHz, delivering 6.02(16) + 1.76 ≈ 98.1 dB dynamic range across quiet orchestral passages and loud crescendos, whereas 8-bit linear PCM only reaches ~49.9 dB.',
    systemConsequence:
      'Adding 1 bit halves step size Δ, cuts quantization noise power Δ²/12 by a factor of 4 (−6.02 dB), and raises bit rate linearly by +fs bps.',
    catTrap:
      'For a random uniform signal (not a full-scale sine wave), the constant is 4.77 dB instead of 1.76 dB (peak-to-RMS factor). Check signal assumption in the problem statement.',
    recommendedLab: LabType.SAMPLING_PCM,
    recommendedCalc: 'pcm_snr',
  },
  {
    id: 'fc-pcm-companding',
    syllabusTopicId: 'pcm-companding',
    module: SyllabusModule.PCM,
    title: 'Logarithmic Companding (μ-Law & A-Law)',
    catPriority: 'High',
    formulaDisplay: 'y = sgn(x) · ln(1 + μ|x|) / ln(1 + μ)   (μ = 255, A = 87.6)',
    variableLegend: [
      'x = m / Vp : Normalized input sample in [−1, +1]',
      'μ = 255 : North America / Japan DS1 standard',
      'A = 87.6 : European / ITU-T E1 standard',
    ],
    promptQuestion:
      'How does G.711 telephony achieve 12–13 bit speech clarity while transmitting only 8 bits per sample?',
    practicalApplication:
      'Human speech spends most of its time at low voltage levels. Companding compresses high-amplitude peaks before uniform quantization and expands them at the receiver—packing tiny quantization steps near 0 V so soft whispers enjoy ~24–30 dB SNR boost at 64 kbps.',
    systemConsequence:
      'Without companding, 8-bit uniform PCM suffers severe background hiss during quiet speech syllables and clips sudden loud consonants.',
    catTrap:
      'A-Law is piecewise linear near zero (for |x| < 1/A, y = A|x|/(1 + ln A)) and logarithmic above 1/A; μ-Law is logarithmic everywhere.',
    recommendedLab: LabType.COMPANDING,
    recommendedCalc: 'companding',
  },
  {
    id: 'fc-pcm-tdm',
    syllabusTopicId: 'pcm-tdm',
    module: SyllabusModule.PCM,
    title: 'TDM Frame Rate & T1 / E1 Multiplexing',
    catPriority: 'Critical',
    formulaDisplay: 'Rb = (N_ch · n + N_sync) · fs',
    variableLegend: [
      'N_ch : Number of multiplexed input channels',
      'n : Bits per sample per channel',
      'N_sync : Framing / signaling bits per TDM frame',
    ],
    promptQuestion:
      'How are 24 voice calls packed onto one T1 copper pair, and why are bit, word, and frame sync all required?',
    practicalApplication:
      'North American T1 (DS1) samples 24 channels at 8 kHz (125 μs frame) with 8 bits each plus 1 framing bit: (24×8 + 1) × 8,000 = 1.544 Mbps. European E1 uses 32 time slots (30 voice + 2 sync/signaling) × 8 × 8,000 = 2.048 Mbps.',
    systemConsequence:
      'If bit sync slips, bits smear; if word sync slips, MSB/LSB weights scramble; if frame sync is lost, caller #1’s voice routes into caller #2’s earpiece (crosstalk).',
    catTrap:
      'Do not forget the framing bit (+1 in T1 = 193 bits/frame) or extra synchronization slots when asked for total line rate.',
    recommendedCalc: 'tdm_frame',
  },
  {
    id: 'fc-pcm-noise-threshold',
    syllabusTopicId: 'pcm-noise-threshold',
    module: SyllabusModule.PCM,
    title: 'Overall PCM SNR & Threshold Collapse',
    catPriority: 'High',
    formulaDisplay: 'SNR_o = 1.5 / (2^(−2n) + 4·Pe)   (or 3·L² / (1 + 4·L²·Pe))',
    variableLegend: [
      'n : Bits per PCM word (L = 2^n)',
      'Pe : Channel bit error probability (function of Eb/N0)',
      'Threshold knee : Pe ≈ 10⁻⁵ (Eb/N0 ≈ 10–11 dB)',
    ],
    promptQuestion:
      'Why does PCM output audio stay crystal clear down to ~11 dB Eb/N0 and then abruptly collapse into harsh clicks?',
    practicalApplication:
      'In microwave and fiber-wireless backhaul links, link budgets maintain Eb/N0 ≥ 11 dB (Pe < 10⁻⁵) so 4·Pe ≪ 2^(−2n). Below that threshold, channel noise flips Most Significant Bits (MSBs), creating half-scale voltage spikes that drown out the signal.',
    systemConsequence:
      'Increasing quantizer bit depth n beyond 8–10 bits cannot improve output SNR if channel Pe dominates 4·Pe in the denominator.',
    catTrap:
      'When Pe → 0, SNR_o = 1.5 · 2^(2n), which in dB is 10·log10(1.5) + 20n·log10(2) = 1.76 + 6.02·n dB!',
    recommendedCalc: 'pcm_snr',
  },
  {
    id: 'fc-pcm-line-coding',
    syllabusTopicId: 'pcm-line-coding',
    module: SyllabusModule.PCM,
    title: 'Line Coding Trade-Offs (AMI vs. Manchester vs. NRZ)',
    catPriority: 'Critical',
    formulaDisplay: 'B_AMI = Rb   (Zero DC)   |   B_Manch = 2·Rb   (Self-Clocking)',
    variableLegend: [
      'Rb : Binary source bit rate (bps)',
      'AMI : 1s alternate +V / −V; 0s stay at 0 V',
      'Manchester : Mid-bit transition on every bit period Tb',
    ],
    promptQuestion:
      'Why can’t raw unipolar TTL pulses travel down transformer-coupled trunks, and how do AMI and Manchester solve it?',
    practicalApplication:
      'Bell T1 trunks used Bipolar AMI to block DC across isolation transformers and detect single-bit line errors via bipolar violations (with B8ZS/HDB3 zero substitution). Classic 10BASE-T Ethernet used Manchester so receivers recover bit clocks on every single bit.',
    systemConsequence:
      'Unipolar/Polar NRZ suffers baseline DC wander and PLL clock drift on long runs of identical bits; Manchester guarantees clock lock at the cost of double bandwidth.',
    catTrap:
      'Pure Bipolar AMI eliminates DC wander, NOT long zero-run clock loss—you need HDB3 or B8ZS scrambling to prevent long 0-runs.',
    recommendedLab: LabType.LINE_CODING,
  },

  // =========================================================================
  // MODULE 2: COMPRESSION TECHNIQUES
  // =========================================================================
  {
    id: 'fc-comp-shannon',
    syllabusTopicId: 'comp-shannon',
    module: SyllabusModule.COMPRESSION,
    title: 'Shannon-Hartley Capacity & Ultimate Power Limit',
    catPriority: 'Critical',
    formulaDisplay: 'C = B · log2(1 + S/N)   |   C_∞ = 1.44 · (S/N0)',
    variableLegend: [
      'C : Maximum error-free capacity (bps)',
      'B : Channel bandwidth (Hz)',
      'S/N : Linear signal-to-noise power ratio (NOT dB)',
    ],
    promptQuestion:
      'Why doesn’t widening channel bandwidth B to infinity produce infinite data capacity?',
    practicalApplication:
      'Deep-space probes (e.g., Voyager) operate in the power-limited regime with wide bandwidth and low S/N, approaching the Shannon limit Eb/N0 ≥ −1.59 dB using Turbo/LDPC codes. Cable modems and Wi-Fi operate in the bandwidth-limited regime using high S/N.',
    systemConsequence:
      'Because thermal noise power N = N0·B grows with bandwidth B, widening B eventually dilutes S/N until capacity saturates at 1.44·(S/N0).',
    catTrap:
      'Always convert SNR_dB to linear S/N = 10^(SNR_dB / 10) before substituting into log2(1 + S/N)!',
    recommendedCalc: 'shannon',
  },
  {
    id: 'fc-comp-dpcm',
    syllabusTopicId: 'comp-dpcm',
    module: SyllabusModule.COMPRESSION,
    title: 'Differential PCM (DPCM) & Prediction Gain',
    catPriority: 'High',
    formulaDisplay: 'SNR_DPCM = G_p · SNR_PCM   where   G_p = σ_x² / σ_e²',
    variableLegend: [
      'e[k] = x[k] − x̂[k] : Prediction error fed to quantizer',
      'G_p : Prediction gain (ratio of signal variance to error variance)',
      'x̂[k] = Σ a_i · x_q[k−i] : Closed-loop linear predictor',
    ],
    promptQuestion:
      'Why does the DPCM transmitter use reconstructed samples x_q[k−i] inside its predictor instead of raw inputs x[k−i]?',
    practicalApplication:
      'Adjacent voice and sensor samples are strongly correlated (r ≈ 0.85). Encoding only the small residual e[k] saves 2–3 bits per sample (cutting bit rate by 25–40%) while keeping the transmitter and receiver predictors locked to the exact same quantized history.',
    systemConsequence:
      'Using unquantized inputs x[k−i] at the transmitter causes quantization error to accumulate unboundedly (drift) between encoder and decoder.',
    catTrap:
      'In dB: SNR_DPCM(dB) = SNR_PCM(dB) + 10·log10(G_p). A G_p of 4 adds +6 dB (~1 bit saved per sample).',
  },
  {
    id: 'fc-comp-dm',
    syllabusTopicId: 'comp-dm',
    module: SyllabusModule.COMPRESSION,
    title: 'Delta Modulation (DM) Slope-Overload Condition',
    catPriority: 'Critical',
    formulaDisplay: 'Δ · fs ≥ 2π · fm · Am   |   Nq = (Δ² · W) / (3 · fs)',
    variableLegend: [
      'Δ : Fixed staircase step size (V)',
      'fs : Oversampled DM clock rate (Hz)',
      '2π·fm·Am : Peak slope of sine tone Am·sin(2π·fm·t)',
    ],
    promptQuestion:
      'How do you avoid both slope overload and granular noise in a 1-bit Delta Modulator?',
    practicalApplication:
      'Delta Modulation removes multi-bit ADCs and DACs entirely—just a comparator, 1-bit D-flip-flop, and integrator—making it ideal for ultra-low-cost instrumentation and early military tactical voice links at high oversampling (fs ≫ 2·fm).',
    systemConsequence:
      'If Δ·fs < 2π·fm·Am, the staircase lags steep signal edges (slope overload). Raising Δ too high fixes overload but introduces ±Δ sawtooth hunting on quiet segments (granular noise).',
    catTrap:
      'DM output SNR scales as fs³ (every doubling of fs adds +9 dB SNR!), whereas PCM only gains logarithmically.',
    recommendedLab: LabType.DELTA_MOD,
    recommendedCalc: 'delta_mod',
  },
  {
    id: 'fc-comp-adaptive',
    syllabusTopicId: 'comp-adaptive',
    module: SyllabusModule.COMPRESSION,
    title: 'Adaptive Coding (ADPCM & Adaptive DM)',
    catPriority: 'Exam Core',
    formulaDisplay: 'G.726 ADPCM = 32 kbps (4 bits/sample @ 8 kHz)',
    variableLegend: [
      'Δ[k] = M(|c[k−1]|) · Δ[k−1] : Adaptive step-size scaling',
      '4 bits/sample : Half the 64 kbps rate of G.711 PCM',
    ],
    promptQuestion:
      'How does ADPCM / ADM eliminate the fixed trade-off between slope overload and granular noise?',
    practicalApplication:
      'ITU-T G.726 ADPCM doubles telephone trunk capacity (32 kbps instead of 64 kbps) with near-identical toll quality by expanding Δ[k] rapidly during loud plosives/high slopes and shrinking Δ[k] during silent pauses.',
    systemConsequence:
      'Without adaptation, non-stationary human speech either clips fast consonant transients or sounds grainy during background pauses.',
    catTrap:
      'Backward adaptation estimates Δ[k] from past transmitted bits so no extra step-size sideband needs to be transmitted.',
    recommendedLab: LabType.DELTA_MOD,
  },
  {
    id: 'fc-comp-speech-vocoders',
    syllabusTopicId: 'comp-nonwaveform',
    module: SyllabusModule.COMPRESSION,
    title: 'Parametric Speech Codecs (LPC vs. CELP)',
    catPriority: 'Exam Core',
    formulaDisplay: 'LPC-10 ≈ 2.4 kbps   |   CELP ≈ 4.8 – 16 kbps',
    variableLegend: [
      'All-pole filter H(z) : Models human vocal-tract resonances',
      'Excitation : Pitch pulse (voiced) or noise (unvoiced) / codebook',
    ],
    promptQuestion:
      'Why does CELP sound dramatically more natural than basic 2.4 kbps LPC-10 on mobile cellular networks?',
    practicalApplication:
      'LPC-10 achieves military ultra-low bit rates (2.4 kbps) by sending vocal-tract filter weights + binary pitch/noise flags, sounding robotic. Cellular codecs (AMR / CELP) search an algebraic excitation codebook via perceptual analysis-by-synthesis to achieve natural voice at ~5–12 kbps.',
    systemConsequence:
      'Non-waveform speech vocoders fail completely on music or DTMF dial tones because those signals do not originate from a human vocal tract.',
    catTrap:
      'Distinguish clearly in exams: PCM/ADPCM/DM are waveform coders (signal-agnostic); LPC/CELP are parametric source-model coders (speech-specific).',
  },
  {
    id: 'fc-comp-media-codecs',
    syllabusTopicId: 'comp-nonwaveform',
    module: SyllabusModule.COMPRESSION,
    title: 'Transform & Motion Media Codecs (JPEG & MPEG)',
    catPriority: 'Exam Core',
    formulaDisplay: 'JPEG: 8×8 2D-DCT → Q-Table → RLE + Huffman   |   MPEG: + I/P/B Motion',
    variableLegend: [
      '2D-DCT : Packs 8×8 spatial pixel energy into low frequencies',
      'Q-Table : Irreversible lossy division dropping high-freq clutter',
      'I / P / B frames : Intra, forward-predicted, bidirectional video frames',
    ],
    promptQuestion:
      'Which step in JPEG actually discards information, and what extra dimension does MPEG compress?',
    practicalApplication:
      'JPEG achieves 10:1–20:1 photo compression by exploiting human visual insensitivity to high spatial frequencies and color subsampling (YCbCr). MPEG adds temporal motion vectors across frame groups (GOPs) so static backgrounds are not re-transmitted 30 times per second.',
    systemConsequence:
      'Over-aggressive quantization matrices create visible 8×8 blocking artifacts; losing an I-frame in MPEG corrupts dependent P/B frames until the next intra refresh.',
    catTrap:
      '2D-DCT and Huffman/RLE are lossless (reversible); ONLY chrominance subsampling and quantization-table division are lossy.',
  },

  // =========================================================================
  // MODULE 3: DIGITAL MODULATION SCHEMES
  // =========================================================================
  {
    id: 'fc-mod-metrics',
    syllabusTopicId: 'mod-metrics',
    module: SyllabusModule.MODULATION,
    title: 'Spectral Efficiency vs. Power Efficiency',
    catPriority: 'Critical',
    formulaDisplay: 'η = Rb / B_null (bps/Hz)   |   Rs = Rb / k   (k = log2 M)',
    variableLegend: [
      'Rb : Information bit rate (bps)',
      'Rs : Baud / symbol rate (symbols/sec)',
      'B_null : Null-to-null passband bandwidth (Hz)',
    ],
    promptQuestion:
      'How do M-ary symbols trade RF bandwidth against required transmitter power (Eb/N0)?',
    practicalApplication:
      'Fiber-fed Wi-Fi and 5G backhaul links have high SNR and scarce spectrum, so they push M = 64 or 256-QAM for high η. Power-starved satellite or IoT links drop down to BPSK/QPSK to survive at low Eb/N0.',
    systemConsequence:
      'Doubling bits per symbol k halves required bandwidth, but packing more constellation points into fixed average power shrinks Euclidean spacing and demands higher Eb/N0.',
    catTrap:
      'Never confuse baud rate Rs = Rb/k with bit rate Rb! Passband null-to-null bandwidth for PSK/QAM is 2·Rs = 2·Rb/k (except MSK which is 1.5·Rb).',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'fc-mod-bpsk-ask-bfsk',
    syllabusTopicId: 'mod-binary',
    module: SyllabusModule.MODULATION,
    title: 'Binary Error Hierarchy (BPSK vs. DPSK vs. ASK vs. BFSK)',
    catPriority: 'Critical',
    formulaDisplay: 'BPSK: Q(√(2Eb/N0))  |  ASK & Coh-BFSK: Q(√(Eb/N0))  |  DPSK: 0.5·e^(−Eb/N0)',
    variableLegend: [
      'Q(z) = 0.5·erfc(z/√2) : Gaussian tail probability',
      'Eb/N0 : Energy per bit to noise PSD ratio (linear)',
      '3 dB gap : Factor of 2 inside √(·) = 3.01 dB power penalty',
    ],
    promptQuestion:
      'Why does coherent BPSK beat both OOK-ASK and coherent orthogonal BFSK by exactly 3 dB?',
    practicalApplication:
      'Deep-space telemetry uses antipodal BPSK (±180°) because it maximizes Euclidean distance per unit average bit energy. Low-cost garage remotes and RFID tags often use OOK/ASK or non-coherent BFSK to avoid expensive phase-locked carrier recovery circuits.',
    systemConsequence:
      'In OOK, transmitting 0 V for "0" bits wastes zero energy on half the bits, halving average squared constellation distance for the same Eb; orthogonal BFSK vectors sit at 90° instead of 180°.',
    catTrap:
      'Coherent BFSK minimum orthogonal tone spacing is Δf = 1/(2·Tb) = Rb/2; non-coherent BFSK requires twice that: Δf = 1/Tb = Rb.',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'fc-mod-qpsk',
    syllabusTopicId: 'mod-mary',
    module: SyllabusModule.MODULATION,
    title: 'QPSK Orthogonality & Gray Coding',
    catPriority: 'High',
    formulaDisplay: 'B_QPSK = Rb   (η = 1.0 bps/Hz)   |   Pb_QPSK = Q(√(2·Eb/N0))',
    variableLegend: [
      'I & Q arms : Orthogonal cos(2πfct) and sin(2πfct) carriers',
      'k = 2 bits/sym : Each quadrant maps 00, 01, 11, 10 (Gray coded)',
    ],
    promptQuestion:
      'How does QPSK double BPSK spectral efficiency without needing a single extra dB of Eb/N0?',
    practicalApplication:
      'DVB-S satellite TV, GPS L1C/modernized links, and LTE control channels rely on QPSK because two independent BPSK streams ride cleanly on orthogonal sine/cosine carriers with zero cross-talk in AWGN.',
    systemConsequence:
      'Without Gray coding (e.g., placing 00 next to 11), a single noise threshold crossing flips 2 bits instead of 1, doubling BER.',
    catTrap:
      'Note the subtlety: QPSK uses the SAME Eb/N0 per bit as BPSK, which means total symbol energy Es = 2·Eb (+3 dB carrier power for 2× bit rate).',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'fc-mod-qam16',
    syllabusTopicId: 'mod-mary',
    module: SyllabusModule.MODULATION,
    title: '16-QAM Amplitude-Phase Packing & Amplifier Linearity',
    catPriority: 'High',
    formulaDisplay: 'B_16QAM = Rb / 2   (η = 2.0 bps/Hz)   |   Pb ≈ 0.75·Q(√(0.8·Eb/N0))',
    variableLegend: [
      'k = 4 bits/sym : 4×4 square grid across I and Q levels (±1, ±3)',
      'Power penalty : Requires ~4 dB more Eb/N0 than QPSK for 10⁻⁵ BER',
    ],
    promptQuestion:
      'Why does 16-QAM require highly linear RF power amplifiers unlike QPSK or MSK?',
    practicalApplication:
      'Cable DOCSIS, Wi-Fi (802.11), and 4G/5G cellular downlinks use 16-QAM/64-QAM to pack 4–6 bits per symbol when channel SNR is strong (>14 dB) and spectrum licenses are costly.',
    systemConsequence:
      'Because 16-QAM encodes information in both amplitude rings and phase, driving a saturated nonlinear amplifier compresses outer constellation corners (AM-AM / AM-PM distortion) and causes severe inter-symbol errors.',
    catTrap:
      'Inside the square root of 16-QAM BER: 0.8·Eb/N0 instead of 2·Eb/N0 → 2 / 0.8 = 2.5 (10·log10(2.5) ≈ +3.98 dB SNR penalty vs QPSK).',
    recommendedLab: LabType.DIGITAL_MOD,
    recommendedCalc: 'modulation',
  },
  {
    id: 'fc-mod-msk',
    syllabusTopicId: 'mod-mary',
    module: SyllabusModule.MODULATION,
    title: 'Minimum Shift Keying (MSK) & Constant Envelope',
    catPriority: 'High',
    formulaDisplay: 'Δf = Rb / 2 (h = 0.5)   |   B_null = 1.5·Rb   |   Pb = Q(√(2·Eb/N0))',
    variableLegend: [
      'h = Δf · Tb = 0.5 : Minimum orthogonal continuous-phase FSK index',
      'Sidelobe roll-off : 1/f⁴ (vs. 1/f² for unfiltered QPSK)',
    ],
    promptQuestion:
      'Why did GSM and satellite links choose MSK/GMSK over standard QPSK despite slightly wider main-lobe null bandwidth?',
    practicalApplication:
      'MSK is mathematically equivalent to Offset-QPSK with smooth half-sine pulse shaping. Its strictly constant RF amplitude lets mobile handsets and satellites run power-efficient saturated Class-C amplifiers without spectral regrowth into adjacent channels.',
    systemConsequence:
      'Standard QPSK experiences abrupt 180° phase reversals when both I and Q flip simultaneously, driving momentary zero-crossings that splatter sidelobes when passed through nonlinear PAs.',
    catTrap:
      'MSK achieves coherent BPSK error performance (3 dB better than coherent orthogonal BFSK) even though it is technically a form of FSK!',
    recommendedLab: LabType.DIGITAL_MOD,
  },
  {
    id: 'fc-mod-receivers',
    syllabusTopicId: 'mod-receivers',
    module: SyllabusModule.MODULATION,
    title: 'Matched Filter & Costas Loop Carrier Recovery',
    catPriority: 'Exam Core',
    formulaDisplay: 'h_opt(t) = s(T − t)   ⇒   SNR_max(T) = 2·Eb / N0',
    variableLegend: [
      'h_opt(t) : Time-reversed, delayed impulse response of pulse s(t)',
      'Sampling instant t = T : Exact peak autocorrelation alignment',
      'Costas / Squaring loop : Strips ±1 modulation to lock fc phase',
    ],
    promptQuestion:
      'Why does a standard PLL fail to lock onto BPSK, and how does a Costas loop overcome this?',
    practicalApplication:
      'Every coherent cellular, satellite, and Wi-Fi baseband receiver uses a matched filter (implemented digitally as an FIR correlator) preceded by an I/Q Costas loop or pilot-aided synchronizer to maximize pre-decision SNR in AWGN.',
    systemConsequence:
      'Because equiprobable ±1 BPSK phase flips cancel the average carrier tone at fc, an ordinary PLL sees zero spectral line; phase offset θ in the local oscillator attenuates output amplitude by cos(θ) and leaks I/Q crosstalk.',
    catTrap:
      'A squaring loop doubles the carrier frequency to 2·fc (yielding a ±180° phase ambiguity resolved via differential encoding!).',
  },
];

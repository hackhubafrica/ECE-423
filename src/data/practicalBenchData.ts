import { LabType, SyllabusModule } from '../types/ece423';

export type SensorExperimentId =
  | 'voltage'
  | 'current'
  | 'gas'
  | 'ultrasonic'
  | 'kicad_aaf';

export type ScriptLanguage = 'esp32' | 'python' | 'matlab';

export interface WiringNodeBridge {
  id: string;
  stepNum: number;
  label: string;
  pinOrPart: string;
  nominalSpec: string;
  lectureConcept: string;
  moduleTitle: string;
  whyItMatters: string;
  calcId?: string;
  labType?: LabType;
}

export interface SensorProbeSpec {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
}

export interface HardwareBenchLab {
  id: SensorExperimentId;
  shortLabel: string;
  title: string;
  hardwareTarget: string;
  esp32Pins: string[];
  ece423Topics: string[];
  module: SyllabusModule;
  recommendedLab?: LabType;
  objective: string;
  signalConditioning: string;
  benchProcedure: string[];
  safetyWarning: string;
  kicadComponents: { ref: string; value: string; purpose: string }[];
  probeSpec: SensorProbeSpec;
  interactiveNodes: WiringNodeBridge[];
}

export interface BenchScriptItem {
  id: string;
  language: ScriptLanguage;
  filename: string;
  title: string;
  environment: string;
  module: SyllabusModule;
  summary: string;
  howToRun: string[];
  code: string;
}

export const HARDWARE_BENCH_LABS: HardwareBenchLab[] = [
  {
    id: 'voltage',
    shortLabel: 'Voltage Sensor',
    title: 'Voltage Sensor: Nyquist Sampling, Aliasing & PCM Quantization',
    hardwareTarget: 'Resistive Divider / ZMPT101B → ESP32 GPIO34 (ADC1_CH6)',
    esp32Pins: ['GPIO34 (ADC1_CH6)', '3.3V Ref', 'GND'],
    ece423Topics: ['Nyquist Theorem', 'Aliasing Foldback', 'Uniform SQNR = 6.02n + 1.76 dB'],
    module: SyllabusModule.PCM,
    recommendedLab: LabType.SAMPLING_PCM,
    objective:
      'Sample a 50/60 Hz AC mains transformer step-down or PWM-modulated DC supply voltage on ESP32 ADC1, then intentionally drop sampling rate fs below 2·fm to witness aliasing in Spyder/MATLAB and the live browser scope.',
    signalConditioning:
      'ESP32 ADC pins strictly accept 0 to 3.3 V. Scale higher DC voltages using a precision 10 kΩ / 3.3 kΩ divider (or bias AC waveforms around 1.65 V midpoint via a 10 kΩ–10 kΩ divider + 10 µF coupling capacitor) and add a 100 nF anti-aliasing capacitor.',
    benchProcedure: [
      'Wire voltage divider output through a 1 kΩ + 100 nF RC anti-aliasing filter (fc ≈ 1.59 kHz) into GPIO34.',
      'Flash the ECE 423 ESP32 firmware and set SAMPLE_RATE_HZ = 1000 Hz (well above 2 × 50 Hz = 100 Hz).',
      'Stream live CSV into the Live Serial Monitor or Spyder, then truncate 12-bit samples down to 4-bit and 8-bit words to verify +6.02 dB SQNR improvement per bit.',
      'Lower SAMPLE_RATE_HZ to 70 Hz on a 50 Hz sine wave and measure the aliased 20 Hz beat tone (|70 − 50| = 20 Hz).',
    ],
    safetyWarning:
      'Never connect mains AC directly to the ESP32 or breadboard. Use an isolated low-voltage AC wall transformer (e.g., 6–12 VAC) or a 0–12 VDC bench supply, and always use ADC1 pins (GPIO32–39) if Wi-Fi is active.',
    kicadComponents: [
      { ref: 'R1', value: '10 kΩ (1%)', purpose: 'Upper divider / series anti-alias resistor' },
      { ref: 'R2', value: '3.3 kΩ (1%)', purpose: 'Lower divider scaling 13.3 V max → 3.3 V' },
      { ref: 'C1', value: '100 nF (X7R)', purpose: 'Anti-aliasing low-pass + ADC charge reservoir' },
      { ref: 'D1', value: 'BAT54S (Dual Schottky)', purpose: 'Clamps GPIO34 safely between 0 V and 3.3 V' },
    ],
    probeSpec: {
      label: 'Test Supply Voltage (V_in)',
      unit: 'V',
      min: 0,
      max: 12,
      step: 0.5,
      defaultVal: 8.0,
    },
    interactiveNodes: [
      {
        id: 'source',
        stepNum: 1,
        label: 'Isolated Input Source',
        pinOrPart: '0–12 V Bench Supply / Step-Down AC',
        nominalSpec: 'V_in up to 12.0 V peak · Common GND',
        lectureConcept: 'Continuous Analog Message m(t) & Peak Amplitude V_p',
        moduleTitle: 'Module 2 · Sampling & PCM',
        whyItMatters:
          'Represents the continuous-time physical signal m(t) before sampling. Its maximum excursion V_p determines the quantizer full-scale span and whether clipping distortion occurs.',
        calcId: 'pcm_snr',
        labType: LabType.SAMPLING_PCM,
      },
      {
        id: 'divider',
        stepNum: 2,
        label: 'Precision Divider (R1 / R2)',
        pinOrPart: 'R1 = 10 kΩ, R2 = 3.3 kΩ (Gain = 0.248)',
        nominalSpec: 'V_div = V_in × 3.3 / (10 + 3.3)',
        lectureConcept: 'Dynamic Range Matching & Full-Scale Scaling',
        moduleTitle: 'Module 2 · Quantization & SQNR',
        whyItMatters:
          'Scales the input so peak amplitude maps neatly inside the ADC linear window without saturation, maximizing usable quantization levels L = 2^n and preserving SQNR = 6.02n + 1.76 dB.',
        calcId: 'pcm_snr',
        labType: LabType.SAMPLING_PCM,
      },
      {
        id: 'aaf',
        stepNum: 3,
        label: 'Schottky Clamp + Anti-Aliasing RC',
        pinOrPart: 'BAT54S + C1 = 100 nF (fc ≈ 640 Hz w/ R_th)',
        lectureConcept: 'Shannon–Nyquist Bandlimiting (f_c ≤ f_s / 2)',
        nominalSpec: 'Clamped 0–3.3 V · −20 dB/decade above f_c',
        moduleTitle: 'Module 2 · Nyquist Theorem',
        whyItMatters:
          'Attenuates high-frequency switching noise above f_s/2 before the ADC sample-and-hold switch closes, preventing out-of-band energy from folding back as aliasing distortion.',
        calcId: 'nyquist',
        labType: LabType.SAMPLING_PCM,
      },
      {
        id: 'adc',
        stepNum: 4,
        label: 'ESP32 SAR ADC Pin',
        pinOrPart: 'GPIO34 (ADC1_CH6) · Input-Only Pin',
        nominalSpec: '12-bit word (0..4095), Δ = 0.806 mV',
        lectureConcept: 'Sampling, Uniform Quantization & Binary Encoding',
        moduleTitle: 'Module 2 · PCM Coding',
        whyItMatters:
          'Performs the physical A/D conversion at timer rate f_s, mapping each held sample to a 12-bit integer that we truncate to 4–8 bits in software to measure real quantization error.',
        calcId: 'pcm_snr',
        labType: LabType.SAMPLING_PCM,
      },
    ],
  },
  {
    id: 'current',
    shortLabel: 'Current Sensor',
    title: 'Current Sensor: μ-Law Companding & Dynamic Range Compression',
    hardwareTarget: 'ACS712 (5A/20A) or INA219 → ESP32 GPIO35 (ADC1_CH7)',
    esp32Pins: ['GPIO35 (ADC1_CH7)', '5V / 3.3V Supply', 'GND'],
    ece423Topics: ['μ-Law Companding (μ=255)', 'A-Law (A=87.6)', 'Non-Uniform Quantization'],
    module: SyllabusModule.PCM,
    recommendedLab: LabType.COMPANDING,
    objective:
      'Measure switched DC load current (idle LED/standby mA vs high-current motor or resistor surge) to see why uniform quantization buries quiet currents while μ-Law companding preserves weak-signal accuracy.',
    signalConditioning:
      'An ACS712 powered at 5 V rests at 2.5 V and swings up to 4.5 V on peaks—use a 2.2 kΩ / 3.3 kΩ resistor divider (ratio 0.60) so 4.5 V scales down to 2.7 V safely inside the ESP32 3.3 V ADC range.',
    benchProcedure: [
      'Connect ACS712 VOUT through the 2.2 kΩ / 3.3 kΩ divider into GPIO35 with a 100 nF bypass cap to GND.',
      'Record a mixed load profile: 3 seconds of quiet standby current followed by a switched motor/resistor load pulse.',
      'Run the Python/MATLAB PCM & Companding script on the captured CSV and compare 6-bit uniform PCM error vs 6-bit μ-Law (μ=255) error during the quiet standby region.',
      'Inspect the non-uniform step spacing gain (+20 to +28 dB boost for small currents).',
    ],
    safetyWarning:
      'Verify ACS712 VCC/VOUT divider ratio with a multimeter before attaching GPIO35. Never feed raw 5 V ACS712 output directly into an ESP32 pin.',
    kicadComponents: [
      { ref: 'R3', value: '2.2 kΩ', purpose: 'Top resistor of 5 V → 3.0 V divider' },
      { ref: 'R4', value: '3.3 kΩ', purpose: 'Bottom divider resistor to GND' },
      { ref: 'C2', value: '100 nF', purpose: 'Filter switching brush noise before ADC' },
      { ref: 'C3', value: '10 µF', purpose: 'ACS712 5 V rail decoupling near sensor' },
    ],
    probeSpec: {
      label: 'Load Current (I_load)',
      unit: 'A',
      min: 0,
      max: 5.0,
      step: 0.25,
      defaultVal: 1.5,
    },
    interactiveNodes: [
      {
        id: 'hall',
        stepNum: 1,
        label: 'ACS712 Hall-Effect Core',
        pinOrPart: 'IP+ / IP- Series Load · VCC = 5 V + C3 10 µF',
        nominalSpec: 'V_out = 2.50 V + 0.185 V/A (5A variant)',
        lectureConcept: 'High Crest-Factor Signals (Standby vs Surge)',
        moduleTitle: 'Module 2 · Non-Uniform Quantization',
        whyItMatters:
          'Switched loads exhibit huge dynamic range: tiny milliamps at idle and multi-amp spikes at startup, mirroring speech signals where quiet passages suffer under uniform quantization.',
        calcId: 'companding',
        labType: LabType.COMPANDING,
      },
      {
        id: 'divider',
        stepNum: 2,
        label: '5 V → 3.0 V Level Divider',
        pinOrPart: 'R3 = 2.2 kΩ, R4 = 3.3 kΩ (Gain = 0.600)',
        nominalSpec: '2.50 V zero-A → 1.50 V · 4.50 V → 2.70 V',
        lectureConcept: 'Bipolar Mid-Riser Centering (x_norm around 0)',
        moduleTitle: 'Module 2 · μ-Law Companding',
        whyItMatters:
          'Maps the ACS712 2.5 V zero-current bias neatly near 1.50 V (the ADC midpoint), letting software normalize bipolar current excursions cleanly into x ∈ [−1, +1] for μ-Law compression.',
        calcId: 'companding',
        labType: LabType.COMPANDING,
      },
      {
        id: 'filter',
        stepNum: 3,
        label: 'Brush-Noise Bypass LPF',
        pinOrPart: 'C2 = 100 nF across R4 (fc ≈ 1.21 kHz)',
        nominalSpec: 'Suppresses DC motor PWM spikes > 2 kHz',
        lectureConcept: 'Anti-Aliasing Filter Before Low-Rate Telemetry',
        moduleTitle: 'Module 2 · Sampling Theorem',
        whyItMatters:
          'Motor commutation creates wide-band impulses that would alias into the 0–100 Hz telemetry band if unattenuated prior to ADC sampling.',
        calcId: 'nyquist',
        labType: LabType.SAMPLING_PCM,
      },
      {
        id: 'adc',
        stepNum: 4,
        label: 'ESP32 ADC1_CH7 + μ-Law Coder',
        pinOrPart: 'GPIO35 → 8-bit μ-Law (μ = 255) Packet',
        nominalSpec: 'Fine Δ near 0 A · Coarse Δ near 5 A',
        lectureConcept: 'Logarithmic Compression y = sgn(x)·ln(1+μ|x|)/ln(1+μ)',
        moduleTitle: 'Module 2 · Companding Gain',
        whyItMatters:
          'Compressing the normalized current reading yields near-constant SQNR across both milliamp idle currents and multi-amp surges using only 5–8 bits per sample.',
        calcId: 'companding',
        labType: LabType.COMPANDING,
      },
    ],
  },
  {
    id: 'gas',
    shortLabel: 'Gas Sensor',
    title: 'Gas Sensor (MQ-2 / MQ-135): DPCM & Delta Modulation Slope Overload',
    hardwareTarget: 'MQ-2 / MQ-135 Analog Output → ESP32 GPIO32 (ADC1_CH4)',
    esp32Pins: ['GPIO32 (ADC1_CH4)', '5V Heater Rail', 'GND'],
    ece423Topics: ['DPCM Prediction Filter', 'Delta Modulation (DM)', 'Slope Overload vs Granular Noise'],
    module: SyllabusModule.COMPRESSION,
    recommendedLab: LabType.DELTA_MOD,
    objective:
      'Exploit the high sample-to-sample correlation of a gas sensor concentration curve to compress samples with DPCM and 1-bit Delta Modulation, triggering real granular noise during clean air and slope overload during a sudden vapor puff.',
    signalConditioning:
      'MQ-series heaters draw ~150 mA at 5 V (power the MQ module from an external 5 V supply or VIN with shared GND, never from the ESP32 3.3 V regulator!). Scale AOUT (0–5 V) via a 10 kΩ / 18 kΩ divider into GPIO32.',
    benchProcedure: [
      'Pre-warm the MQ-2/MQ-135 sensor for 60–120 seconds in clean air so baseline voltage stabilizes.',
      'Stream samples at 200 Hz in the Live Serial Monitor with Coding Stage set to 1-Bit Delta Modulation.',
      'Observe ±Δ granular hunting noise while baseline air is flat; shrink Δ to 0.05 V to reduce hunting.',
      'Introduce a brief alcohol swab or lighter gas puff (unlit!) near the mesh to cause a steep rising edge—watch the DM staircase lag behind in Slope Overload.',
    ],
    safetyWarning:
      'Do not ignite gas near the MQ sensor and do not draw heater current from the ESP32 3.3 V pin. Keep AOUT scaled below 3.3 V.',
    kicadComponents: [
      { ref: 'R5', value: '10 kΩ', purpose: 'Upper divider from MQ AOUT (5 V max)' },
      { ref: 'R6', value: '18 kΩ', purpose: 'Lower divider scaling 5 V → 3.21 V' },
      { ref: 'C4', value: '220 nF', purpose: 'Smooth high-frequency ADC thermal jitter' },
      { ref: 'U2', value: 'MQ-2 / MQ-135 Header', purpose: '5 V heater + AOUT + shared GND' },
    ],
    probeSpec: {
      label: 'MQ Sensor AOUT (Before Divider)',
      unit: 'V',
      min: 0.4,
      max: 4.8,
      step: 0.2,
      defaultVal: 1.2,
    },
    interactiveNodes: [
      {
        id: 'heater',
        stepNum: 1,
        label: 'External 5 V Heater & Star Ground',
        pinOrPart: 'VIN / External 5 V (~150 mA) → MQ H-H Coil',
        nominalSpec: 'Isolated high-current return to Star GND',
        lectureConcept: 'Channel Noise Floor & Ground-Loop Isolation',
        moduleTitle: 'Module 4 · Signal-to-Noise Baseline',
        whyItMatters:
          'Separating the 150 mA heater ground return prevents voltage ripple from injecting artificial noise into nearby ADC channels, keeping granular noise measurements accurate.',
        calcId: 'delta_mod',
        labType: LabType.DELTA_MOD,
      },
      {
        id: 'sensing',
        stepNum: 2,
        label: 'SnO₂ Sensing Element (AOUT)',
        pinOrPart: 'MQ AOUT = 5 V × RL / (Rs + RL)',
        nominalSpec: 'Slow baseline (~0.6 V) · Steep vapor transient',
        lectureConcept: 'Sample-to-Sample Autocorrelation R_x(1) & Slope |dm/dt|',
        moduleTitle: 'Module 4 · Predictive Coding (DPCM)',
        whyItMatters:
          'Gas diffusion changes slowly over seconds (high correlation R_x(1) → big DPCM prediction gain), except during sudden vapor puffs where |dm/dt| tests the Delta Modulator slew limit.',
        calcId: 'delta_mod',
        labType: LabType.DELTA_MOD,
      },
      {
        id: 'divider',
        stepNum: 3,
        label: 'Divider + Thermal LPF (R5 / R6 / C4)',
        pinOrPart: 'R5 = 10 kΩ, R6 = 18 kΩ, C4 = 220 nF',
        nominalSpec: 'Gain = 0.643 (4.8 V → 3.09 V) · fc ≈ 112 Hz',
        lectureConcept: 'Slew-Rate Bounding & Thermal Noise Filtering',
        moduleTitle: 'Module 4 · Delta Modulation Trade-Off',
        whyItMatters:
          'Caps the maximum analog slew rate entering GPIO32 and removes high-frequency thermal jitter so your 1-bit Delta Modulator tracks cleanly at 200 Hz.',
        calcId: 'delta_mod',
        labType: LabType.DELTA_MOD,
      },
      {
        id: 'adc',
        stepNum: 4,
        label: 'ESP32 ADC1_CH4 + 1-Bit DM',
        pinOrPart: 'GPIO32 → 1-bit b[k] stream (b ∈ {0, 1})',
        nominalSpec: 'Max tracking slope = Δ · f_s (V/s)',
        lectureConcept: 'Slope Overload (|dm/dt| > Δ·f_s) vs Granular Noise',
        moduleTitle: 'Module 4 · Delta Modulation',
        whyItMatters:
          'Reduces telemetry to 1 bit/sample. Comparing raw GPIO32 voltage against the reconstructed DM staircase lets you observe both flat-air granular hunting and vapor-puff slope overload live.',
        calcId: 'delta_mod',
        labType: LabType.DELTA_MOD,
      },
    ],
  },
  {
    id: 'ultrasonic',
    shortLabel: 'Ultrasonic Sensor',
    title: 'Ultrasonic HC-SR04: TDM Framing, Sync & Line Coding',
    hardwareTarget: 'HC-SR04 → Trig GPIO18, Echo GPIO19 (via 1kΩ/2kΩ divider) + Line Out GPIO25',
    esp32Pins: ['GPIO18 (TRIG Out)', 'GPIO19 (ECHO In 3.3V)', 'GPIO25 (Line Code Out)'],
    ece423Topics: ['TDM Frame Multiplexing', 'Frame Alignment Word (0xAA55)', 'Manchester & Bipolar AMI'],
    module: SyllabusModule.PCM,
    recommendedLab: LabType.LINE_CODING,
    objective:
      'Multiplex ultrasonic distance words together with Voltage, Current, and Gas ADC words into fixed TDM frames with a Frame Alignment Word, and emit Manchester or NRZ pulses on GPIO25 for real timing verification.',
    signalConditioning:
      'HC-SR04 ECHO outputs a 5 V TTL pulse. Step it down safely to 3.3 V using a 1 kΩ series resistor into GPIO19 with a 2 kΩ resistor to GND (5 V × 2/3 = 3.33 V).',
    benchProcedure: [
      'Wire TRIG to GPIO18 and ECHO through the 1 kΩ / 2 kΩ resistor divider into GPIO19.',
      'Sweep your hand in front of the transducers (5 cm to 80 cm) and inspect the live TDM Frame Decoder in the Live Serial Monitor.',
      'Notice how Frame Sync bytes (0xAA, 0x55) lock all four sensor slots (Voltage, Current, Gas, Distance) cleanly inside every frame.',
      'Optionally probe GPIO25 with a scope or logic analyzer (or feed the exported bitstream into Python/MATLAB) to inspect Manchester mid-bit clock transitions vs NRZ.',
    ],
    safetyWarning:
      'Always use the 1 kΩ / 2 kΩ voltage divider on HC-SR04 ECHO. Driving GPIO19 with an undivided 5 V pulse risks permanent pin damage.',
    kicadComponents: [
      { ref: 'R7', value: '1 kΩ', purpose: 'ECHO 5 V series drop resistor' },
      { ref: 'R8', value: '2 kΩ', purpose: 'ECHO pull-down to GND (yields 3.33 V high)' },
      { ref: 'R9', value: '330 Ω', purpose: 'GPIO25 series damping resistor for line-code probing' },
    ],
    probeSpec: {
      label: 'Target Distance (d)',
      unit: 'cm',
      min: 5,
      max: 100,
      step: 5,
      defaultVal: 35,
    },
    interactiveNodes: [
      {
        id: 'trig',
        stepNum: 1,
        label: 'Trigger Pulse (GPIO18 → TRIG)',
        pinOrPart: 'GPIO18 Output · 10 µs 3.3 V CMOS Pulse',
        nominalSpec: '3.3 V logic high satisfies HC-SR04 TTL VIH ≥ 2.0 V',
        lectureConcept: 'Frame Timing & Periodic TDM Slot Polling',
        moduleTitle: 'Module 2 · Time-Division Multiplexing',
        whyItMatters:
          'Triggering at a sub-multiple of the ADC timer keeps the 4-channel TDM frame cadence deterministic without stalling Voltage/Current/Gas sampling.',
        calcId: 'tdm',
        labType: LabType.LINE_CODING,
      },
      {
        id: 'echo',
        stepNum: 2,
        label: '5 V → 3.3 V ECHO Shifter (R7 / R8)',
        pinOrPart: 'ECHO 5 V → R7 (1 kΩ) → GPIO19 ← R8 (2 kΩ) → GND',
        nominalSpec: 'V_echo_pin = 5.0 × 2 / (1 + 2) = 3.33 V',
        lectureConcept: 'Pulse-Width Modulation (PWM) Time-of-Flight',
        moduleTitle: 'Module 2 · Pulse Timing & Sampling',
        whyItMatters:
          'The return echo pulse width T_echo = 2d / 34300 encodes physical distance in time rather than amplitude, then digitizes into an 8-bit TDM slot alongside analog ADC words.',
        calcId: 'tdm',
        labType: LabType.LINE_CODING,
      },
      {
        id: 'tdm',
        stepNum: 3,
        label: 'TDM Frame Multiplexer + Line Out',
        pinOrPart: 'Sync (0xAA 0x55) + 4 Sensor Slots · GPIO25 (330 Ω)',
        nominalSpec: '6-byte TDM Frame · Manchester / NRZ Probe',
        lectureConcept: 'Frame Alignment Word & Self-Clocking Line Codes',
        moduleTitle: 'Module 3 · Baseband Line Coding',
        whyItMatters:
          'Adding 0xAA 0x55 lets the receiver recover frame boundaries, while Manchester encoding on GPIO25 guarantees a mid-bit transition every symbol for clock recovery.',
        calcId: 'tdm',
        labType: LabType.LINE_CODING,
      },
    ],
  },
  {
    id: 'kicad_aaf',
    shortLabel: 'KiCad Front-End',
    title: 'KiCad Analog Front-End: Anti-Aliasing Filter & 3.3 V Protection Shield',
    hardwareTarget: 'Custom ESP32 ECE 423 Bench Shield Schematic (KiCad 7/8)',
    esp32Pins: ['GPIO34 (V)', 'GPIO35 (I)', 'GPIO32 (Gas)', 'GPIO18/19 (HC-SR04)', '3V3 / VIN / GND'],
    ece423Topics: ['Anti-Aliasing LPF fc = 1/(2πRC)', 'Nyquist Guard Band', 'ADC Input Impedance'],
    module: SyllabusModule.PCM,
    recommendedLab: LabType.SAMPLING_PCM,
    objective:
      'Design a clean, reproducible KiCad schematic and PCB shield uniting all four sensors with proper RC anti-aliasing filters, Schottky rail clamping, and star-ground decoupling before your ESP32 ADC.',
    signalConditioning:
      'Set the RC pole fc below fs/2 (typically fc ≈ fs / 4 to fs / 5) using 1 kΩ–10 kΩ source resistance so the ESP32 SAR ADC sample-and-hold capacitor charges accurately without sagging.',
    benchProcedure: [
      'Use the interactive RC Cutoff Sizer on this page to pick standard E12 resistor and capacitor values for your target sampling rate fs.',
      'In KiCad Schematic Editor, place an ESP32-WROOM-32 DevKit footprint plus 4 JST/pin-header sensor ports.',
      'Add each channel’s divider + RC anti-aliasing filter + BAT54S clamp diode close to the ESP32 ADC pins.',
      'Keep the 5 V MQ heater return trace separate from the clean analog GND pour (star-ground at the power jack) to eliminate heater noise on Voltage/Current ADC readings.',
    ],
    safetyWarning:
      'Verify ESP32 ADC linearity: ESP32 SAR ADCs are most linear between 150 mV and 2.6 V. Keep full-scale sensor swings within 0.2–2.8 V for cleanest SQNR.',
    kicadComponents: [
      { ref: 'J1–J4', value: 'JST-XH / 2.54mm Headers', purpose: 'Plug-and-play Voltage, Current, Gas, Ultrasonic ports' },
      { ref: 'D1–D3', value: 'BAT54S SOT-23', purpose: 'Dual Schottky clamp diodes on ADC1 channels' },
      { ref: 'C_AAF', value: '100 nF NP0/X7R', purpose: 'Anti-aliasing LPF capacitors at ADC pins' },
      { ref: 'C_BULK', value: '100 µF + 100 nF', purpose: '5 V and 3.3 V supply rail decoupling' },
    ],
    probeSpec: {
      label: 'Shield Channel Input (V_scaled)',
      unit: 'V',
      min: 0,
      max: 5.0,
      step: 0.2,
      defaultVal: 2.5,
    },
    interactiveNodes: [
      {
        id: 'headers',
        stepNum: 1,
        label: 'Sensor Header Bank (J1–J4)',
        pinOrPart: 'J1 Voltage · J2 ACS712 · J3 MQ Gas · J4 HC-SR04',
        nominalSpec: 'Keyed JST-XH connectors prevent reverse polarity',
        lectureConcept: '4-Channel Multi-Sensor Source Multiplexing',
        moduleTitle: 'Module 2 · TDM & Multi-Channel Acquisition',
        whyItMatters:
          'Standardizes physical harness connections so all four sensors feed deterministically into the ESP32 TDM acquisition loop.',
        calcId: 'tdm',
        labType: LabType.SAMPLING_PCM,
      },
      {
        id: 'clamp',
        stepNum: 2,
        label: 'BAT54S Rail Clamp + RC Filter Bank',
        pinOrPart: 'D1–D3 BAT54S + RC AAF placed ≤ 5 mm from ADC pins',
        nominalSpec: '0 V − 0.3 V ≤ V_pin ≤ 3.3 V + 0.3 V',
        lectureConcept: 'Nyquist Guard Band & Hardware Anti-Aliasing',
        moduleTitle: 'Module 2 · Anti-Aliasing Design',
        whyItMatters:
          'Hardware low-pass filtering cannot be replaced by post-sampling software DSP—once out-of-band frequencies alias into the sampled spectrum, no digital filter can separate them.',
        calcId: 'nyquist',
        labType: LabType.SAMPLING_PCM,
      },
      {
        id: 'star_gnd',
        stepNum: 3,
        label: 'Star Ground & Rail Decoupling',
        pinOrPart: 'C_BULK 100 µF + 100 nF · Split Analog/Heater GND',
        nominalSpec: 'Isolates 150 mA MQ heater & HC-SR04 surge current',
        lectureConcept: 'Channel Noise Floor N0 & Effective SQNR',
        moduleTitle: 'Module 1 · Noise & Channel Capacity',
        whyItMatters:
          'Minimizing shared-ground IR drops lowers analog front-end noise variance σ_n², preserving effective number of bits (ENOB) on the ESP32 SAR ADC.',
        calcId: 'shannon',
        labType: LabType.SAMPLING_PCM,
      },
    ],
  },
];

export const BENCH_SCRIPT_PACK: BenchScriptItem[] = [
  {
    id: 'script-esp32-ino',
    language: 'esp32',
    filename: 'ece423_esp32_bench.ino',
    title: 'ESP32 Multi-Sensor PCM, Delta Mod & TDM Firmware',
    environment: 'Arduino IDE 2.x / PlatformIO · 115200 Baud UART',
    module: SyllabusModule.PCM,
    summary:
      'Samples Voltage (GPIO34), Current (GPIO35), Gas (GPIO32), and HC-SR04 Ultrasonic (GPIO18/19) at a fixed timer rate, computes 1-bit Delta Modulation + μ-Law byte, and streams clean CSV packets compatible with this app, Spyder, and MATLAB.',
    howToRun: [
      'Open in Arduino IDE or PlatformIO and select your ESP32 Dev Module board.',
      'Verify sensors are scaled to 0–3.3 V (see Hardware & KiCad tab) and upload at 115200 baud.',
      'Close Arduino Serial Monitor, then click Connect ESP32 in the Live Capture tab (or run the Spyder/MATLAB serial logger).',
    ],
    code: `// ECE 423 Digital Communication Systems — ESP32 Practical Bench Firmware
// Streams: t_ms, v_volts, i_amps_proxy, gas_volts, dist_cm, dm_bit, mulaw_byte
// Wiring: V_IN->GPIO34, I_IN->GPIO35, GAS_IN->GPIO32, TRIG->GPIO18, ECHO(3.3V)->GPIO19

#include <Arduino.h>
#include <math.h>

const int PIN_VOLT = 34; // ADC1_CH6
const int PIN_CURR = 35; // ADC1_CH7
const int PIN_GAS  = 32; // ADC1_CH4
const int PIN_TRIG = 18; // HC-SR04 Trig
const int PIN_ECHO = 19; // HC-SR04 Echo (scaled to 3.3V via 1k/2k divider)

// Adjust SAMPLE_RATE_HZ to test Nyquist vs Aliasing (e.g., 200 Hz nominal vs 70 Hz aliased)
const uint32_t SAMPLE_RATE_HZ = 200;
const uint32_t SAMPLE_PERIOD_US = 1000000UL / SAMPLE_RATE_HZ;

// Delta Modulation parameters on Voltage channel
const float DM_STEP_V = 0.08f;
float dmEstimateV = 1.65f;

// Ultrasonic polled every N samples so ADC timing stays deterministic
uint32_t sampleCount = 0;
float lastDistCm = 0.0f;
uint32_t lastSampleUs = 0;

uint8_t muLawCompress8Bit(float xNorm) {
  const float mu = 255.0f;
  float ax = fabsf(xNorm);
  if (ax > 1.0f) ax = 1.0f;
  float y = logf(1.0f + mu * ax) / logf(1.0f + mu);
  if (xNorm < 0.0f) y = -y;
  int q = (int)roundf((y + 1.0f) * 127.5f);
  if (q < 0) q = 0;
  if (q > 255) q = 255;
  return (uint8_t)q;
}

float readUltrasonicFastCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  // Short 6 ms timeout (~100 cm max) to protect sampling loop cadence
  unsigned long dur = pulseIn(PIN_ECHO, HIGH, 6000UL);
  if (dur == 0) return lastDistCm;
  return (dur * 0.0343f) * 0.5f;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // 0..4095
  analogSetAttenuation(ADC_11db); // Full 0..3.3V span
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  delay(300);
  Serial.println("t_ms,v_volts,i_volts,gas_volts,dist_cm,dm_bit,mulaw_u8");
  lastSampleUs = micros();
}

void loop() {
  uint32_t nowUs = micros();
  if ((uint32_t)(nowUs - lastSampleUs) < SAMPLE_PERIOD_US) {
    return;
  }
  lastSampleUs += SAMPLE_PERIOD_US;

  float vVolts   = (analogRead(PIN_VOLT) / 4095.0f) * 3.3f;
  float iVolts   = (analogRead(PIN_CURR) / 4095.0f) * 3.3f;
  float gasVolts = (analogRead(PIN_GAS)  / 4095.0f) * 3.3f;

  // Poll ultrasonic every 20 samples (~10 Hz at 200 Hz ADC)
  if (sampleCount % 20 == 0) {
    lastDistCm = readUltrasonicFastCm();
  }
  sampleCount++;

  // 1-bit Delta Modulation step
  int dmBit = (vVolts >= dmEstimateV) ? 1 : 0;
  dmEstimateV += (dmBit == 1) ? DM_STEP_V : -DM_STEP_V;

  // Center Voltage around 1.65 V midpoint for bipolar mu-Law companding
  float xNorm = (vVolts - 1.65f) / 1.65f;
  uint8_t muCode = muLawCompress8Bit(xNorm);

  Serial.print(millis());
  Serial.print(',');
  Serial.print(vVolts, 4);
  Serial.print(',');
  Serial.print(iVolts, 4);
  Serial.print(',');
  Serial.print(gasVolts, 4);
  Serial.print(',');
  Serial.print(lastDistCm, 2);
  Serial.print(',');
  Serial.print(dmBit);
  Serial.print(',');
  Serial.println(muCode);
}
`,
  },
  {
    id: 'script-py-serial',
    language: 'python',
    filename: 'ece423_esp32_serial_logger.py',
    title: 'Spyder Live ESP32 Serial Logger & Quick Plot',
    environment: 'Python 3 · Spyder IDE (pyserial, pandas, matplotlib)',
    module: SyllabusModule.PCM,
    summary:
      'Captures N samples directly from your ESP32 USB port in Spyder cells, saves a timestamped CSV file, and plots all four physical channels (Voltage, Current, Gas, Ultrasonic).',
    howToRun: [
      'Install pyserial once if needed: pip install pyserial pandas matplotlib',
      'Set PORT to your ESP32 port (e.g., "COM5" on Windows or "/dev/ttyUSB0" on Linux).',
      'Run cells step-by-step in Spyder using Ctrl+Enter.',
    ],
    code: `#%% ECE 423 Practical Bench — Spyder Live ESP32 Serial Capture
import time
import serial
import pandas as pd
import matplotlib.pyplot as plt

PORT = "COM5"        # Change to "/dev/ttyUSB0" or "/dev/cu.usbserial-..."
BAUD = 115200
NUM_SAMPLES = 600    # 3 seconds at 200 Hz
OUT_CSV = "esp32_bench_capture.csv"

#%% Cell 2: Stream CSV packets from ESP32
rows = []
with serial.Serial(PORT, BAUD, timeout=1.0) as ser:
    ser.reset_input_buffer()
    print(f"Capturing {NUM_SAMPLES} samples from {PORT}...")
    while len(rows) < NUM_SAMPLES:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if not line or line.startswith("t_ms"):
            continue
        parts = line.split(",")
        if len(parts) >= 5:
            try:
                rows.append({
                    "t_ms": float(parts[0]),
                    "v_volts": float(parts[1]),
                    "i_volts": float(parts[2]),
                    "gas_volts": float(parts[3]),
                    "dist_cm": float(parts[4]),
                })
            except ValueError:
                pass

df = pd.DataFrame(rows)
df["t_sec"] = (df["t_ms"] - df["t_ms"].iloc[0]) / 1000.0
df.to_csv(OUT_CSV, index=False)
print(f"Saved {len(df)} samples to {OUT_CSV}")

#%% Cell 3: Plot Captured Sensor Channels in Spyder Plots Pane
fig, axes = plt.subplots(4, 1, figsize=(10, 8), sharex=True)
axes[0].plot(df["t_sec"], df["v_volts"], color="#0284c7")
axes[0].set_ylabel("Voltage (V)")
axes[0].set_title("ESP32 Multi-Sensor Bench Capture")

axes[1].plot(df["t_sec"], df["i_volts"], color="#059669")
axes[1].set_ylabel("Current Proxy (V)")

axes[2].plot(df["t_sec"], df["gas_volts"], color="#d97706")
axes[2].set_ylabel("Gas MQ (V)")

axes[3].step(df["t_sec"], df["dist_cm"], where="post", color="#0f172a")
axes[3].set_ylabel("Ultrasonic (cm)")
axes[3].set_xlabel("Time (s)")
plt.tight_layout()
plt.show()
`,
  },
  {
    id: 'script-py-pcm',
    language: 'python',
    filename: 'ece423_pcm_companding_lab.py',
    title: 'Spyder PCM Quantization, μ-Law Companding & Aliasing Lab',
    environment: 'Python 3 · Spyder IDE (numpy, matplotlib)',
    module: SyllabusModule.PCM,
    summary:
      'Loads your ESP32 CSV (or generates a dual-tone waveform if offline), sweeps bit depth n = 2..8 to verify SQNR = 6.02n + 1.76 dB, compares Uniform vs μ-Law quantization on quiet samples, and visualizes FFT aliasing.',
    howToRun: [
      'Save exported CSV from Live Capture (or esp32_bench_capture.csv) in your Spyder working folder.',
      'Run cells sequentially in Spyder to inspect SQNR tables and Matplotlib figures.',
    ],
    code: `#%% ECE 423 — PCM Quantization, Companding & Nyquist Aliasing (Spyder)
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

CSV_PATH = "esp32_bench_capture.csv"

if os.path.exists(CSV_PATH):
    df = pd.read_csv(CSV_PATH)
    t = (df["t_ms"].values - df["t_ms"].values[0]) / 1000.0
    x_raw = df["v_volts"].values - np.mean(df["v_volts"].values)
    fs = 1.0 / np.median(np.diff(t))
    print(f"Loaded {CSV_PATH}: N={len(x_raw)}, estimated fs={fs:.1f} Hz")
else:
    fs = 1000.0
    t = np.arange(0, 0.25, 1.0 / fs)
    # 40 Hz strong + 5 Hz quiet component
    x_raw = 0.8 * np.sin(2 * np.pi * 40 * t) + 0.08 * np.sin(2 * np.pi * 5 * t)
    print("CSV not found; using synthetic test signal at fs=1000 Hz")

Vp = np.max(np.abs(x_raw)) + 1e-9
x_norm = x_raw / Vp

#%% Cell 2: Uniform Quantizer & SQNR Sweep (n = 2..8 bits)
def uniform_quantize(sig, n_bits, peak=1.0):
    levels = 2 ** n_bits
    delta = (2.0 * peak) / levels
    idx = np.clip(np.floor((sig + peak) / delta), 0, levels - 1)
    return -peak + (idx + 0.5) * delta, delta

bit_depths = np.arange(2, 9)
measured_sqnr = []
for n in bit_depths:
    xq, _ = uniform_quantize(x_norm, n, 1.0)
    err = x_norm - xq
    sqnr = 10 * np.log10(np.mean(x_norm ** 2) / (np.mean(err ** 2) + 1e-15))
    measured_sqnr.append(sqnr)
    print(f"n={n} bits | Empirical SQNR={sqnr:5.2f} dB | Sine Theory={6.02*n+1.76:5.2f} dB")

#%% Cell 3: Compare 5-bit Uniform vs 5-bit mu-Law (mu=255) on Weak Segments
mu = 255.0
y_mu = np.sign(x_norm) * np.log(1 + mu * np.abs(x_norm)) / np.log(1 + mu)
yq_mu, _ = uniform_quantize(y_mu, 5, 1.0)
x_rec_mu = np.sign(yq_mu) * (1.0 / mu) * ((1 + mu) ** np.abs(yq_mu) - 1.0)
x_rec_uni, _ = uniform_quantize(x_norm, 5, 1.0)

fig, ax = plt.subplots(2, 1, figsize=(10, 6), sharex=True)
ax[0].plot(t, x_norm, label="Normalized Input", lw=1.6, color="#0284c7")
ax[0].step(t, x_rec_uni, where="post", label="5-Bit Uniform", alpha=0.8, color="#d97706")
ax[0].step(t, x_rec_mu, where="post", label="5-Bit mu-Law (mu=255)", alpha=0.85, color="#059669")
ax[0].set_title("Uniform vs mu-Law Companded Reconstruction")
ax[0].legend()

ax[1].plot(t, np.abs(x_norm - x_rec_uni), label="|Error| Uniform", color="#d97706")
ax[1].plot(t, np.abs(x_norm - x_rec_mu), label="|Error| mu-Law", color="#059669")
ax[1].set_xlabel("Time (s)")
ax[1].set_ylabel("Absolute Error")
ax[1].legend()
plt.tight_layout()
plt.show()
`,
  },
  {
    id: 'script-py-dm',
    language: 'python',
    filename: 'ece423_dm_dpcm_compression.py',
    title: 'Spyder Delta Modulation Slope-Overload & DPCM Lab',
    environment: 'Python 3 · Spyder IDE (numpy, matplotlib)',
    module: SyllabusModule.COMPRESSION,
    summary:
      'Runs 1-bit Delta Modulation and 1-tap DPCM on captured ESP32 gas/voltage waveforms, sweeping step size Δ to plot the exact empirical SNR curve showing granular noise vs slope overload.',
    howToRun: [
      'Capture a gas puff or AC voltage trace from your ESP32.',
      'Execute cells in Spyder to locate the optimal Δ* that balances slope overload and granular noise.',
    ],
    code: `#%% ECE 423 — Delta Modulation & DPCM Analysis on Sensor Data (Spyder)
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

CSV_PATH = "esp32_bench_capture.csv"
if os.path.exists(CSV_PATH):
    df = pd.read_csv(CSV_PATH)
    t = (df["t_ms"].values - df["t_ms"].values[0]) / 1000.0
    m = df["gas_volts"].values - df["gas_volts"].mean()
    fs = 1.0 / np.median(np.diff(t))
else:
    fs = 200.0
    t = np.arange(0, 2.0, 1.0 / fs)
    # Simulated gas sensor step transient + slow ripple
    m = 1.1 / (1 + np.exp(-12 * (t - 0.6))) - 0.4 + 0.04 * np.sin(2 * np.pi * 2 * t)

def delta_modulate(sig, delta):
    y_hat = np.zeros_like(sig)
    bits = np.zeros(len(sig), dtype=int)
    acc = sig[0]
    for k in range(len(sig)):
        b = 1 if sig[k] >= acc else 0
        acc += delta if b == 1 else -delta
        y_hat[k] = acc
        bits[k] = b
    return y_hat, bits

#%% Cell 2: Sweep Delta to Find Optimal SNR Knee (Granular vs Slope Overload)
deltas = np.linspace(0.01, 0.35, 35)
snrs = []
for d in deltas:
    y_hat, _ = delta_modulate(m, d)
    mse = np.mean((m - y_hat) ** 2) + 1e-12
    snrs.append(10 * np.log10(np.mean(m ** 2) / mse))

best_delta = deltas[int(np.argmax(snrs))]
print(f"Optimal DM step Delta* = {best_delta:.3f} V (Peak SNR = {max(snrs):.2f} dB)")

y_opt, _ = delta_modulate(m, best_delta)
y_overload, _ = delta_modulate(m, best_delta * 0.2)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6))
ax1.plot(t, m, label="Sensor Waveform m(t)", color="#0284c7", lw=1.8)
ax1.step(t, y_opt, where="post", label=f"Optimal DM (Delta={best_delta:.3f}V)", color="#059669")
ax1.step(t, y_overload, where="post", label="Slope Overload (Delta too small)", color="#dc2626", ls="--")
ax1.set_title("Delta Modulation Tracking vs Slope Overload")
ax1.legend()

ax2.plot(deltas, snrs, marker="o", ms=3, color="#0284c7")
ax2.axvline(best_delta, color="#059669", ls="--", label=f"Optimal Delta* = {best_delta:.3f} V")
ax2.set_xlabel("Step Size Delta (V)")
ax2.set_ylabel("Unfiltered DM SNR (dB)")
ax2.set_title("Granular Noise (Right) vs Slope Overload (Left)")
ax2.legend()
plt.tight_layout()
plt.show()
`,
  },
  {
    id: 'script-py-mod',
    language: 'python',
    filename: 'ece423_digital_mod_ber_lab.py',
    title: 'Spyder BPSK, QPSK & 16-QAM AWGN BER Simulator',
    environment: 'Python 3 · Spyder IDE (numpy, scipy, matplotlib)',
    module: SyllabusModule.MODULATION,
    summary:
      'Encodes quantized ESP32 sensor samples (or random telemetry bits) into BPSK, QPSK, and 16-QAM symbols over an AWGN channel, running matched-filter detection and plotting simulated vs theoretical BER.',
    howToRun: [
      'Requires numpy, scipy, and matplotlib in Spyder.',
      'Run the full file (F5) to inspect the I/Q constellation scatter and Eb/N0 waterfall BER plot.',
    ],
    code: `#%% ECE 423 — Bandpass Digital Modulation & BER Simulation (Spyder)
import numpy as np
import matplotlib.pyplot as plt
from scipy.special import erfc

def q_func(x):
    return 0.5 * erfc(x / np.sqrt(2.0))

N_BITS = 120000  # Divisible by 4 for 16-QAM
rng = np.random.default_rng(42)
bits = rng.integers(0, 2, size=N_BITS)
eb_no_db = np.arange(0, 15, 1)

ber_bpsk, ber_qpsk, ber_16qam = [], [], []

# Gray-coded 4-PAM map for 16-QAM I/Q axes: 00->-3, 01->-1, 11->+1, 10->+3
pam4_map = {(0, 0): -3.0, (0, 1): -1.0, (1, 1): 1.0, (1, 0): 3.0}
norm_16qam = np.sqrt(10.0) # Average symbol energy Es = 10 -> unit energy

for db in eb_no_db:
    eb_n0 = 10 ** (db / 10.0)

    # 1. BPSK (k=1): s in {-1, +1}, sigma^2 = N0/2 = 1/(2*Eb/N0)
    s_bpsk = 2.0 * bits - 1.0
    sigma_b = np.sqrt(1.0 / (2.0 * eb_n0))
    r_bpsk = s_bpsk + rng.normal(0, sigma_b, size=N_BITS)
    ber_bpsk.append(np.mean((r_bpsk > 0).astype(int) != bits))

    # 2. QPSK (k=2): I, Q each carry 1 bit with Es=2*Eb
    b_pairs = bits.reshape(-1, 2)
    i_qpsk = 2.0 * b_pairs[:, 0] - 1.0
    q_qpsk = 2.0 * b_pairs[:, 1] - 1.0
    r_i = i_qpsk + rng.normal(0, sigma_b, size=len(i_qpsk))
    r_q = q_qpsk + rng.normal(0, sigma_b, size=len(q_qpsk))
    err_q = np.sum((r_i > 0) != b_pairs[:, 0]) + np.sum((r_q > 0) != b_pairs[:, 1])
    ber_qpsk.append(err_q / N_BITS)

    # 3. 16-QAM (k=4): Es = 4*Eb => N0/2 = 1/(8*Eb/N0) per dimension
    b4 = bits.reshape(-1, 4)
    i_sym = np.array([pam4_map[(a, b)] for a, b in b4[:, 0:2]]) / norm_16qam
    q_sym = np.array([pam4_map[(a, b)] for a, b in b4[:, 2:4]]) / norm_16qam
    sigma_q = np.sqrt(1.0 / (8.0 * eb_n0))
    ri_16 = (i_sym + rng.normal(0, sigma_q, size=len(i_sym))) * norm_16qam
    rq_16 = (q_sym + rng.normal(0, sigma_q, size=len(q_sym))) * norm_16qam

    def demap_pam4(v):
        # Returns (bit0, bit1) using thresholds -2, 0, +2
        b0 = (v > 0).astype(int)
        b1 = (np.abs(v) < 2.0).astype(int)
        return b0, b1

    di0, di1 = demap_pam4(ri_16)
    dq0, dq1 = demap_pam4(rq_16)
    err16 = (
        np.sum(di0 != b4[:, 0]) + np.sum(di1 != b4[:, 1]) +
        np.sum(dq0 != b4[:, 2]) + np.sum(dq1 != b4[:, 3])
    )
    ber_16qam.append(err16 / N_BITS)

#%% Cell 2: Plot Simulated vs Theoretical Waterfall Curves
eb_lin = 10 ** (eb_no_db / 10.0)
plt.figure(figsize=(9, 6))
plt.semilogy(eb_no_db, q_func(np.sqrt(2 * eb_lin)), "k-", label="Theory BPSK / QPSK")
plt.semilogy(eb_no_db, ber_bpsk, "o", color="#0284c7", label="Sim BPSK")
plt.semilogy(eb_no_db, ber_qpsk, "s", color="#059669", label="Sim QPSK")
plt.semilogy(eb_no_db, 0.75 * q_func(np.sqrt(0.8 * eb_lin)), "r--", label="Theory 16-QAM")
plt.semilogy(eb_no_db, ber_16qam, "^", color="#d97706", label="Sim 16-QAM")
plt.ylim(1e-5, 1)
plt.grid(True, which="both", ls=":")
plt.xlabel("Eb / N0 (dB)")
plt.ylabel("Bit Error Probability (Pb)")
plt.title("ECE 423 Simulated vs Theoretical BER Waterfall")
plt.legend()
plt.tight_layout()
plt.show()
`,
  },
  {
    id: 'script-mat-serial',
    language: 'matlab',
    filename: 'ece423_esp32_serial_logger.m',
    title: 'MATLAB Live ESP32 Serial Port Capture',
    environment: 'MATLAB R2019b+ (serialport API · Zero Extra Toolboxes)',
    module: SyllabusModule.PCM,
    summary:
      'Connects MATLAB directly to your ESP32 COM/tty port using serialport(), captures live multi-sensor frames, plots all 4 channels, and exports a clean CSV table for DSP analysis.',
    howToRun: [
      'Check your ESP32 port with serialportlist("available") in MATLAB Command Window.',
      'Set portName below and run the script.',
    ],
    code: `%% ECE 423 Practical Bench — MATLAB Live ESP32 Serial Capture
clear; clc; close all;

portName = "COM5";   % Check serialportlist("available")
baudRate = 115200;
numSamples = 600;    % ~3 seconds at 200 Hz

s = serialport(portName, baudRate, "Timeout", 2);
configureTerminator(s, "LF");
flush(s);

data = zeros(numSamples, 5);
k = 0;
fprintf("Capturing %d samples from ESP32 on %s...\\n", numSamples, portName);

while k < numSamples
    line = strtrim(readline(s));
    if startsWith(line, "t_ms") || strlength(line) == 0
        continue;
    end
    vals = str2double(split(line, ","));
    if numel(vals) >= 5 && all(~isnan(vals(1:5)))
        k = k + 1;
        data(k, :) = vals(1:5).';
    end
end
clear s; % Release serial port

T = array2table(data, "VariableNames", ["t_ms", "v_volts", "i_volts", "gas_volts", "dist_cm"]);
writetable(T, "esp32_bench_capture.csv");
fprintf("Saved %d rows to esp32_bench_capture.csv\\n", numSamples);

t_sec = (T.t_ms - T.t_ms(1)) / 1000;
figure("Name", "ESP32 Sensor Capture");
subplot(4,1,1); plot(t_sec, T.v_volts); ylabel("Voltage (V)"); title("ESP32 Multi-Sensor Capture");
subplot(4,1,2); plot(t_sec, T.i_volts); ylabel("Current (V)");
subplot(4,1,3); plot(t_sec, T.gas_volts); ylabel("Gas (V)");
subplot(4,1,4); stairs(t_sec, T.dist_cm); ylabel("Dist (cm)"); xlabel("Time (s)");
`,
  },
  {
    id: 'script-mat-dsp',
    language: 'matlab',
    filename: 'ece423_dsp_all_in_one.m',
    title: 'MATLAB PCM, μ-Law, Delta Modulation & QPSK/16-QAM BER Lab',
    environment: 'MATLAB (Base MATLAB Only — Pure erfc, No Paid Toolboxes)',
    module: SyllabusModule.MODULATION,
    summary:
      'Runs the complete ECE 423 pipeline on your captured ESP32 CSV: uniform vs μ-Law quantization SQNR, Delta Modulation slope-overload sweep, and Monte-Carlo BPSK/QPSK/16-QAM BER verification.',
    howToRun: [
      'Ensure esp32_bench_capture.csv (or exported browser CSV) is in MATLAB’s current folder, or run directly with its built-in synthetic waveform.',
      'Press Run in MATLAB Editor to inspect all 3 diagnostic figures.',
    ],
    code: `%% ECE 423 — Complete MATLAB PCM, DM & Digital Modulation Lab
clear; clc; close all;

csvFile = "esp32_bench_capture.csv";
if isfile(csvFile)
    T = readtable(csvFile);
    t = (T.t_ms - T.t_ms(1)) / 1000;
    x_raw = T.v_volts - mean(T.v_volts);
    fs = 1 / median(diff(t));
    fprintf("Loaded %s (fs = %.1f Hz)\\n", csvFile, fs);
else
    fs = 1000;
    t = (0:1/fs:0.25).';
    x_raw = 0.85*sin(2*pi*40*t) + 0.08*sin(2*pi*5*t);
    fprintf("CSV not found; using synthetic test waveform at fs = %.1f Hz\\n", fs);
end

Vp = max(abs(x_raw)) + 1e-9;
x_norm = x_raw / Vp;

%% 1. Uniform PCM SQNR vs n = 2..8 bits + mu-Law (mu=255)
mu = 255;
for n = 2:8
    L = 2^n;
    delta = 2 / L;
    idx = min(max(floor((x_norm + 1) / delta), 0), L - 1);
    xq = -1 + (idx + 0.5) * delta;
    sqnr = 10 * log10(mean(x_norm.^2) / (mean((x_norm - xq).^2) + 1e-15));
    fprintf("n=%d bits | Empirical SQNR = %5.2f dB | Theory (sine) = %5.2f dB\\n", n, sqnr, 6.02*n+1.76);
end

y_mu = sign(x_norm) .* log(1 + mu*abs(x_norm)) / log(1 + mu);
L5 = 2^5; d5 = 2/L5;
yq = -1 + (min(max(floor((y_mu + 1)/d5), 0), L5-1) + 0.5)*d5;
x_mu_rec = sign(yq) .* (1/mu) .* ((1 + mu).^abs(yq) - 1);

figure("Name", "PCM vs mu-Law Companding");
plot(t, x_norm, "LineWidth", 1.5); hold on;
stairs(t, x_mu_rec, "LineWidth", 1.2);
legend("Normalized Sensor Signal", "5-Bit mu-Law Reconstructed");
xlabel("Time (s)"); ylabel("Normalized Amplitude"); title("5-Bit mu-Law Companding on Sensor Data");

%% 2. Delta Modulation Slope-Overload Sweep
deltas = linspace(0.01, 0.35, 30);
dm_snr = zeros(size(deltas));
for i = 1:numel(deltas)
    d = deltas(i);
    acc = x_norm(1);
    y_dm = zeros(size(x_norm));
    for k = 1:numel(x_norm)
        if x_norm(k) >= acc
            acc = acc + d;
        else
            acc = acc - d;
        end
        y_dm(k) = acc;
    end
    dm_snr(i) = 10 * log10(mean(x_norm.^2) / (mean((x_norm - y_dm).^2) + 1e-12));
end

figure("Name", "Delta Modulation Trade-Off");
plot(deltas, dm_snr, "-o", "LineWidth", 1.4);
xlabel("Step Size \\Delta (Normalized)"); ylabel("DM SNR (dB)");
title("Delta Modulation: Slope Overload (Left) vs Granular Noise (Right)"); grid on;

%% 3. Base MATLAB QPSK vs BPSK AWGN BER (Uses pure erfc, no Comm Toolbox)
qfunc_mat = @(z) 0.5 * erfc(z / sqrt(2));
ebno_db = 0:12;
ebno_lin = 10.^(ebno_db/10);
Nbits = 100000;
bits = randi([0 1], Nbits, 1);
sim_bpsk = zeros(size(ebno_db));

for i = 1:numel(ebno_db)
    sigma = sqrt(1 / (2 * ebno_lin(i)));
    rx = (2*bits - 1) + sigma * randn(Nbits, 1);
    sim_bpsk(i) = mean((rx > 0) ~= bits);
end

figure("Name", "Digital Modulation BER");
semilogy(ebno_db, qfunc_mat(sqrt(2*ebno_lin)), "k-", "LineWidth", 1.5); hold on;
semilogy(ebno_db, sim_bpsk, "bo", "LineWidth", 1.4);
semilogy(ebno_db, 0.75 * qfunc_mat(sqrt(0.8*ebno_lin)), "r--", "LineWidth", 1.4);
ylim([1e-5 1]); grid on;
legend("Theory BPSK / QPSK", "Monte-Carlo BPSK", "Theory 16-QAM");
xlabel("E_b / N_0 (dB)"); ylabel("Bit Error Probability P_b");
title("ECE 423 BER Performance Comparison");
`,
  },
];

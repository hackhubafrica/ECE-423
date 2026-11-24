import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import {
  FailedSolverAttempt,
  LabType,
  StudyProgressState,
  SyllabusModule,
} from '../types/ece423';

export interface AggregatedWeakQuizTopic {
  topicKey: string;
  questionIds: string[];
  topic: string;
  module: SyllabusModule;
  missCount: number;
  isRecurring: boolean;
  formulaHint: string;
  syllabusTopicId: string;
  recommendedLab?: LabType;
  recommendedCalc?: string;
}

export interface WeakTopicReason {
  missCount: number;
  failCount: number;
  labels: string[];
}

export const TOPIC_TO_PRACTICE: Record<
  string,
  { syllabusTopicId: string; lab?: LabType; calc?: string }
> = {
  'Sampling Theorem': {
    syllabusTopicId: 'pcm-nyquist',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'Uniform Quantization': {
    syllabusTopicId: 'pcm-quantization',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'Quantization Noise': {
    syllabusTopicId: 'pcm-quantization',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'PCM Bit Rate': {
    syllabusTopicId: 'pcm-quantization',
    lab: LabType.SAMPLING_PCM,
    calc: 'pcm_snr',
  },
  'Overall PCM SNR & Threshold': {
    syllabusTopicId: 'pcm-noise-threshold',
    calc: 'pcm_snr',
  },
  'TDM Multiplexing': {
    syllabusTopicId: 'pcm-tdm',
    calc: 'tdm_frame',
  },
  Synchronization: {
    syllabusTopicId: 'pcm-tdm',
    lab: LabType.LINE_CODING,
    calc: 'tdm_frame',
  },
  Companding: {
    syllabusTopicId: 'pcm-companding',
    lab: LabType.COMPANDING,
    calc: 'companding',
  },
  'Line Coding': {
    syllabusTopicId: 'pcm-line-coding',
    lab: LabType.LINE_CODING,
  },
  "Shannon's Law": {
    syllabusTopicId: 'comp-shannon',
    calc: 'shannon',
  },
  'Shannon Limit': {
    syllabusTopicId: 'comp-shannon',
    calc: 'shannon',
  },
  'Delta Modulation': {
    syllabusTopicId: 'comp-dm',
    lab: LabType.DELTA_MOD,
    calc: 'delta_mod',
  },
  'Delta Modulation Numerical': {
    syllabusTopicId: 'comp-dm',
    lab: LabType.DELTA_MOD,
    calc: 'delta_mod',
  },
  'DPCM & Prediction': {
    syllabusTopicId: 'comp-dpcm',
    calc: 'examples',
  },
  'ADPCM vs DM': {
    syllabusTopicId: 'comp-adaptive',
    lab: LabType.DELTA_MOD,
    calc: 'examples',
  },
  'Non-Waveform Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'CELP Speech Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'JPEG Image Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'MPEG Video Coding': {
    syllabusTopicId: 'comp-nonwaveform',
    calc: 'examples',
  },
  'Power Efficiency & BER': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'Spectral Efficiency': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'QPSK vs BPSK': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'DPSK Detection': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'MSK Properties': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'Matched Filter Receiver': {
    syllabusTopicId: 'mod-receivers',
    calc: 'examples',
  },
  'ASK vs BPSK Distance': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'BFSK Orthogonality': {
    syllabusTopicId: 'mod-binary',
    lab: LabType.DIGITAL_MOD,
    calc: 'modulation',
  },
  'Constellation & Gray Coding': {
    syllabusTopicId: 'mod-mary',
    lab: LabType.DIGITAL_MOD,
  },
  'Receiver Synchronization': {
    syllabusTopicId: 'mod-receivers',
    lab: LabType.DIGITAL_MOD,
  },
};

export const SOLVER_TO_SYLLABUS_ID: Record<string, string> = {
  'calc:pcm_snr': 'pcm-noise-threshold',
  'calc:tdm_frame': 'pcm-tdm',
  'calc:companding': 'pcm-companding',
  'calc:shannon': 'comp-shannon',
  'calc:delta_mod': 'comp-dm',
  'calc:modulation': 'mod-metrics',
  'ex-pcm-1': 'pcm-quantization',
  'ex-pcm-2': 'pcm-tdm',
  'ex-pcm-3': 'pcm-companding',
  'ex-pcm-4': 'pcm-noise-threshold',
  'ex-comp-1': 'comp-shannon',
  'ex-comp-2': 'comp-dm',
  'ex-comp-3': 'comp-dpcm',
  'ex-comp-4': 'comp-nonwaveform',
  'ex-mod-1': 'mod-mary',
  'ex-mod-2': 'mod-binary',
  'ex-mod-3': 'mod-mary',
  'ex-mod-4': 'mod-receivers',
  'essay-pcm-1': 'pcm-noise-threshold',
  'essay-pcm-2': 'pcm-line-coding',
  'essay-pcm-3': 'pcm-tdm',
  'essay-comp-1': 'comp-dm',
  'essay-comp-2': 'comp-nonwaveform',
  'essay-comp-3': 'comp-nonwaveform',
  'essay-mod-1': 'mod-receivers',
  'essay-mod-2': 'mod-metrics',
  'essay-mod-3': 'mod-mary',
};

export function computeWeakTopicDiagnostics(progress: StudyProgressState): {
  weakQuizTopics: AggregatedWeakQuizTopic[];
  weakSolverItems: FailedSolverAttempt[];
  weakSyllabusIds: Set<string>;
  weakReasonsBySyllabusId: Map<string, WeakTopicReason>;
} {
  const questionMissMap = new Map<
    string,
    { questionId: string; topic: string; module: SyllabusModule; count: number }
  >();

  // Walk chronologically so newer correct answers clear that specific question
  const chronological = [...progress.quizAttempts].reverse();
  chronological.forEach((att) => {
    att.correctQuestionIds?.forEach((qid) => {
      questionMissMap.delete(qid);
    });
    att.missedTopics?.forEach((m) => {
      if (progress.resolvedWeakQuizIds.includes(m.questionId)) return;
      const prev = questionMissMap.get(m.questionId);
      questionMissMap.set(m.questionId, {
        questionId: m.questionId,
        topic: m.topic,
        module: m.module,
        count: (prev?.count || 0) + 1,
      });
    });
  });

  const topicGroups = new Map<string, AggregatedWeakQuizTopic>();
  questionMissMap.forEach((entry) => {
    const topicKey = `${entry.module}:${entry.topic}`;
    const existing = topicGroups.get(topicKey);
    const qMeta = QUIZ_QUESTIONS.find((q) => q.id === entry.questionId);
    const links = TOPIC_TO_PRACTICE[entry.topic] || {
      syllabusTopicId:
        entry.module === SyllabusModule.PCM
          ? 'pcm-nyquist'
          : entry.module === SyllabusModule.COMPRESSION
          ? 'comp-shannon'
          : 'mod-metrics',
    };

    if (existing) {
      existing.questionIds.push(entry.questionId);
      existing.missCount += entry.count;
      existing.isRecurring = existing.missCount >= 2;
    } else {
      topicGroups.set(topicKey, {
        topicKey,
        questionIds: [entry.questionId],
        topic: entry.topic,
        module: entry.module,
        missCount: entry.count,
        isRecurring: entry.count >= 2,
        formulaHint: qMeta?.formulaHint || '',
        syllabusTopicId: links.syllabusTopicId,
        recommendedLab: links.lab,
        recommendedCalc: links.calc,
      });
    }
  });

  const weakQuizTopics = Array.from(topicGroups.values()).sort(
    (a, b) => b.missCount - a.missCount
  );

  const weakSolverItems = [...progress.failedSolverAttempts].sort(
    (a, b) => b.failCount - a.failCount || b.lastFailedAt - a.lastFailedAt
  );

  const weakSyllabusIds = new Set<string>();
  const weakReasonsBySyllabusId = new Map<string, WeakTopicReason>();

  const ensureReason = (id: string): WeakTopicReason => {
    const existing = weakReasonsBySyllabusId.get(id);
    if (existing) return existing;
    const created: WeakTopicReason = { missCount: 0, failCount: 0, labels: [] };
    weakReasonsBySyllabusId.set(id, created);
    return created;
  };

  weakQuizTopics.forEach((q) => {
    weakSyllabusIds.add(q.syllabusTopicId);
    const r = ensureReason(q.syllabusTopicId);
    r.missCount += q.missCount;
    r.labels.push(`${q.missCount}× missed in Quiz (${q.topic})`);
  });

  weakSolverItems.forEach((s) => {
    const syllabusId = SOLVER_TO_SYLLABUS_ID[s.id];
    if (!syllabusId) return;
    weakSyllabusIds.add(syllabusId);
    const r = ensureReason(syllabusId);
    r.failCount += s.failCount;
    r.labels.push(
      `${s.failCount}× ${s.source === 'essay' ? 'flagged essay' : 'failed solver'} (${s.title})`
    );
  });

  return {
    weakQuizTopics,
    weakSolverItems,
    weakSyllabusIds,
    weakReasonsBySyllabusId,
  };
}

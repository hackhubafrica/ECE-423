import {
  PowerFailedAttempt,
  PowerLabType,
  PowerModule,
  PowerProgressState,
} from '../types/ece471';

export interface PowerWeakQuizItem {
  topic: string;
  module: PowerModule;
  missCount: number;
  questionIds: string[];
  syllabusTopicId?: string;
  recommendedLab?: PowerLabType;
  recommendedCalc?: string;
}

const TOPIC_TO_ROUTE: Record<
  string,
  {
    syllabusTopicId: string;
    recommendedLab?: PowerLabType;
    recommendedCalc?: string;
  }
> = {
  'Corona Physics & Effects': {
    syllabusTopicId: 'pwr_corona_physics',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'peek_corona',
  },
  'DC & AC Line Resistance': {
    syllabusTopicId: 'pwr_dc_ac_resistance',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'dc_ac_resistance',
  },
  'Single-Phase GMR & Inductance': {
    syllabusTopicId: 'pwr_gmr_inductance',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'line_inductance',
  },
  'Capacitance & Charging Current': {
    syllabusTopicId: 'pwr_cap_charging',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'line_capacitance',
  },
  'Bundled Conductors': {
    syllabusTopicId: 'pwr_bundled_conductors',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'bundled_gmr',
  },
  'Peek Corona & Power Loss': {
    syllabusTopicId: 'pwr_peek_corona',
    recommendedLab: PowerLabType.LINE_CORONA,
    recommendedCalc: 'peek_corona',
  },
  'Economic Dispatch': {
    syllabusTopicId: 'pwr_econ_dispatch',
    recommendedLab: PowerLabType.DISPATCH_AGC,
    recommendedCalc: 'econ_dispatch',
  },
  'Droop & AGC Frequency Control': {
    syllabusTopicId: 'pwr_droop_agc',
    recommendedLab: PowerLabType.DISPATCH_AGC,
    recommendedCalc: 'econ_dispatch',
  },
  'Fortescue Symmetrical Components': {
    syllabusTopicId: 'pwr_symmetrical_transform',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'symmetrical_comp',
  },
  'Per-Unit & Sequence Networks': {
    syllabusTopicId: 'pwr_pu_sequence_nets',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'pu_traveling_wave',
  },
  'Balanced & Unbalanced Faults': {
    syllabusTopicId: 'pwr_unbalanced_faults',
    recommendedLab: PowerLabType.SYMMETRICAL_FAULTS,
    recommendedCalc: 'power_faults',
  },
  'Traveling Waves & Bewley Lattice': {
    syllabusTopicId: 'pwr_bewley_lattice',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
  'Protection Relays (IDMT & Mho)': {
    syllabusTopicId: 'pwr_protection_relays',
    recommendedLab: PowerLabType.TRANSIENTS_PROTECTION,
    recommendedCalc: 'pu_traveling_wave',
  },
};

export const POWER_SOLVER_TO_SYLLABUS: Record<string, string> = {
  dc_ac_resistance: 'pwr_dc_ac_resistance',
  line_inductance: 'pwr_gmr_inductance',
  line_capacitance: 'pwr_cap_charging',
  bundled_gmr: 'pwr_bundled_conductors',
  peek_corona: 'pwr_peek_corona',
  econ_dispatch: 'pwr_econ_dispatch',
  symmetrical_comp: 'pwr_symmetrical_transform',
  power_faults: 'pwr_unbalanced_faults',
  pu_traveling_wave: 'pwr_bewley_lattice',
};

export function computePowerWeakTopics(progress: PowerProgressState) {
  const resolvedSet = new Set(progress.resolvedWeakQuizIds);
  const map = new Map<string, PowerWeakQuizItem>();

  progress.quizAttempts.forEach((att) => {
    att.missedTopics?.forEach((miss) => {
      if (resolvedSet.has(miss.questionId)) return;
      const route = TOPIC_TO_ROUTE[miss.topic];
      const existing = map.get(miss.topic);
      if (existing) {
        existing.missCount += 1;
        if (!existing.questionIds.includes(miss.questionId)) {
          existing.questionIds.push(miss.questionId);
        }
      } else {
        map.set(miss.topic, {
          topic: miss.topic,
          module: miss.module,
          missCount: 1,
          questionIds: [miss.questionId],
          syllabusTopicId: route?.syllabusTopicId,
          recommendedLab: route?.recommendedLab,
          recommendedCalc: route?.recommendedCalc,
        });
      }
    });
  });

  const weakQuizTopics = Array.from(map.values()).sort(
    (a, b) => b.missCount - a.missCount
  );

  const weakSolverItems: PowerFailedAttempt[] = [...progress.failedSolverAttempts].sort(
    (a, b) => b.failCount - a.failCount || b.lastFailedAt - a.lastFailedAt
  );

  const weakSyllabusIds = new Set<string>();
  const weakReasonsBySyllabusId: Record<string, string[]> = {};

  const pushReason = (sid: string | undefined, reason: string) => {
    if (!sid) return;
    weakSyllabusIds.add(sid);
    if (!weakReasonsBySyllabusId[sid]) weakReasonsBySyllabusId[sid] = [];
    if (!weakReasonsBySyllabusId[sid].includes(reason)) {
      weakReasonsBySyllabusId[sid].push(reason);
    }
  };

  weakQuizTopics.forEach((item) =>
    pushReason(item.syllabusTopicId, `Missed ${item.missCount}× in quiz (${item.topic})`)
  );
  weakSolverItems.forEach((item) => {
    const sid = item.recommendedCalc
      ? POWER_SOLVER_TO_SYLLABUS[item.recommendedCalc]
      : undefined;
    pushReason(sid, `Failed solver/essay check ${item.failCount}× (${item.title})`);
  });

  return {
    weakQuizTopics,
    weakSolverItems,
    weakSyllabusIds,
    weakReasonsBySyllabusId,
  };
}

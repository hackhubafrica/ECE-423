import {
  ControlFailedAttempt,
  ControlLabType,
  ControlModule,
  ControlProgressState,
} from '../types/ece433';

export interface ControlWeakQuizItem {
  topic: string;
  module: ControlModule;
  missCount: number;
  questionIds: string[];
  syllabusTopicId?: string;
  recommendedLab?: ControlLabType;
  recommendedCalc?: string;
}

const TOPIC_TO_ROUTE: Record<
  string,
  {
    syllabusTopicId: string;
    recommendedLab?: ControlLabType;
    recommendedCalc?: string;
  }
> = {
  'PID Mode Characteristics': {
    syllabusTopicId: 'ctrl_pid_modes',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  'Electronic Op-Amp PID': {
    syllabusTopicId: 'ctrl_pid_opamp',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'opamp_pid',
  },
  'Ziegler-Nichols Tuning': {
    syllabusTopicId: 'ctrl_ziegler_nichols',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  'Integrator Windup': {
    syllabusTopicId: 'ctrl_windup',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'zn_tuning',
  },
  'Practical Op-Amp Differentiator': {
    syllabusTopicId: 'ctrl_pid_opamp',
    recommendedLab: ControlLabType.PID_WINDUP,
    recommendedCalc: 'opamp_pid',
  },
  'Lead Compensator Phase': {
    syllabusTopicId: 'ctrl_lag_lead',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  'Lag vs Lead Selection': {
    syllabusTopicId: 'ctrl_lag_lead',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  'Lead/Lag vs PD/PI Comparison': {
    syllabusTopicId: 'ctrl_comp_vs_pipd',
    recommendedLab: ControlLabType.BODE_COMP,
    recommendedCalc: 'lead_lag',
  },
  'Canonical Forms': {
    syllabusTopicId: 'ctrl_canonical',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  'Similarity Invariance': {
    syllabusTopicId: 'ctrl_ss_props',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  'State Transition Matrix': {
    syllabusTopicId: 'ctrl_stm_exp',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'matrix_exp',
  },
  'State-Space to Transfer Function': {
    syllabusTopicId: 'ctrl_ss_models',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'canonical_ss',
  },
  'Kalman Controllability Test': {
    syllabusTopicId: 'ctrl_kalman',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  'Controllability Matrix & Rank': {
    syllabusTopicId: 'ctrl_kalman',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  'Eigenvalues & Characteristic Polynomial': {
    syllabusTopicId: 'ctrl_ss_props',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'matrix_exp',
  },
  'Gilbert Modal Test & Pole-Zero Cancellation': {
    syllabusTopicId: 'ctrl_gilbert',
    recommendedLab: ControlLabType.STATE_CANONICAL,
    recommendedCalc: 'kalman_rank',
  },
  'Pole Placement & Integral Servo': {
    syllabusTopicId: 'ctrl_integral_servo',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
  'Luenberger State Observer Design': {
    syllabusTopicId: 'ctrl_observer',
    recommendedLab: ControlLabType.POLE_OBSERVER,
    recommendedCalc: 'pole_place',
  },
};

export const CONTROL_SOLVER_TO_SYLLABUS: Record<string, string> = {
  zn_tuning: 'ctrl_ziegler_nichols',
  opamp_pid: 'ctrl_pid_opamp',
  lead_lag: 'ctrl_lag_lead',
  canonical_ss: 'ctrl_canonical',
  matrix_exp: 'ctrl_stm_exp',
  kalman_rank: 'ctrl_kalman',
  pole_place: 'ctrl_pole_reg',
};

export function computeControlWeakTopics(progress: ControlProgressState) {
  const resolvedSet = new Set(progress.resolvedWeakQuizIds);
  const map = new Map<string, ControlWeakQuizItem>();

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

  const weakSolverItems: ControlFailedAttempt[] = [...progress.failedSolverAttempts].sort(
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
      ? CONTROL_SOLVER_TO_SYLLABUS[item.recommendedCalc]
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

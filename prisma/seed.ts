import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ── Exams ────────────────────────────────────────────────────────────────────

const EXAMS = [
  { code: 'jee',  label: 'JEE Advanced 2026', description: 'Joint Entrance Examination' },
  { code: 'neet', label: 'NEET 2026',          description: 'National Eligibility cum Entrance Test' },
  { code: 'psc',  label: 'Kerala PSC',         description: 'Kerala Public Service Commission' },
];

// ── Subjects ─────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { code: 'math',   label: 'Mathematics',     short: 'MA', colorHex: '#3D7A4E', sortOrder: 1 },
  { code: 'phys',   label: 'Physics',          short: 'PH', colorHex: '#D4541A', sortOrder: 2 },
  { code: 'chem',   label: 'Chemistry',        short: 'CH', colorHex: '#C8941E', sortOrder: 3 },
  { code: 'bio',    label: 'Biology',           short: 'BI', colorHex: '#6B6760', sortOrder: 4 },
  { code: 'eng',    label: 'English',           short: 'EN', colorHex: '#3B6FA0', sortOrder: 5 },
  { code: 'reason', label: 'Logical Reasoning', short: 'LR', colorHex: '#7B4EA0', sortOrder: 6 },
];

const EXAM_SUBJECTS: Record<string, string[]> = {
  jee:  ['math', 'phys', 'chem'],
  neet: ['phys', 'chem', 'bio'],
  psc:  ['eng', 'reason'],
};

// ── Topics ───────────────────────────────────────────────────────────────────

const TOPICS: Record<string, { code: string; label: string }[]> = {
  math: [
    { code: 'logarithms-exponents',    label: 'Logarithms & Exponents' },
    { code: 'quadratic-equations',     label: 'Quadratic Equations' },
    { code: 'permutations-combinations', label: 'Permutations & Combinations' },
    { code: 'differentiation',         label: 'Differentiation' },
    { code: 'integration',             label: 'Integration' },
    { code: 'matrices-determinants',   label: 'Matrices & Determinants' },
  ],
  phys: [
    { code: 'projectile-motion',       label: 'Projectile Motion' },
    { code: 'rotational-dynamics',     label: 'Rotational Dynamics' },
    { code: 'thermodynamics',          label: 'Thermodynamics' },
    { code: 'electrostatics',          label: 'Electrostatics' },
    { code: 'optics',                  label: 'Optics' },
    { code: 'modern-physics',          label: 'Modern Physics' },
  ],
  chem: [
    { code: 'mole-concept',            label: 'Mole Concept' },
    { code: 'chemical-bonding',        label: 'Chemical Bonding' },
    { code: 'organic-basics',          label: 'Organic Chemistry Basics' },
    { code: 'equilibrium',             label: 'Chemical Equilibrium' },
    { code: 'electrochemistry',        label: 'Electrochemistry' },
  ],
  bio: [
    { code: 'cell-structure',          label: 'Cell Structure' },
    { code: 'photosynthesis',          label: 'Photosynthesis' },
    { code: 'genetics',               label: 'Genetics' },
    { code: 'human-physiology',        label: 'Human Physiology' },
    { code: 'evolution',              label: 'Evolution' },
  ],
  eng: [
    { code: 'grammar-basics',          label: 'Grammar Basics' },
    { code: 'reading-comprehension',   label: 'Reading Comprehension' },
    { code: 'vocabulary',             label: 'Vocabulary' },
    { code: 'essay-writing',           label: 'Essay Writing' },
  ],
  reason: [
    { code: 'blood-relations',         label: 'Blood Relations' },
    { code: 'syllogisms',             label: 'Syllogisms' },
    { code: 'number-series',           label: 'Number Series' },
    { code: 'coding-decoding',         label: 'Coding & Decoding' },
    { code: 'direction-distance',      label: 'Direction & Distance' },
  ],
};

const EXAM_TOPICS: Record<string, Record<string, string[]>> = {
  jee: {
    math: ['logarithms-exponents', 'quadratic-equations', 'permutations-combinations', 'differentiation', 'integration', 'matrices-determinants'],
    phys: ['projectile-motion', 'rotational-dynamics', 'thermodynamics', 'electrostatics', 'optics', 'modern-physics'],
    chem: ['mole-concept', 'chemical-bonding', 'organic-basics', 'equilibrium', 'electrochemistry'],
  },
  neet: {
    phys: ['projectile-motion', 'rotational-dynamics', 'thermodynamics', 'optics'],
    chem: ['mole-concept', 'chemical-bonding', 'organic-basics', 'equilibrium'],
    bio:  ['cell-structure', 'photosynthesis', 'genetics', 'human-physiology', 'evolution'],
  },
  psc: {
    eng:    ['grammar-basics', 'reading-comprehension', 'vocabulary', 'essay-writing'],
    reason: ['blood-relations', 'syllogisms', 'number-series', 'coding-decoding', 'direction-distance'],
  },
};

// ── Sample questions ─────────────────────────────────────────────────────────

type Question = {
  subjectCode: string;
  topicCode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examCodes: string[];
  prompt: string;
  options: { label: string; text: string; sub?: string }[];
  correctLabel: string;
  explanation: { steps: string[] };
  xpReward: number;
};

const SAMPLE_QUESTIONS: Question[] = [
  // Physics / Projectile Motion
  {
    subjectCode: 'phys',
    topicCode: 'projectile-motion',
    difficulty: 'medium',
    examCodes: ['jee', 'neet'],
    prompt: 'A ball is projected horizontally from a height of 20 m with an initial velocity of 10 m/s. How far from the base of the building does it land? (Take $g = 10\\ \\text{m/s}^2$)',
    options: [
      { label: 'A', text: '10 m',  sub: undefined },
      { label: 'B', text: '20 m',  sub: '≈ 20.00 m' },
      { label: 'C', text: '40 m',  sub: undefined },
      { label: 'D', text: '200 m', sub: undefined },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Time to fall height $h = 20$ m: $t = \\sqrt{2h/g} = \\sqrt{4} = 2\\text{ s}$',
      'Horizontal distance: $x = v_0 \\cdot t = 10 \\times 2 = 20\\text{ m}$',
    ]},
    xpReward: 50,
  },
  {
    subjectCode: 'phys',
    topicCode: 'projectile-motion',
    difficulty: 'hard',
    examCodes: ['jee'],
    prompt: 'A projectile is launched at 45° with speed $u$. What is its speed at the highest point of its trajectory?',
    options: [
      { label: 'A', text: '$u$',           sub: undefined },
      { label: 'B', text: '$u/\\sqrt{2}$', sub: '≈ 0.707 u' },
      { label: 'C', text: '$u/2$',         sub: undefined },
      { label: 'D', text: '0',             sub: undefined },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'At the highest point, the vertical component of velocity is zero.',
      'Only the horizontal component remains: $v_x = u \\cos 45° = u/\\sqrt{2}$.',
    ]},
    xpReward: 70,
  },
  // Math / Quadratic Equations
  {
    subjectCode: 'math',
    topicCode: 'quadratic-equations',
    difficulty: 'easy',
    examCodes: ['jee'],
    prompt: 'Find the roots of the equation $x^2 - 5x + 6 = 0$.',
    options: [
      { label: 'A', text: '2 and 3',  sub: undefined },
      { label: 'B', text: '-2 and -3', sub: undefined },
      { label: 'C', text: '1 and 6',  sub: undefined },
      { label: 'D', text: '2 and -3', sub: undefined },
    ],
    correctLabel: 'A',
    explanation: { steps: [
      'Factor: $(x - 2)(x - 3) = 0$',
      'Roots: $x = 2$ and $x = 3$.',
    ]},
    xpReward: 30,
  },
  // Chemistry / Mole Concept
  {
    subjectCode: 'chem',
    topicCode: 'mole-concept',
    difficulty: 'medium',
    examCodes: ['jee', 'neet'],
    prompt: "How many molecules are present in 4 g of hydrogen gas ($H_2$)? (Avogadro's number $N_A = 6.022 \\times 10^{23}$)",
    options: [
      { label: 'A', text: '$6.022 \\times 10^{23}$',  sub: '1 mol' },
      { label: 'B', text: '$1.204 \\times 10^{24}$',  sub: '2 mol' },
      { label: 'C', text: '$3.011 \\times 10^{23}$',  sub: '0.5 mol' },
      { label: 'D', text: '$2.408 \\times 10^{24}$',  sub: '4 mol' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Molar mass of $H_2 = 2$ g/mol.',
      'Moles in 4 g: $n = 4/2 = 2$ mol.',
      'Molecules: $2 \\times 6.022 \\times 10^{23} = 1.204 \\times 10^{24}$.',
    ]},
    xpReward: 50,
  },
  // Physics / Thermodynamics
  {
    subjectCode: 'phys',
    topicCode: 'thermodynamics',
    difficulty: 'medium',
    examCodes: ['jee', 'neet'],
    prompt: 'An ideal gas is compressed isothermally. Which of the following is true?',
    options: [
      { label: 'A', text: 'Internal energy increases' },
      { label: 'B', text: 'Temperature increases' },
      { label: 'C', text: 'Work is done on the gas', sub: 'W < 0 on gas perspective' },
      { label: 'D', text: 'Heat is absorbed by the gas' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Isothermal means temperature is constant, so internal energy is unchanged (for ideal gas).',
      'Compressing the gas means the surroundings do positive work on the gas.',
      'By the first law: $\\Delta U = 0$, so $Q = -W$ (heat flows out of the gas).',
    ]},
    xpReward: 50,
  },
  // Physics / Electrostatics
  {
    subjectCode: 'phys',
    topicCode: 'electrostatics',
    difficulty: 'easy',
    examCodes: ['jee'],
    prompt: 'Two point charges of $+2\\mu C$ and $-2\\mu C$ are placed 0.1 m apart. The electric field at the midpoint between them is:',
    options: [
      { label: 'A', text: 'Zero' },
      { label: 'B', text: '$7.2 \\times 10^6$ N/C, directed from $+$ to $-$' },
      { label: 'C', text: '$7.2 \\times 10^6$ N/C, directed from $-$ to $+$' },
      { label: 'D', text: '$3.6 \\times 10^6$ N/C' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'At the midpoint, $r = 0.05$ m from each charge.',
      'Field from $+2\\mu C$: $E_+ = kq/r^2 = (9\\times10^9)(2\\times10^{-6})/(0.05)^2 = 7.2\\times10^6$ N/C, pointing away from $+$.',
      'Field from $-2\\mu C$: same magnitude, pointing towards $-$ (i.e., same direction as $E_+$).',
      'Total: $2 \\times 7.2\\times10^6 / 2$... wait, both fields point in the same direction so they add: net $= 7.2\\times10^6$ N/C directed from $+$ to $-$.',
    ]},
    xpReward: 40,
  },
  // Math / Differentiation
  {
    subjectCode: 'math',
    topicCode: 'differentiation',
    difficulty: 'easy',
    examCodes: ['jee'],
    prompt: 'Find $\\frac{d}{dx}[x^3 \\ln x]$.',
    options: [
      { label: 'A', text: '$3x^2 \\ln x$' },
      { label: 'B', text: '$x^2(1 + 3\\ln x)$' },
      { label: 'C', text: '$3x^2 + x^2 \\ln x$' },
      { label: 'D', text: '$x^3 / x$' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Apply the product rule: $(uv)^\\prime = u^\\prime v + uv^\\prime$.',
      'Let $u = x^3,\\ v = \\ln x$. Then $u^\\prime = 3x^2,\\ v^\\prime = 1/x$.',
      '$= 3x^2 \\ln x + x^3 \\cdot (1/x) = 3x^2 \\ln x + x^2 = x^2(3\\ln x + 1)$.',
    ]},
    xpReward: 40,
  },
  // Math / Integration
  {
    subjectCode: 'math',
    topicCode: 'integration',
    difficulty: 'medium',
    examCodes: ['jee'],
    prompt: 'Evaluate $\\int_0^1 x e^x\\, dx$.',
    options: [
      { label: 'A', text: '$e - 1$' },
      { label: 'B', text: '$e$' },
      { label: 'C', text: '$1$' },
      { label: 'D', text: '$e + 1$' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Integrate by parts: $\\int x e^x dx = x e^x - e^x + C$.',
      'Evaluate: $[xe^x - e^x]_0^1 = (e - e) - (0 - 1) = 0 + 1 = 1$.',
    ]},
    xpReward: 60,
  },
  // Chemistry / Chemical Bonding
  {
    subjectCode: 'chem',
    topicCode: 'chemical-bonding',
    difficulty: 'easy',
    examCodes: ['jee', 'neet'],
    prompt: 'Which of the following molecules has a linear geometry?',
    options: [
      { label: 'A', text: '$H_2O$' },
      { label: 'B', text: '$NH_3$' },
      { label: 'C', text: '$CO_2$' },
      { label: 'D', text: '$SO_2$' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      '$CO_2$ has two double bonds and no lone pairs on carbon — VSEPR predicts linear geometry (180°).',
      '$H_2O$ is bent (104.5°), $NH_3$ is trigonal pyramidal (107°), $SO_2$ is bent (119°) due to lone pairs.',
    ]},
    xpReward: 30,
  },
  // Math / Permutations & Combinations
  {
    subjectCode: 'math',
    topicCode: 'permutations-combinations',
    difficulty: 'medium',
    examCodes: ['jee'],
    prompt: 'In how many ways can 5 different books be arranged on a shelf?',
    options: [
      { label: 'A', text: '25' },
      { label: 'B', text: '60' },
      { label: 'C', text: '120' },
      { label: 'D', text: '720' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Number of arrangements of $n$ distinct objects = $n!$.',
      '$5! = 5 \\times 4 \\times 3 \\times 2 \\times 1 = 120$.',
    ]},
    xpReward: 30,
  },
];

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  // Exams
  console.log('Seeding exams...');
  for (const e of EXAMS) {
    await prisma.exam.upsert({ where: { code: e.code }, create: e, update: e });
  }

  // Subjects
  console.log('Seeding subjects...');
  for (const s of SUBJECTS) {
    const { short, ...rest } = s;
    await prisma.subject.upsert({ where: { code: s.code }, create: s, update: rest });
  }

  // Exam → subject mappings
  console.log('Seeding exam → subject mappings...');
  for (const [examCode, subjectCodes] of Object.entries(EXAM_SUBJECTS)) {
    const exam = await prisma.exam.findUnique({ where: { code: examCode } });
    if (!exam) continue;
    for (let i = 0; i < subjectCodes.length; i++) {
      const subject = await prisma.subject.findUnique({ where: { code: subjectCodes[i] } });
      if (!subject) continue;
      await prisma.subjectExam.upsert({
        where: { subjectId_examId: { subjectId: subject.id, examId: exam.id } },
        create: { subjectId: subject.id, examId: exam.id, sortOrder: i + 1 },
        update: { sortOrder: i + 1 },
      });
    }
    console.log(`  ${examCode}: ${subjectCodes.join(', ')}`);
  }

  // Topics
  console.log('Seeding topics...');
  for (const [subjectCode, topics] of Object.entries(TOPICS)) {
    const subject = await prisma.subject.findUnique({ where: { code: subjectCode } });
    if (!subject) continue;
    for (let i = 0; i < topics.length; i++) {
      await prisma.topic.upsert({
        where: { subjectId_code: { subjectId: subject.id, code: topics[i].code } },
        create: { subjectId: subject.id, code: topics[i].code, label: topics[i].label, sortOrder: i + 1 },
        update: { label: topics[i].label, sortOrder: i + 1 },
      });
    }
    console.log(`  ${subjectCode}: ${topics.length} topics`);
  }

  // Exam → topic mappings
  console.log('Seeding exam → topic mappings...');
  for (const [examCode, subjectTopics] of Object.entries(EXAM_TOPICS)) {
    const exam = await prisma.exam.findUnique({ where: { code: examCode } });
    if (!exam) continue;
    for (const [subjectCode, topicCodes] of Object.entries(subjectTopics)) {
      const subject = await prisma.subject.findUnique({ where: { code: subjectCode } });
      if (!subject) continue;
      for (let i = 0; i < topicCodes.length; i++) {
        const topic = await prisma.topic.findUnique({
          where: { subjectId_code: { subjectId: subject.id, code: topicCodes[i] } },
        });
        if (!topic) continue;
        await prisma.topicExam.upsert({
          where: { topicId_examId: { topicId: topic.id, examId: exam.id } },
          create: { topicId: topic.id, examId: exam.id, sortOrder: i + 1 },
          update: { sortOrder: i + 1 },
        });
      }
    }
    console.log(`  ${examCode} topics mapped`);
  }

  // Sample questions
  console.log('Seeding sample questions...');
  for (const q of SAMPLE_QUESTIONS) {
    const subject = await prisma.subject.findUnique({ where: { code: q.subjectCode } });
    if (!subject) { console.warn(`  subject ${q.subjectCode} not found, skip`); continue; }

    const topic = await prisma.topic.findUnique({
      where: { subjectId_code: { subjectId: subject.id, code: q.topicCode } },
    });
    if (!topic) { console.warn(`  topic ${q.topicCode} not found, skip`); continue; }

    // Create the question row (no revision yet)
    const question = await prisma.question.create({
      data: {
        subjectId: subject.id,
        topicId:   topic.id,
        difficulty: q.difficulty,
        type:       'mcq',
        status:     'published',
        xpReward:   q.xpReward,
      },
    });

    // Create options
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      await prisma.questionOption.create({
        data: {
          questionId: question.id,
          label:      opt.label,
          text:       opt.text,
          sub:        opt.sub ?? null,
          sortOrder:  i + 1,
        },
      });
    }

    // Create the first revision
    const revision = await prisma.questionRevision.create({
      data: {
        questionId:          question.id,
        version:             1,
        prompt:              q.prompt,
        correctOptionLabel:  q.correctLabel,
        officialExplanation: q.explanation,
        difficulty:          q.difficulty,
        xpReward:            q.xpReward,
      },
    });

    // Link question → revision
    await prisma.question.update({
      where: { id: question.id },
      data:  { currentRevisionId: revision.id },
    });

    // Exam mappings
    for (const examCode of q.examCodes) {
      const exam = await prisma.exam.findUnique({ where: { code: examCode } });
      if (!exam) continue;
      await prisma.questionExam.upsert({
        where: { questionId_examId: { questionId: question.id, examId: exam.id } },
        create: { questionId: question.id, examId: exam.id },
        update: {},
      });
    }

    console.log(`  [${q.subjectCode}/${q.topicCode}] "${q.prompt.slice(0, 50)}..."`);
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

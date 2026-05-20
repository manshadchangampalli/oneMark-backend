import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ── Exams ────────────────────────────────────────────────────────────────────

const EXAMS = [
  { code: 'psc',    label: 'Kerala PSC', description: 'Kerala Public Service Commission', isActive: true  },
  { code: 'jee',    label: 'JEE',        description: 'Main + Advanced',                  isActive: false },
  { code: 'neet',   label: 'NEET',       description: 'Medical entrance',                 isActive: false },
  { code: 'cuet',   label: 'CUET',       description: 'Central universities',             isActive: false },
  { code: 'boards', label: 'Boards',     description: 'CBSE / ICSE / State',             isActive: false },
  { code: 'gate',   label: 'GATE',       description: 'Engineering PG',                  isActive: false },
  { code: 'cat',    label: 'CAT',        description: 'Management',                      isActive: false },
];

// ── Location ─────────────────────────────────────────────────────────────────

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
  'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
  'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod',
];

// ── Subjects (PSC-focused) ────────────────────────────────────────────────────

const SUBJECTS = [
  { code: 'kerala',  label: 'Kerala History & Culture', short: 'KH', colorHex: '#2E7D32', sortOrder: 1 },
  { code: 'india',   label: 'Indian History & Polity',  short: 'IP', colorHex: '#1565C0', sortOrder: 2 },
  { code: 'geo',     label: 'Geography',                short: 'GE', colorHex: '#6A1B9A', sortOrder: 3 },
  { code: 'gk',      label: 'General Knowledge',        short: 'GK', colorHex: '#E65100', sortOrder: 4 },
  { code: 'eng',     label: 'English',                  short: 'EN', colorHex: '#3B6FA0', sortOrder: 5 },
  { code: 'reason',  label: 'Logical Reasoning',        short: 'LR', colorHex: '#7B4EA0', sortOrder: 6 },
  { code: 'math',    label: 'General Mathematics',      short: 'MA', colorHex: '#3D7A4E', sortOrder: 7 },
];

const EXAM_SUBJECTS: Record<string, string[]> = {
  psc: ['kerala', 'india', 'geo', 'gk', 'eng', 'reason', 'math'],
};

// ── Topics ───────────────────────────────────────────────────────────────────

const TOPICS: Record<string, { code: string; label: string }[]> = {
  kerala: [
    { code: 'kerala-renaissance',  label: 'Kerala Renaissance' },
    { code: 'social-reformers',    label: 'Social Reformers' },
    { code: 'kingdoms-rulers',     label: 'Kingdoms & Rulers' },
    { code: 'kerala-literature',   label: 'Kerala Literature' },
    { code: 'arts-culture',        label: 'Arts & Culture' },
  ],
  india: [
    { code: 'freedom-movement',    label: 'Freedom Movement' },
    { code: 'constitution',        label: 'Indian Constitution' },
    { code: 'governance-polity',   label: 'Governance & Polity' },
    { code: 'national-symbols',    label: 'National Symbols & Facts' },
  ],
  geo: [
    { code: 'kerala-geography',    label: 'Kerala Geography' },
    { code: 'india-geography',     label: 'India Geography' },
    { code: 'rivers-lakes',        label: 'Rivers & Lakes' },
    { code: 'climate-environment', label: 'Climate & Environment' },
  ],
  gk: [
    { code: 'science-basics',      label: 'Science Basics' },
    { code: 'inventions-discoveries', label: 'Inventions & Discoveries' },
    { code: 'sports-awards',       label: 'Sports & Awards' },
    { code: 'current-affairs',     label: 'Current Affairs' },
  ],
  eng: [
    { code: 'grammar-basics',      label: 'Grammar Basics' },
    { code: 'vocabulary',          label: 'Vocabulary' },
    { code: 'reading-comprehension', label: 'Reading Comprehension' },
    { code: 'idioms-phrases',      label: 'Idioms & Phrases' },
  ],
  reason: [
    { code: 'number-series',       label: 'Number Series' },
    { code: 'blood-relations',     label: 'Blood Relations' },
    { code: 'coding-decoding',     label: 'Coding & Decoding' },
    { code: 'syllogisms',          label: 'Syllogisms' },
    { code: 'direction-distance',  label: 'Direction & Distance' },
    { code: 'analogy',             label: 'Analogy' },
  ],
  math: [
    { code: 'arithmetic',          label: 'Arithmetic' },
    { code: 'percentages',         label: 'Percentages' },
    { code: 'profit-loss',         label: 'Profit & Loss' },
    { code: 'time-work',           label: 'Time & Work' },
    { code: 'simple-interest',     label: 'Simple & Compound Interest' },
    { code: 'ratio-proportion',    label: 'Ratio & Proportion' },
  ],
};

const EXAM_TOPICS: Record<string, Record<string, string[]>> = {
  psc: {
    kerala: ['kerala-renaissance', 'social-reformers', 'kingdoms-rulers', 'kerala-literature', 'arts-culture'],
    india:  ['freedom-movement', 'constitution', 'governance-polity', 'national-symbols'],
    geo:    ['kerala-geography', 'india-geography', 'rivers-lakes', 'climate-environment'],
    gk:     ['science-basics', 'inventions-discoveries', 'sports-awards', 'current-affairs'],
    eng:    ['grammar-basics', 'vocabulary', 'reading-comprehension', 'idioms-phrases'],
    reason: ['number-series', 'blood-relations', 'coding-decoding', 'syllogisms', 'direction-distance', 'analogy'],
    math:   ['arithmetic', 'percentages', 'profit-loss', 'time-work', 'simple-interest', 'ratio-proportion'],
  },
};

// ── PSC Questions ─────────────────────────────────────────────────────────────

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

const PSC_QUESTIONS: Question[] = [
  // ── Kerala Renaissance ───────────────────────────────────────────────────
  {
    subjectCode: 'kerala',
    topicCode:   'social-reformers',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Who is popularly known as the "Kerala Gandhi"?',
    options: [
      { label: 'A', text: 'Sree Narayana Guru' },
      { label: 'B', text: 'K. Kelappan' },
      { label: 'C', text: 'Ayyankali' },
      { label: 'D', text: 'Chattampi Swamikal' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'K. Kelappan (1889–1971) was a nationalist and social reformer from Kerala.',
      'He was a close associate of Mahatma Gandhi and is honoured with the title "Kerala Gandhi" for his non-violent social activism.',
      'He led the Vaikom Satyagraha (1924) picket lines and worked for the upliftment of backward classes.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'kerala',
    topicCode:   'social-reformers',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Sree Narayana Guru founded SNDP Yogam in which year?',
    options: [
      { label: 'A', text: '1888' },
      { label: 'B', text: '1895' },
      { label: 'C', text: '1903' },
      { label: 'D', text: '1917' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'SNDP (Sree Narayana Dharma Paripalana) Yogam was founded in 1903.',
      'It was established to improve the social and educational conditions of the Ezhava community.',
      'Dr. Palpu was the president and Kumaran Asan the first secretary.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'kerala',
    topicCode:   'social-reformers',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Who founded the Sadhu Jana Paripalana Sangham in 1905 to fight for the rights of lower-caste communities in Kerala?',
    options: [
      { label: 'A', text: 'Sree Narayana Guru' },
      { label: 'B', text: 'K. Kelappan' },
      { label: 'C', text: 'Ayyankali' },
      { label: 'D', text: 'V.T. Bhattathirippad' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Ayyankali (1863–1941) was a social reformer who fought for the rights of Dalits in Kerala.',
      'He founded Sadhu Jana Paripalana Sangham in 1905, the first organisation of the Pulaya community.',
      'He is also credited with organising the first agricultural strike in India (1907–1910).',
    ]},
    xpReward: 40,
  },
  {
    subjectCode: 'kerala',
    topicCode:   'kerala-renaissance',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'The Vaikom Satyagraha (1924–1925) was a protest against:',
    options: [
      { label: 'A', text: 'British colonial taxation' },
      { label: 'B', text: 'Denial of entry to public roads near temples for lower-caste people' },
      { label: 'C', text: 'The partition of Kerala' },
      { label: 'D', text: 'The temple entry ban for all non-Hindus' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'The Vaikom Satyagraha demanded the right to use public roads near the Vaikom Mahadeva Temple for all communities.',
      'Lower-caste Hindus were prohibited from using roads adjacent to caste-Hindu temples.',
      'T.K. Madhavan, K. Kelappan, and George Joseph were key leaders; Mahatma Gandhi also visited.',
    ]},
    xpReward: 40,
  },
  {
    subjectCode: 'kerala',
    topicCode:   'kingdoms-rulers',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Who was the first Chief Minister of the state of Kerala after its formation on 1 November 1956?',
    options: [
      { label: 'A', text: 'C. Kesavan' },
      { label: 'B', text: 'Pattom Thanu Pillai' },
      { label: 'C', text: 'E.M.S. Namboodiripad' },
      { label: 'D', text: 'R. Sankar' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Kerala was formed on 1 November 1956 by merging Travancore-Cochin state and the Malabar district of Madras State.',
      'The 1957 elections brought the Communist Party of India to power.',
      'E.M.S. Namboodiripad became the first Chief Minister, heading the first democratically elected communist government in the world.',
    ]},
    xpReward: 40,
  },
  {
    subjectCode: 'kerala',
    topicCode:   'kerala-literature',
    difficulty:  'hard',
    examCodes:   ['psc'],
    prompt: 'Who authored "Atmopadesa Satakam", a philosophical poem of 100 verses?',
    options: [
      { label: 'A', text: 'Kumaran Asan' },
      { label: 'B', text: 'Vallathol Narayana Menon' },
      { label: 'C', text: 'Sree Narayana Guru' },
      { label: 'D', text: 'Ulloor S. Parameswara Iyer' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      '"Atmopadesa Satakam" (A Hundred Verses of Self-Instruction) was composed by Sree Narayana Guru.',
      'It is a philosophical work in Malayalam expressing the Advaita Vedanta philosophy in a simple, accessible style.',
      'Kumaran Asan, Vallathol, and Ulloor are the "Triumvirate of Malayalam Poetry" of the modern era.',
    ]},
    xpReward: 60,
  },

  // ── Indian History & Polity ───────────────────────────────────────────────
  {
    subjectCode: 'india',
    topicCode:   'constitution',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Which Article of the Indian Constitution abolishes untouchability?',
    options: [
      { label: 'A', text: 'Article 14' },
      { label: 'B', text: 'Article 15' },
      { label: 'C', text: 'Article 17' },
      { label: 'D', text: 'Article 21' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Article 17 abolishes untouchability and forbids its practice in any form.',
      'The enforcement of any disability arising out of untouchability is an offence punishable by law.',
      'The Protection of Civil Rights Act, 1955 gives effect to this article.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'india',
    topicCode:   'constitution',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'The Constitution of India was adopted by the Constituent Assembly on:',
    options: [
      { label: 'A', text: '15 August 1947' },
      { label: 'B', text: '26 January 1950' },
      { label: 'C', text: '26 November 1949' },
      { label: 'D', text: '9 December 1946' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'The Constitution was adopted on 26 November 1949 — observed as Constitution Day (Samvidhan Diwas).',
      'It came into force on 26 January 1950, celebrated as Republic Day.',
      'The Constituent Assembly first met on 9 December 1946.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'india',
    topicCode:   'constitution',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Right to Education (Article 21A) makes free and compulsory education a fundamental right for children in which age group?',
    options: [
      { label: 'A', text: '5–14 years' },
      { label: 'B', text: '6–14 years' },
      { label: 'C', text: '6–18 years' },
      { label: 'D', text: '5–16 years' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Article 21A was inserted by the 86th Constitutional Amendment Act, 2002.',
      'It guarantees free and compulsory education to all children between the ages of 6 and 14 years.',
      'The Right to Education (RTE) Act, 2009 gives effect to this provision.',
    ]},
    xpReward: 40,
  },
  {
    subjectCode: 'india',
    topicCode:   'governance-polity',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Which of the following is NOT a Directive Principle of State Policy under the Indian Constitution?',
    options: [
      { label: 'A', text: 'Equal pay for equal work for men and women' },
      { label: 'B', text: 'Uniform Civil Code' },
      { label: 'C', text: 'Freedom of speech and expression' },
      { label: 'D', text: 'Organisation of village panchayats' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Freedom of speech and expression is a Fundamental Right under Article 19(1)(a), not a DPSP.',
      'Directive Principles (Part IV, Articles 36–51) are non-justiciable guidelines for the State.',
      'Equal pay (Art. 39d), Uniform Civil Code (Art. 44), and Village Panchayats (Art. 40) are DPSPs.',
    ]},
    xpReward: 50,
  },

  // ── Geography ─────────────────────────────────────────────────────────────
  {
    subjectCode: 'geo',
    topicCode:   'kerala-geography',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Which is the largest district in Kerala by area?',
    options: [
      { label: 'A', text: 'Palakkad' },
      { label: 'B', text: 'Ernakulam' },
      { label: 'C', text: 'Idukki' },
      { label: 'D', text: 'Wayanad' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Idukki is the largest district in Kerala with an area of 4,358 sq. km.',
      'It is a largely hilly district situated in the Western Ghats.',
      'Palakkad (4,480 sq. km) is often confused — but Idukki is larger in Kerala.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'geo',
    topicCode:   'rivers-lakes',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Which is the longest river that originates and flows entirely within Kerala?',
    options: [
      { label: 'A', text: 'Bharathapuzha' },
      { label: 'B', text: 'Periyar' },
      { label: 'C', text: 'Pamba' },
      { label: 'D', text: 'Chaliyar' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Periyar (244 km) is the longest river in Kerala.',
      'Bharathapuzha (209 km) originates in Tamil Nadu (Nilgiri Hills) so it does not flow entirely within Kerala.',
      'Periyar originates in the Sivagiri Hills of the Western Ghats and drains into the Arabian Sea near Aluva.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'geo',
    topicCode:   'kerala-geography',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Silent Valley National Park, known for its undisturbed rainforest, is located in which district of Kerala?',
    options: [
      { label: 'A', text: 'Wayanad' },
      { label: 'B', text: 'Idukki' },
      { label: 'C', text: 'Palakkad' },
      { label: 'D', text: 'Malappuram' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Silent Valley National Park is located in the Nilgiri Hills of Palakkad district.',
      'It is one of the last undisturbed stretches of tropical rainforest in India.',
      'The Kunthipuzha river flows through the park.',
    ]},
    xpReward: 40,
  },

  // ── General Knowledge ─────────────────────────────────────────────────────
  {
    subjectCode: 'gk',
    topicCode:   'inventions-discoveries',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Who invented the telephone?',
    options: [
      { label: 'A', text: 'Thomas Edison' },
      { label: 'B', text: 'Alexander Graham Bell' },
      { label: 'C', text: 'Guglielmo Marconi' },
      { label: 'D', text: 'Nikola Tesla' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Alexander Graham Bell is credited with inventing the telephone in 1876.',
      'He was awarded the first patent for the telephone (US Patent 174,465) on 7 March 1876.',
      'Marconi is credited with radio; Edison with the light bulb; Tesla with alternating current.',
    ]},
    xpReward: 20,
  },
  {
    subjectCode: 'gk',
    topicCode:   'science-basics',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'What is the chemical formula of water?',
    options: [
      { label: 'A', text: 'HO' },
      { label: 'B', text: 'H₂O₂' },
      { label: 'C', text: 'H₂O' },
      { label: 'D', text: 'OH₂' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Water consists of two hydrogen atoms bonded to one oxygen atom: H₂O.',
      'H₂O₂ is hydrogen peroxide — a different compound used as an antiseptic.',
    ]},
    xpReward: 20,
  },

  // ── English ───────────────────────────────────────────────────────────────
  {
    subjectCode: 'eng',
    topicCode:   'grammar-basics',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Choose the correct sentence:',
    options: [
      { label: 'A', text: 'She don\'t know the answer.' },
      { label: 'B', text: 'She doesn\'t knows the answer.' },
      { label: 'C', text: 'She doesn\'t know the answer.' },
      { label: 'D', text: 'She not know the answer.' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'With third-person singular subjects (she, he, it), the auxiliary is "doesn\'t" (does not).',
      '"Doesn\'t" is followed by the base form of the verb: "know" (not "knows").',
      'Option C — "She doesn\'t know the answer." — is the grammatically correct sentence.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'eng',
    topicCode:   'vocabulary',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'What is the antonym of "Benevolent"?',
    options: [
      { label: 'A', text: 'Generous' },
      { label: 'B', text: 'Kind' },
      { label: 'C', text: 'Malevolent' },
      { label: 'D', text: 'Charitable' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      '"Benevolent" means well-meaning and kindly.',
      'Its antonym is "Malevolent", meaning having or showing a wish to do evil to others.',
      'Generous, Kind, and Charitable are synonyms of Benevolent, not antonyms.',
    ]},
    xpReward: 40,
  },
  {
    subjectCode: 'eng',
    topicCode:   'idioms-phrases',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'What does the idiom "Beat around the bush" mean?',
    options: [
      { label: 'A', text: 'To fight in a forest' },
      { label: 'B', text: 'To avoid coming to the main point' },
      { label: 'C', text: 'To work very hard' },
      { label: 'D', text: 'To search carefully' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      '"Beat around the bush" means to avoid talking about the main subject.',
      'It implies that someone is being indirect or evasive instead of addressing the issue directly.',
      'Example: "Stop beating around the bush and tell me what happened."',
    ]},
    xpReward: 40,
  },

  // ── Logical Reasoning ─────────────────────────────────────────────────────
  {
    subjectCode: 'reason',
    topicCode:   'number-series',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'Find the missing number in the series: 2, 6, 12, 20, 30, ?',
    options: [
      { label: 'A', text: '40' },
      { label: 'B', text: '42' },
      { label: 'C', text: '44' },
      { label: 'D', text: '36' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'The pattern: differences between consecutive terms are 4, 6, 8, 10, 12 (increasing by 2).',
      '2 → 6 (+4), 6 → 12 (+6), 12 → 20 (+8), 20 → 30 (+10), 30 → ? (+12).',
      '30 + 12 = 42.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'reason',
    topicCode:   'blood-relations',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Pointing to a photograph, a man says, "She is the daughter of my grandfather\'s only son." How is the woman in the photograph related to the man?',
    options: [
      { label: 'A', text: 'Mother' },
      { label: 'B', text: 'Aunt' },
      { label: 'C', text: 'Sister' },
      { label: 'D', text: 'Cousin' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Grandfather\'s only son = the man\'s father (assuming the man himself is that son, or it is his father).',
      'Daughter of the man\'s father = the man\'s sister.',
      'Therefore, the woman in the photograph is the man\'s Sister.',
    ]},
    xpReward: 40,
  },
  {
    subjectCode: 'reason',
    topicCode:   'coding-decoding',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'In a certain code, "CHAIR" is written as "DIBJS". How is "TABLE" written in that code?',
    options: [
      { label: 'A', text: 'UBCMF' },
      { label: 'B', text: 'UCDMF' },
      { label: 'C', text: 'SZBKD' },
      { label: 'D', text: 'UBDMG' },
    ],
    correctLabel: 'A',
    explanation: { steps: [
      'Each letter is shifted forward by 1 position in the alphabet.',
      'C→D, H→I, A→B, I→J, R→S gives DIBJS. ✓',
      'Applying the same to TABLE: T→U, A→B, B→C, L→M, E→F = UBCMF.',
    ]},
    xpReward: 50,
  },
  {
    subjectCode: 'reason',
    topicCode:   'direction-distance',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Rahul starts from point A, walks 10 km North, then turns East and walks 6 km, then turns South and walks 10 km to reach point B. What is the distance between A and B?',
    options: [
      { label: 'A', text: '4 km' },
      { label: 'B', text: '6 km' },
      { label: 'C', text: '10 km' },
      { label: 'D', text: '26 km' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'After walking 10 km North, 6 km East, and 10 km South, the net N–S displacement is 0.',
      'The net E–W displacement is 6 km East.',
      'So point B is exactly 6 km East of point A — distance A to B = 6 km.',
    ]},
    xpReward: 50,
  },

  // ── Mathematics ───────────────────────────────────────────────────────────
  {
    subjectCode: 'math',
    topicCode:   'percentages',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'A student scored 450 marks out of 600. What is his percentage?',
    options: [
      { label: 'A', text: '70%' },
      { label: 'B', text: '72%' },
      { label: 'C', text: '75%' },
      { label: 'D', text: '80%' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'Percentage = (Marks obtained / Total marks) × 100',
      '= (450 / 600) × 100 = 0.75 × 100 = 75%.',
    ]},
    xpReward: 20,
  },
  {
    subjectCode: 'math',
    topicCode:   'profit-loss',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'A shopkeeper buys an article for ₹800 and sells it for ₹1,000. What is his profit percentage?',
    options: [
      { label: 'A', text: '20%' },
      { label: 'B', text: '25%' },
      { label: 'C', text: '28%' },
      { label: 'D', text: '30%' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Profit = Selling Price − Cost Price = ₹1,000 − ₹800 = ₹200.',
      'Profit % = (Profit / Cost Price) × 100 = (200 / 800) × 100 = 25%.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'math',
    topicCode:   'time-work',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'A can complete a work in 12 days and B can complete the same work in 18 days. In how many days can they complete the work together?',
    options: [
      { label: 'A', text: '6 days' },
      { label: 'B', text: '7 days' },
      { label: 'C', text: '7.2 days' },
      { label: 'D', text: '8 days' },
    ],
    correctLabel: 'C',
    explanation: { steps: [
      'A\'s 1-day work = 1/12; B\'s 1-day work = 1/18.',
      'Combined 1-day work = 1/12 + 1/18 = 3/36 + 2/36 = 5/36.',
      'Days to complete = 36/5 = 7.2 days.',
    ]},
    xpReward: 40,
  },
  {
    subjectCode: 'math',
    topicCode:   'simple-interest',
    difficulty:  'medium',
    examCodes:   ['psc'],
    prompt: 'Find the simple interest on ₹5,000 at 8% per annum for 3 years.',
    options: [
      { label: 'A', text: '₹1,000' },
      { label: 'B', text: '₹1,200' },
      { label: 'C', text: '₹1,500' },
      { label: 'D', text: '₹2,000' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Simple Interest = (P × R × T) / 100',
      '= (5,000 × 8 × 3) / 100 = 1,20,000 / 100 = ₹1,200.',
    ]},
    xpReward: 30,
  },
  {
    subjectCode: 'math',
    topicCode:   'ratio-proportion',
    difficulty:  'easy',
    examCodes:   ['psc'],
    prompt: 'If the ratio of boys to girls in a class is 3:2 and the total number of students is 50, how many girls are there?',
    options: [
      { label: 'A', text: '15' },
      { label: 'B', text: '20' },
      { label: 'C', text: '25' },
      { label: 'D', text: '30' },
    ],
    correctLabel: 'B',
    explanation: { steps: [
      'Total parts = 3 + 2 = 5.',
      'Girls = (2/5) × 50 = 20.',
    ]},
    xpReward: 20,
  },
];

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Exams ──
  console.log('Seeding exams...');
  for (const e of EXAMS) {
    await prisma.exam.upsert({ where: { code: e.code }, create: e, update: e });
  }
  const activeCodes = EXAMS.filter((e) => e.isActive).map((e) => e.code);
  await prisma.exam.updateMany({ where: { code: { notIn: activeCodes } }, data: { isActive: false } });
  console.log(`  Active: ${activeCodes.join(', ')}`);

  // ── Clear all questions ──
  console.log('Clearing existing questions...');
  await prisma.dailyChallenge.deleteMany({});
  await prisma.attempt.deleteMany({});
  await prisma.sessionQuestion.deleteMany({});
  await prisma.practiceSession.deleteMany({});
  await prisma.questionExam.deleteMany({});
  await prisma.questionOption.deleteMany({});
  await prisma.questionRevision.deleteMany({});
  await prisma.question.deleteMany({});
  console.log('  Done — all questions cleared');

  // ── Subjects ──
  console.log('Seeding subjects...');
  for (const s of SUBJECTS) {
    await prisma.subject.upsert({ where: { code: s.code }, create: s, update: s });
  }

  // ── Exam → Subject mappings ──
  console.log('Seeding exam → subject mappings...');
  await prisma.subjectExam.deleteMany({});
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

  // ── Topics ──
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

  // ── Exam → Topic mappings ──
  console.log('Seeding exam → topic mappings...');
  await prisma.topicExam.deleteMany({});
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

  // ── PSC Questions ──
  console.log('Seeding PSC questions...');
  for (const q of PSC_QUESTIONS) {
    const subject = await prisma.subject.findUnique({ where: { code: q.subjectCode } });
    if (!subject) { console.warn(`  subject ${q.subjectCode} not found, skip`); continue; }

    const topic = await prisma.topic.findUnique({
      where: { subjectId_code: { subjectId: subject.id, code: q.topicCode } },
    });
    if (!topic) { console.warn(`  topic ${q.topicCode} not found, skip`); continue; }

    const question = await prisma.question.create({
      data: {
        subjectId:  subject.id,
        topicId:    topic.id,
        difficulty: q.difficulty,
        type:       'mcq',
        status:     'published',
        xpReward:   q.xpReward,
      },
    });

    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      await prisma.questionOption.create({
        data: { questionId: question.id, label: opt.label, text: opt.text, sub: opt.sub ?? null, sortOrder: i + 1 },
      });
    }

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

    await prisma.question.update({
      where: { id: question.id },
      data:  { currentRevisionId: revision.id },
    });

    for (const examCode of q.examCodes) {
      const exam = await prisma.exam.findUnique({ where: { code: examCode } });
      if (!exam) continue;
      await prisma.questionExam.upsert({
        where: { questionId_examId: { questionId: question.id, examId: exam.id } },
        create: { questionId: question.id, examId: exam.id },
        update: {},
      });
    }

    console.log(`  ✓ [${q.subjectCode}] ${q.prompt.slice(0, 55)}...`);
  }

  // ── Location — Kerala ──
  console.log('Seeding Kerala state and districts...');
  const kerala = await prisma.state.upsert({
    where:  { code: 'KL' },
    create: { name: 'Kerala', code: 'KL' },
    update: { name: 'Kerala' },
  });
  for (let i = 0; i < KERALA_DISTRICTS.length; i++) {
    await prisma.district.upsert({
      where:  { stateId_name: { stateId: kerala.id, name: KERALA_DISTRICTS[i] } },
      create: { stateId: kerala.id, name: KERALA_DISTRICTS[i], sortOrder: i + 1 },
      update: { sortOrder: i + 1 },
    });
  }
  console.log(`  Kerala: ${KERALA_DISTRICTS.length} districts`);

  console.log('\nDone. ✓');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

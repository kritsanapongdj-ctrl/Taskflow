import React from 'react';

const ClassEmblem = ({ archetypeKey, className = "", size = 100 }) => {
  const crests = {
    'agi_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-15 15 L-20 -10 C-10 -30 10 -30 20 -10 L15 15 Z" />
        <path d="M-15 -10 L15 -10 M-7 -2 L7 -2 M-15 15 C-5 25 5 25 15 15" />
      </g>
    ),
    'dex_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-30 30 C0 -10 20 -25 35 -20" />
        <path d="M-30 30 L-20 40 L-10 30 Z" fill="currentColor" />
        <circle cx="20" cy="-20" r="10" opacity="0.4" />
      </g>
    ),
    'int_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 30 L0 -35 L12 -15 Z" />
        <path d="M-15 10 L15 10 M-8 10 L-8 30 M8 10 L8 30" />
        <path d="M-20 -15 C-5 -25 -5 5 -20 15 Z" opacity="0.4" />
      </g>
    ),
    'con_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 -25 L25 25 M-25 25 L25 -25" />
        <path d="M-25 -25 C-35 -15 -35 -5 -25 5 L-5 -15 Z" fill="currentColor" opacity="0.3" />
        <path d="M25 -25 C35 -15 35 -5 25 5 L5 -15 Z" fill="currentColor" opacity="0.3" />
      </g>
    ),
    'sen_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -35 L0 35 M-10 -15 L10 -15" />
        <path d="M-20 -5 L-20 15 C-20 30 0 40 0 40 C0 40 20 30 20 15 L20 -5 Z" opacity="0.5" />
      </g>
    ),
    'agi_dex': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r="12" />
        <path d="M0 -12 L0 -35 M0 12 L0 35 M-12 0 L-35 0 M12 0 L35 0" />
        <path d="M-8 -8 L-25 -25 M8 8 L25 25 M-8 8 L-25 25 M8 -8 L25 -25" opacity="0.5" />
      </g>
    ),
    'agi_int': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 25 C-10 10 10 -20 30 -30 L10 10 Z" />
        <path d="M-25 25 C-5 40 25 20 35 0 C25 -5 5 15 -10 25" opacity="0.4" />
      </g>
    ),
    'agi_con': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -30 L0 30 M-10 -20 L10 -20" />
        <path d="M-25 15 C-25 35 25 35 25 15 M-25 15 L-15 15 M25 15 L15 15" />
        <circle cx="0" cy="-35" r="5" />
      </g>
    ),
    'agi_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 -10 C-35 15 -15 35 10 25 L5 10 C-10 15 -20 0 -15 -15 Z" />
        <circle cx="20" cy="-15" r="8" opacity="0.5" />
        <path d="M20 -7 L20 25" strokeDasharray="3 3" />
      </g>
    ),
    'dex_int': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 20 L20 -20" />
        <rect x="10" y="-30" width="20" height="20" rx="3" transform="rotate(45 20 -20)" fill="currentColor" opacity="0.3" />
        <rect x="-30" y="10" width="20" height="20" rx="3" transform="rotate(45 -20 20)" fill="currentColor" opacity="0.3" />
        <circle cx="0" cy="0" r="10" />
      </g>
    ),
    'con_dex': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -35 L0 35 M-10 -15 L10 -15" opacity="0.4" />
        <path d="M-15 -5 L-15 15 C-15 30 0 40 0 40 C0 40 15 30 15 15 L15 -5 Z" />
        <path d="M-10 5 L10 5" />
      </g>
    ),
    'dex_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 -30 C15 -30 30 -15 30 20" />
        <path d="M-20 -30 L30 20" opacity="0.4" />
        <path d="M-15 25 L25 -15 M0 10 L10 0" />
      </g>
    ),
    'con_int': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 0 L-25 25 L0 40 L25 25 L25 0 L0 -15 Z" />
        <circle cx="0" cy="12" r="6" fill="currentColor" opacity="0.4" />
        <path d="M0 -35 L0 -15 M-10 -25 L10 -25" />
      </g>
    ),
    'int_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 -15 Q0 10 25 -15 Q25 20 0 35 Q-25 20 -25 -15 Z" />
        <circle cx="-10" cy="-5" r="3" fill="currentColor" />
        <circle cx="10" cy="-5" r="3" fill="currentColor" />
        <path d="M0 5 L0 15" opacity="0.5" />
      </g>
    ),
    'con_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 30 L20 -30" />
        <path d="M5 -10 C20 -25 35 -5 20 10 Z" fill="currentColor" opacity="0.4" />
        <path d="M-25 15 C-15 5 -5 15 -15 25 Z" />
      </g>
    ),
    'agi_con_dex': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 35 L0 -35 M-12 -15 L12 -15" />
        <path d="M-15 -5 L-30 -15 L-20 5 L-30 15 L-10 15 Z" opacity="0.5" />
        <path d="M15 -5 L30 -15 L20 5 L30 15 L10 15 Z" opacity="0.5" />
      </g>
    ),
    'agi_con_int': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-30 30 L30 -30" />
        <path d="M-20 10 C-10 0 0 -10 -5 -20 C-20 -10 -10 10 -20 10 Z" fill="currentColor" opacity="0.4" />
        <path d="M0 20 C20 10 30 20 20 30 C5 30 0 40 -10 20 Z" fill="currentColor" opacity="0.4" />
      </g>
    ),
    'agi_con_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 -20 L20 20 M-10 -20 L-20 -10 M10 20 L20 10" opacity="0.4" />
        <circle cx="0" cy="5" r="10" />
        <circle cx="-15" cy="-10" r="4" /><circle cx="0" cy="-15" r="4" /><circle cx="15" cy="-10" r="4" />
      </g>
    ),
    'agi_con_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r="15" />
        <path d="M-25 15 C-35 -15 -5 -35 15 -25 C35 -15 35 15 25 25" opacity="0.5" />
        <path d="M0 -15 L0 15 M-15 0 L15 0" />
      </g>
    ),
    'agi_dex_int': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-30 30 C0 -10 20 -25 35 -20" />
        <path d="M10 10 C0 20 10 30 20 20 C30 10 20 0 10 10 Z" fill="currentColor" opacity="0.5" />
        <path d="M-15 -15 C-25 -5 -15 5 -5 -5 C5 -15 -5 -25 -15 -15 Z" fill="currentColor" opacity="0.5" />
      </g>
    ),
    'agi_dex_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r="25" />
        <circle cx="0" cy="0" r="15" opacity="0.4" />
        <path d="M0 -25 L0 -35 M0 25 L0 35 M-25 0 L-35 0 M25 0 L35 0" />
        <path d="M-17 -17 L-25 -25 M17 17 L25 25 M-17 17 L-25 25 M17 -17 L25 -25" opacity="0.5" />
      </g>
    ),
    'agi_dex_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 0 C-25 -25 0 -25 25 -25" />
        <path d="M-25 0 L25 -25" opacity="0.4" />
        <path d="M0 30 L0 -10 M-10 20 L10 20" />
      </g>
    ),
    'agi_int_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 25 L-20 0 L0 -25 L20 0 Z" />
        <circle cx="0" cy="0" r="8" fill="currentColor" opacity="0.5" />
        <path d="M-30 10 C-15 -10 -5 -15 0 -35 C5 -15 15 -10 30 10" opacity="0.4" />
      </g>
    ),
    'agi_int_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 30 C-30 0 -40 -30 -10 -30 C0 -30 0 -10 0 0 C0 -10 0 -30 10 -30 C40 -30 30 0 0 30 Z" />
        <path d="M0 30 L-20 0 M0 30 L0 -10 M0 30 L20 0" opacity="0.4" />
      </g>
    ),
    'agi_sen_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 25 L25 -25 M-20 30 L30 -20" />
        <path d="M25 -25 C35 -15 15 -5 15 -15 Z" fill="currentColor" opacity="0.5" />
        <path d="M-25 25 C-35 15 -15 5 -15 15 Z" fill="currentColor" opacity="0.5" />
      </g>
    ),
    'con_dex_int': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -30 L25 -15 L25 15 L0 30 L-25 15 L-25 -15 Z" />
        <path d="M0 -30 L0 0 L25 15 M0 0 L-25 15" opacity="0.5" />
        <circle cx="0" cy="0" r="4" fill="currentColor" />
      </g>
    ),
    'con_dex_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -35 L0 35 M-10 -15 L10 -15" />
        <path d="M-10 -15 C-25 -15 -35 -5 -35 15 C-25 5 -15 5 -5 0" opacity="0.5" />
        <path d="M10 -15 C25 -15 35 -5 35 15 C25 5 15 5 5 0" opacity="0.5" />
      </g>
    ),
    'con_dex_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 -35 L10 35 M0 -15 L20 -15" />
        <path d="M-25 -5 L-25 15 C-25 30 -5 40 -5 40 C-5 40 -5 -15 -25 -5 Z" opacity="0.5" />
        <path d="M10 -35 L5 -25 L15 -25 Z" fill="currentColor" />
      </g>
    ),
    'con_int_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r="25" strokeDasharray="10 6" />
        <path d="M0 -15 L0 15 M-15 0 L15 0" opacity="0.5" />
        <circle cx="0" cy="0" r="5" fill="currentColor" />
      </g>
    ),
    'con_int_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -15 L0 40" />
        <circle cx="0" cy="-20" r="10" />
        <path d="M-15 -30 C-5 -45 5 -45 15 -30 C20 -15 0 -10 0 -20" opacity="0.4" />
      </g>
    ),
    'con_sen_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -15 L0 40 M-10 -5 L10 -5" />
        <path d="M0 -15 L-15 -30 L0 -40 L15 -30 Z" />
        <circle cx="-20" cy="10" r="3" fill="currentColor" opacity="0.5" />
        <circle cx="20" cy="-5" r="3" fill="currentColor" opacity="0.5" />
      </g>
    ),
    'dex_int_sen': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="0" cy="0" rx="25" ry="10" transform="rotate(30)" />
        <ellipse cx="0" cy="0" rx="25" ry="10" transform="rotate(-30)" />
        <circle cx="0" cy="0" r="15" opacity="0.4" />
        <circle cx="0" cy="0" r="3" fill="currentColor" />
      </g>
    ),
    'dex_int_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-10 25 L10 25 L15 -5 L0 -35 L-15 -5 Z" />
        <path d="M-15 -5 L15 -5 M-10 10 L10 10" opacity="0.4" />
        <path d="M-30 0 L-20 -10 M30 0 L20 -10 M0 40 L0 30" opacity="0.5" />
      </g>
    ),
    'dex_sen_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-25 25 L20 -20 L30 -20 L30 -10 L-15 35" />
        <path d="M25 -25 L-20 20 L-30 20 L-30 10 L15 -35" opacity="0.7" />
        <circle cx="0" cy="5" r="6" fill="currentColor" opacity="0.3" />
      </g>
    ),
    'int_sen_str': (
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 35 L20 -25" />
        <path d="M20 -25 C10 -40 -15 -35 -25 -20 C-15 -30 5 -25 10 -10 Z" fill="currentColor" />
        <circle cx="-10" cy="15" r="4" fill="currentColor" opacity="0.5" />
      </g>
    )
  };

  const defaultCrest = (
    <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="0" r="35" strokeDasharray="4 6" opacity="0.5" />
      <path d="M-20 0 L20 0 M0 -20 L0 20" opacity="0.5" />
      <circle cx="0" cy="0" r="5" fill="currentColor" />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      {crests[archetypeKey] || defaultCrest}
    </svg>
  );
};

export default ClassEmblem;

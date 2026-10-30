# LH TaskFlow — Claude Code Guide

## Overview
Land & Houses Property & Infrastructure Maintenance Central Management System.
Stack: React 19 + Vite + Firebase + Recharts + Vercel Serverless LINE Webhook + RPG Guild Simulation.

## Commands
- Dev Server: `npm run dev`
- Run Tests: `npm test` (`node scripts/test_penalty_engine.cjs && node scripts/test_sla_detector.cjs`)
- Production Build: `npm run build`
- Linter: `npm run lint`

## Architecture & Key Paths
- `src/components/`: UI components and modals (`src/components/modals/`)
- `api/_agents/`: LINE Webhook Orchestrator & Autonomous Guild agents
- `scripts/`: Penalty calculation engine, SLA detector tests
- `src/firebase.js`: Firebase configuration & Firestore connection

## Rules & Standards
- Action-first, concise Thai communication.
- Test-driven: Always run `npm test` before asserting fixes.
- Safe Firebase updates: Do not overwrite production Firestore collections blindly.
- Primary skills: `superpowers`, `impeccable`, `lh-autonomous-guild`, `lh-talent-engine`.

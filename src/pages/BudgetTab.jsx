import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { doc, onSnapshot } from 'firebase/firestore';

// 13 หมวดบัญชีตามมาตรฐานรายงานบัญชีกลาง LH
const ACCOUNT_META = {
  '54010': { name: 'ค่าซ่อม-สโมสร,สระว่ายน้ำ', shortName: 'ซ่อมสโมสร/สระ', group: 'VARIABLE', groupName: 'ผันแปร', color: '#6366F1', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  '54011': { name: 'ค่าซ่อม-ต้นไม้,สวน', shortName: 'ซ่อมต้นไม้/สวน', group: 'VARIABLE', groupName: 'ผันแปร', color: '#10B981', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  '54012': { name: 'ค่าซ่อม-สาธารณูฯ,ทรัพย์สินอื่น', shortName: 'ซ่อมสาธารณูฯ/ทรัพย์สิน', group: 'VARIABLE', groupName: 'ผันแปร', color: '#0EA5E9', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  '54014': { name: 'ค่าบำรุงรักษา-ต้นไม้,สวน', shortName: 'บำรุงรักษาต้นไม้/สวน', group: 'MAINTENANCE', groupName: 'บำรุงรักษา', color: '#059669', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  '54015': { name: 'ค่าบำรุงรักษา-สาธารณูฯ,ทรัพย์สินอื่น', shortName: 'บำรุงรักษาสาธารณูฯ', group: 'MAINTENANCE', groupName: 'บำรุงรักษา', color: '#F59E0B', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  '54021': { name: 'ค่าบริหาร-ควบคุมงานซ่อม(รายเดือน)', shortName: 'ค่าบริหารควบคุมงาน', group: 'FIXED', groupName: 'คงที่', color: '#8B5CF6', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  '54107': { name: 'ค่าน้ำประปา-บริษัท', shortName: 'ค่าน้ำประปา', group: 'UTILITY', groupName: 'สาธารณูปโภค', color: '#0284C7', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  '54108': { name: 'ค่าไฟฟ้า-บริษัท', shortName: 'ค่าไฟฟ้า', group: 'UTILITY', groupName: 'สาธารณูปโภค', color: '#EAB308', badge: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  '54111': { name: 'คชจ.ดูแลสวน(จัดสรรใหม่)', shortName: 'สัญญาดูแลสวน', group: 'FIXED', groupName: 'คงที่', color: '#14B8A6', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  '54110': { name: 'ค่าซ่อมแซม-อาคารสโมสร/ส่วนกลาง', shortName: 'ซ่อมสโมสร', group: 'VARIABLE', groupName: 'ผันแปร', color: '#6366F1', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  '54210': { name: 'ค่าบำรุงรักษา-อาคารสโมสร/ส่วนกลาง', shortName: 'บำรุงรักษาสโมสร', group: 'MAINTENANCE', groupName: 'บำรุงรักษา', color: '#F59E0B', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  '54102': { name: 'ค่าบริการส่วนกลางจัดสรร', shortName: 'ส่วนกลางจัดสรร', group: 'FIXED', groupName: 'คงที่', color: '#8B5CF6', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  '54202': { name: 'ค่าบำรุงรักษาส่วนกลางจัดสรร', shortName: 'บำรุงส่วนกลาง', group: 'MAINTENANCE', groupName: 'บำรุงรักษา', color: '#F59E0B', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
};

const getAccountName = (code) => ACCOUNT_META[code]?.name || `รหัสบัญชี ${code}`;
const getAccountShortName = (code) => ACCOUNT_META[code]?.shortName || `รหัส ${code}`;
const getAccountBadge = (code) => ACCOUNT_META[code]?.badge || 'bg-slate-100 text-slate-700 border-slate-200';

// 11 หมวดบัญชีเป้าหมายตามมาตรฐาน LH
const TARGET_ACCOUNT_CODES = [
  { code: '54011', name: 'ค่าซ่อม-ต้นไม้,สวน', group: 'VARIABLE', typeName: 'งานซ่อมผันแปร' },
  { code: '54012', name: 'ค่าซ่อม-สาธารณูฯ,ทรัพย์สินอื่น', group: 'VARIABLE', typeName: 'งานซ่อมผันแปร' },
  { code: '54010', name: 'ค่าซ่อม-สโมสร,สระว่ายน้ำ', group: 'VARIABLE', typeName: 'งานซ่อมผันแปร' },
  { code: '54014', name: 'ค่าบำรุงรักษา-ต้นไม้,สวน', group: 'VARIABLE', typeName: 'งานบำรุงรักษา' },
  { code: '54015', name: 'ค่าบำรุงรักษา-สาธารณูฯ,ทรัพย์สินอื่น', group: 'VARIABLE', typeName: 'งานบำรุงรักษา' },
  { code: '54021', name: 'ค่าบริหาร-ควบคุมงานซ่อม(รายเดือน)', group: 'FIXED', typeName: 'งานบริหารคงที่' },
  { code: '54111', name: 'คชจ.ดูแลสวน(จัดสรรใหม่)', group: 'FIXED', typeName: 'สัญญาดูแลสวนคงที่' },
  { code: '54107', name: 'ค่าน้ำประปา-บริษัท', group: 'UTILITY', typeName: 'สาธารณูปโภค' },
  { code: '54108', name: 'ค่าไฟฟ้า-บริษัท', group: 'UTILITY', typeName: 'สาธารณูปโภค' },
  { code: '54102', name: 'ค่าใช้จ่ายส่วนกลางจัดสรร', group: 'FIXED', typeName: 'ค่าบริการส่วนกลาง' },
  { code: '54003', name: 'ค่าควบคุมงานซ่อมสาธารณูฯ', group: 'FIXED', typeName: 'งานควบคุม' }
];

// 11 ไซต์โครงการหลักที่เราดูแลจริง
const CORE_11_PROJECTS = [
  { code: 'LA-025', name: 'PRUEKLADA ทางด่วนรามอินทรา-จตุโชติ', area: 'รามอินทรา', baseBudget69: 3612600, baseBudget70: 1650000 },
  { code: 'LH-402', name: 'vie ทางด่วนรามอินทรา-วงแหวน', area: 'รามอินทรา', baseBudget69: 2323300, baseBudget70: 1250000 },
  { code: 'LH-410', name: 'CHAIYAPRUEK 2 รังสิต คลอง4', area: 'รังสิต', baseBudget69: 3653700, baseBudget70: 890000 },
  { code: 'LH-415', name: 'Villaggio ลำลูกกา-วงแหวน', area: 'รังสิต', baseBudget69: 3873000, baseBudget70: 520000 },
  { code: 'NE-419', name: 'Villaggio รังสิตคลอง 4', area: 'รังสิต', baseBudget69: 3148000, baseBudget70: 640000 },
  { code: 'LH-377', name: 'VIVE กรุงเทพกรีฑา', area: 'พระราม 9', baseBudget69: 1450000, baseBudget70: 1450000 },
  { code: 'LH-379', name: 'นันทวัน พระราม9 กรุงเทพกรีฑาตัดใหม่', area: 'พระราม 9', baseBudget69: 4181000, baseBudget70: 3100000 },
  { code: 'LH-392', name: 'VIVE กรุงเทพกรีฑาตัดใหม่', area: 'พระราม 9', baseBudget69: 2822700, baseBudget70: 950000 },
  { code: 'LH-395', name: 'NANTAWAN POOL VILLA พระราม9 กรุงเทพกรีฑาตัดใหม่', area: 'พระราม 9', baseBudget69: 2768100, baseBudget70: 1180000 },
  { code: 'NE-416', name: 'VIVE พระราม 9', area: 'พระราม 9', baseBudget69: 580000, baseBudget70: 580000 },
  { code: 'LH-329', name: 'สีวลี ศรีนครินทร์-ร่มเกล้า', area: 'ศรีนครินทร์', baseBudget69: 4023100, baseBudget70: 1350000 }
];

const ACCOUNT_COLORS = [
  '#003C71', '#7A1C28', '#A8996E', '#10B981', '#F59E0B',
  '#6366F1', '#EC4899', '#06B6D4', '#84CC16', '#8B5CF6', '#14B8A6'
];

const THAI_MONTH_NAMES = [
  '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTH_SHORT = [
  '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// แปลงหน่วยตัวเลขจากพันบาท (kTHB) ในตาราง LH เป็นบาท (THB)
const kThbToBaht = (val, fallback = 0) => {
  if (val === undefined || val === null || isNaN(Number(val))) return fallback;
  return Number(val) * 1000;
};

// คำนวณเดือนจ่ายจริง: เดือนที่ส่งเบิก M -> เงินออกจริงเดือน M+2
const getPaymentMonth = (billingMonthStr) => {
  if (!billingMonthStr || billingMonthStr === 'ALL' || !billingMonthStr.includes('-')) return '2026-12';
  const [y, m] = billingMonthStr.split('-').map(Number);
  let payM = m + 2;
  let payY = y;
  if (payM > 12) {
    payM -= 12;
    payY += 1;
  }
  return `${payY}-${String(payM).padStart(2, '0')}`;
};

const formatThaiMonthStr = (mStr, short = false) => {
  if (!mStr || mStr === 'ALL') return short ? 'ทั้งปี 69' : 'ทุกเดือน (ม.ค. - ธ.ค. 2569)';
  if (!mStr.includes('-')) return mStr;
  const [y, m] = mStr.split('-').map(Number);
  const thaiY = (y + 543) % 100;
  const fullThaiY = y + 543;
  const list = short ? THAI_MONTH_SHORT : THAI_MONTH_NAMES;
  return short ? `${list[m]} ${thaiY}` : `${list[m]} ${fullThaiY}`;
};

const extractProjCode = (projStr) => {
  if (!projStr) return '';
  const m = String(projStr).match(/([A-Z]{2}-\d{3})/i);
  return m ? m[1].toUpperCase() : '';
};

export default function BudgetTab({
  tasks = [],
  gFilt = {},
  getStdProj = (p) => p,
  checkStaffMatch = () => true,
  db,
  Icon
}) {
  // สลับมุมมองปีงบประมาณ: ปี 2569 (ปีดำเนินงานจริง) vs ปี 2570 (แผนจัดสรรล่วงหน้า)
  const [fiscalYear, setFiscalYear] = useState('2569');

  // ฟิลเตอร์เจาะลึก
  const [selectedProj, setSelectedProj] = useState(gFilt.project !== 'ทั้งหมด' ? gFilt.project : 'ALL');
  const [selectedBillingMonth, setSelectedBillingMonth] = useState('2026-10'); // เดือนปัจจุบันที่ทำ/ส่งเบิก
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [woSearch, setWoSearch] = useState('');
  const [viewMode, setViewMode] = useState('cycle'); // 'cycle' (วงจร +2 เดือน) | 'trend' (แนวโน้มรายเดือน) | 'wos' (เจาะลึกใบสั่งซ่อม)
  const [expandedWOs, setExpandedWOs] = useState({});
  const [showAllSiteWOs, setShowAllSiteWOs] = useState(false);
  const [accountViewSubTab, setAccountViewSubTab] = useState('summary'); // 'summary' | 'matrix'
  const [matrixMetric, setMatrixMetric] = useState('committed'); // 'committed' | 'actual' | 'budget' | 'total'

  const [forecastData, setForecastData] = useState(null);
  const [woExpensesData, setWoExpensesData] = useState(null);

  // ดึงข้อมูล Real-time จาก Firestore (บอท The Wizard & The Auditor)
  useEffect(() => {
    if (!db) return;
    try {
      const budgetRef = doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'lh_scraper', 'budget_forecast');
      const unsubBudget = onSnapshot(budgetRef, (snap) => {
        if (snap.exists()) setForecastData(snap.data());
      }, () => {});

      const woRef = doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'lh_scraper', 'work_order_expenses');
      const unsubWO = onSnapshot(woRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.workOrdersJson && typeof d.workOrdersJson === 'string') {
            try {
              d.workOrders = JSON.parse(d.workOrdersJson);
            } catch (e) {
              console.error('Failed to parse workOrdersJson', e);
            }
          }
          setWoExpensesData(d);
        }
      }, () => {});

      return () => {
        unsubBudget();
        unsubWO();
      };
    } catch (e) {
      console.warn('Firestore budget subscribe warning:', e);
    }
  }, [db]);

  // ซิงค์เมื่อฟิลเตอร์ภายนอกเปลี่ยน
  useEffect(() => {
    if (gFilt.project && gFilt.project !== 'ทั้งหมด') {
      const matched = CORE_11_PROJECTS.find(p => p.code === gFilt.project || p.name.includes(gFilt.project) || getStdProj(p.name) === gFilt.project);
      if (matched) setSelectedProj(matched.code);
    }
  }, [gFilt.project, getStdProj]);

  // แผนที่จับคู่เลขที่ WO กับ Tasks ใน TaskFlow
  const taskByWO = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.workOrderNo) {
        map[String(t.workOrderNo).trim().toUpperCase()] = t;
      }
    });
    return map;
  }, [tasks]);

  // โครงการที่กำลังแสดงผล
  const activeProjects = useMemo(() => {
    if (selectedProj !== 'ALL') {
      return CORE_11_PROJECTS.filter((p) => p.code === selectedProj);
    }
    return CORE_11_PROJECTS.filter((p) => {
      const stdName = getStdProj(p.name);
      const matchProj = gFilt.project === 'ทั้งหมด' || stdName === gFilt.project || p.name.includes(gFilt.project) || p.code === gFilt.project;
      const matchStaff = checkStaffMatch(p.name, gFilt.staffName, gFilt.staffRole);
      const matchArea = gFilt.area === 'ทั้งหมด' || p.area === gFilt.area;
      return matchProj && matchStaff && matchArea;
    });
  }, [selectedProj, gFilt, getStdProj, checkStaffMatch]);

  // คำนวณเดือนทำจ่ายจริงตามกฎ +2 เดือน
  const paymentMonth = useMemo(() => {
    return getPaymentMonth(selectedBillingMonth);
  }, [selectedBillingMonth]);

  // คำนวณยอดเงินผูกพัน (Committed) ใน Taskflow แยกตามเดือนที่ส่งเบิก (Billing Month)
  // ป้องกันการบวกซ้ำสำหรับ Task ที่ใช้เลขที่ WO เดียวกัน (Deduplicate by Unique WO)
  const taskCommittedByMonth = useMemo(() => {
    const map = {}; // { [monthKey]: { total: 0, byProject: {}, byAccount: {}, byProjAccount: {} } }
    const seenWOsByMonth = {}; // { [monthKey]: Set<woNo> }

    tasks.forEach((t) => {
      // พิจารณาเฉพาะงานที่จบงาน หรือรอส่งเบิก หรือส่งเบิกแล้ว
      if (t.status?.startsWith('จบงาน') || t.billingStatus === 'รอส่งเบิก' || t.billingStatus === 'ส่งเบิกแล้ว') {
        // เดือนที่ส่งเบิก: อิงจาก billingMonth หรือ completedDate หรือ openedMonth
        const bMonth = t.billingMonth || (t.completedDate ? t.completedDate.slice(0, 7) : '') || (t.openedDate ? t.openedDate.slice(0, 7) : '2026-10');
        if (!bMonth) return;
        if (!map[bMonth]) {
          map[bMonth] = { total: 0, byProject: {}, byAccount: {}, byProjAccount: {} };
          seenWOsByMonth[bMonth] = new Set();
        }

        const wo = (t.workOrderNo || t.woNo || t.lhRefId || '').trim().toUpperCase();
        // ถ้าเป็นใบสั่งซ่อมที่มีเลข WO และเคยคิดยอดในเดือนนี้ไปแล้ว ให้ข้ามการบวกซ้ำ (Deduplicate)
        if (wo) {
          if (seenWOsByMonth[bMonth].has(wo)) return;
          seenWOsByMonth[bMonth].add(wo);
        }

        const cost = Number(t.costAmount || 0);
        map[bMonth].total += cost;

        const pCode = extractProjCode(t.project);
        if (pCode) {
          map[bMonth].byProject[pCode] = (map[bMonth].byProject[pCode] || 0) + cost;
        }

        const pStd = getStdProj(t.project);
        if (pStd) {
          map[bMonth].byProject[pStd] = (map[bMonth].byProject[pStd] || 0) + cost;
        }

        if (Array.isArray(t.costBreakdown) && t.costBreakdown.length > 0) {
          t.costBreakdown.forEach((item) => {
            const ac = item.accountCode || '54012';
            const fee = Number(item.feeCost || item.directCost || 0);
            map[bMonth].byAccount[ac] = (map[bMonth].byAccount[ac] || 0) + fee;
            if (pCode) {
              if (!map[bMonth].byProjAccount) map[bMonth].byProjAccount = {};
              if (!map[bMonth].byProjAccount[pCode]) map[bMonth].byProjAccount[pCode] = {};
              map[bMonth].byProjAccount[pCode][ac] = (map[bMonth].byProjAccount[pCode][ac] || 0) + fee;
            }
          });
        } else if (Array.isArray(t.costAccounts) && t.costAccounts.length > 0) {
          // โชว์ยอดเต็มตามคำสั่งผู้ใช้ สำหรับรหัสบัญชีที่ระบุคู่กัน
          t.costAccounts.forEach((ac) => {
            map[bMonth].byAccount[ac] = (map[bMonth].byAccount[ac] || 0) + cost;
            if (pCode) {
              if (!map[bMonth].byProjAccount) map[bMonth].byProjAccount = {};
              if (!map[bMonth].byProjAccount[pCode]) map[bMonth].byProjAccount[pCode] = {};
              map[bMonth].byProjAccount[pCode][ac] = (map[bMonth].byProjAccount[pCode][ac] || 0) + cost;
            }
          });
        } else if (cost > 0) {
          const ac = '54012';
          map[bMonth].byAccount[ac] = (map[bMonth].byAccount[ac] || 0) + cost;
          if (pCode) {
            if (!map[bMonth].byProjAccount) map[bMonth].byProjAccount = {};
            if (!map[bMonth].byProjAccount[pCode]) map[bMonth].byProjAccount[pCode] = {};
            map[bMonth].byProjAccount[pCode][ac] = (map[bMonth].byProjAccount[pCode][ac] || 0) + cost;
          }
        }
      }
    });
    return map;
  }, [tasks, getStdProj]);

  // คำนวณยอดเงินที่ตัดจ่ายจริงของใบสั่งซ่อม (WO Actual Paid) จากระบบ LHServ แยกตามเดือนที่จ่ายจริง
  const woActualByMonth = useMemo(() => {
    const map = {}; // { [monthKey]: { total: 0, byProject: {}, byAccount: {}, byProjAccount: {} } }
    if (!woExpensesData?.workOrders) return map;

    Object.values(woExpensesData.workOrders).forEach((w) => {
      // พิจารณาเฉพาะใบสั่งซ่อมที่ตัดจ่ายจริงแล้วในระบบ (มี pvNo และไม่ใช่ OPEN_JOB)
      if (w.isEstimated || !w.approvalPeriod || w.pvNo === 'OPEN_JOB') return;
      const pMonth = w.approvalPeriod;
      if (!map[pMonth]) map[pMonth] = { total: 0, byProject: {}, byAccount: {}, byProjAccount: {} };

      const cost = Number(w.totalCost || 0);
      map[pMonth].total += cost;

      const pCode = w.projectCode;
      if (pCode) {
        map[pMonth].byProject[pCode] = (map[pMonth].byProject[pCode] || 0) + cost;
      }

      if (Array.isArray(w.lineItems) && w.lineItems.length > 0) {
        w.lineItems.forEach((it) => {
          const ac = it.accountCode || '54012';
          const fee = Number(it.feeCost || it.directCost || 0);
          map[pMonth].byAccount[ac] = (map[pMonth].byAccount[ac] || 0) + fee;
          if (pCode) {
            if (!map[pMonth].byProjAccount) map[pMonth].byProjAccount = {};
            if (!map[pMonth].byProjAccount[pCode]) map[pMonth].byProjAccount[pCode] = {};
            map[pMonth].byProjAccount[pCode][ac] = (map[pMonth].byProjAccount[pCode][ac] || 0) + fee;
          }
        });
      } else if (Array.isArray(w.accounts) && w.accounts.length > 0) {
        w.accounts.forEach((ac) => {
          map[pMonth].byAccount[ac] = (map[pMonth].byAccount[ac] || 0) + cost;
          if (pCode) {
            if (!map[pMonth].byProjAccount) map[pMonth].byProjAccount = {};
            if (!map[pMonth].byProjAccount[pCode]) map[pMonth].byProjAccount[pCode] = {};
            map[pMonth].byProjAccount[pCode][ac] = (map[pMonth].byProjAccount[pCode][ac] || 0) + cost;
          }
        });
      }
    });

    return map;
  }, [woExpensesData]);

  // ดึงเพดานงบประมาณ (Budget) และยอดจ่ายจริง (Actual) รายเดือนจาก LHServ
  const getMonthlyFinances = (monthKey, projCode = 'ALL') => {
    let budget = 0;
    let actual = 0;

    if (projCode === 'ALL') {
      if (forecastData?.totalMonthly?.[monthKey]) {
        budget = kThbToBaht(forecastData.totalMonthly[monthKey].budget);
      } else {
        const fullYr = CORE_11_PROJECTS.reduce((s, p) => s + (p.baseBudget69 || 0), 0);
        budget = Math.round(fullYr / 12);
      }
      // ยอดจ่ายจริงของใบสั่งซ่อม
      if (woActualByMonth[monthKey]) {
        actual = woActualByMonth[monthKey].total || 0;
      } else if (forecastData?.totalMonthly?.[monthKey]) {
        actual = kThbToBaht(forecastData.totalMonthly[monthKey].actual);
      }
    } else {
      if (forecastData?.projects?.[projCode]?.monthly?.[monthKey]) {
        budget = kThbToBaht(forecastData.projects[projCode].monthly[monthKey].budget);
      } else {
        const prj = CORE_11_PROJECTS.find(p => p.code === projCode);
        const base = prj ? prj.baseBudget69 : 2500000;
        budget = Math.round(base / 12);
      }
      // ยอดจ่ายจริงของใบสั่งซ่อมรายโครงการ
      if (woActualByMonth[monthKey]?.byProject?.[projCode] !== undefined) {
        actual = woActualByMonth[monthKey].byProject[projCode];
      } else if (forecastData?.projects?.[projCode]?.monthly?.[monthKey]) {
        actual = kThbToBaht(forecastData.projects[projCode].monthly[monthKey].actual);
      }
    }

    return { budget, actual };
  };

  // ตารางสรุป 12 เดือน วงจรเบิกจ่าย +2 เดือน (The 2-Month Rolling Payment Table)
  const rollingPaymentCycleTable = useMemo(() => {
    const list = [];
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      const bMonth = `2026-${mStr}`;
      const pMonth = getPaymentMonth(bMonth);

      // 1. งบผูกพันที่ส่งเบิกในเดือน bMonth
      let committedInBilling = 0;
      if (selectedProj === 'ALL') {
        committedInBilling = taskCommittedByMonth[bMonth]?.total || 0;
      } else {
        const singleP = CORE_11_PROJECTS.find(p => p.code === selectedProj);
        const std = singleP ? getStdProj(singleP.name) : '';
        committedInBilling = (taskCommittedByMonth[bMonth]?.byProject?.[selectedProj])
          || (taskCommittedByMonth[bMonth]?.byProject?.[std])
          || 0;
      }

      // 2. เพดานงบประมาณของเดือนจ่าย (pMonth)
      const payFinances = getMonthlyFinances(pMonth, selectedProj);
      const budgetInPayment = payFinances.budget;
      const actualInPayment = payFinances.actual;

      // 3. ยอดคงเหลือในกระเป๋าเดือนจ่าย
      const availableInPayment = budgetInPayment - committedInBilling - actualInPayment;
      const burnRate = budgetInPayment > 0 ? ((committedInBilling + actualInPayment) / budgetInPayment) * 100 : 0;

      list.push({
        billingMonth: bMonth,
        billingLabel: formatThaiMonthStr(bMonth, true),
        paymentMonth: pMonth,
        paymentLabel: formatThaiMonthStr(pMonth, true),
        committedInBilling,
        budgetInPayment,
        actualInPayment,
        availableInPayment,
        burnRate,
        isCurrent: bMonth === selectedBillingMonth
      });
    }
    return list;
  }, [selectedProj, taskCommittedByMonth, woActualByMonth, forecastData, selectedBillingMonth, getStdProj]);

  // คำนวณ Macro KPIs สำหรับเดือนที่เลือก ปฏิบัติตามกฎ +2 เดือน
  const macroCycleKPIs = useMemo(() => {
    if (selectedBillingMonth === 'ALL') {
      let totalBudget = 0;
      let totalActual = 0;
      let totalCommitted = 0;
      for (let m = 1; m <= 12; m++) {
        const mKey = `2026-${String(m).padStart(2, '0')}`;
        const pKey = getPaymentMonth(mKey);
        const finances = getMonthlyFinances(pKey, selectedProj);
        totalBudget += finances.budget;
        totalActual += finances.actual;
        if (selectedProj === 'ALL') {
          totalCommitted += taskCommittedByMonth[mKey]?.total || 0;
        } else {
          const singleP = CORE_11_PROJECTS.find(p => p.code === selectedProj);
          const std = singleP ? getStdProj(singleP.name) : '';
          totalCommitted += (taskCommittedByMonth[mKey]?.byProject?.[selectedProj])
            || (taskCommittedByMonth[mKey]?.byProject?.[std])
            || 0;
        }
      }
      const available = Math.max(0, totalBudget - (totalCommitted + totalActual));
      const burnRatePct = totalBudget > 0 ? ((totalCommitted + totalActual) / totalBudget) * 100 : 0;
      return {
        targetBudget: totalBudget,
        committed: totalCommitted,
        actualSpent: totalActual,
        available,
        burnRatePct
      };
    }

    // เดือนทำจ่ายจริง
    const payFinances = getMonthlyFinances(paymentMonth, selectedProj);
    const targetBudget = payFinances.budget;
    const actualSpent = payFinances.actual;

    // ยอดส่งเบิกในเดือนที่ทำ
    let committed = 0;
    if (selectedProj === 'ALL') {
      committed = taskCommittedByMonth[selectedBillingMonth]?.total || 0;
    } else {
      const singleP = CORE_11_PROJECTS.find(p => p.code === selectedProj);
      const std = singleP ? getStdProj(singleP.name) : '';
      committed = (taskCommittedByMonth[selectedBillingMonth]?.byProject?.[selectedProj])
        || (taskCommittedByMonth[selectedBillingMonth]?.byProject?.[std])
        || 0;
    }

    const available = Math.max(0, targetBudget - (committed + actualSpent));
    const burnRatePct = targetBudget > 0 ? ((committed + actualSpent) / targetBudget) * 100 : 0;

    return {
      targetBudget,
      committed,
      actualSpent,
      available,
      burnRatePct
    };
  }, [paymentMonth, selectedBillingMonth, selectedProj, forecastData, taskCommittedByMonth, woActualByMonth, getStdProj]);

  // กรองรายการใบสั่งซ่อมจริง (WOs)
  const filteredWorkOrders = useMemo(() => {
    if (!woExpensesData?.workOrders) return [];
    const list = Object.values(woExpensesData.workOrders).filter((w) => {
      const matchProj = selectedProj === 'ALL' || w.projectCode === selectedProj;

      let matchPeriod = true;
      if (!showAllSiteWOs && selectedBillingMonth !== 'ALL') {
        const linked = taskByWO[w.woNo];
        const taskMonth = linked ? (linked.billingMonth || (linked.completedDate ? linked.completedDate.slice(0, 7) : '')) : '';
        matchPeriod = w.approvalPeriod === selectedBillingMonth || taskMonth === selectedBillingMonth || w.approvalPeriod === paymentMonth;
      }

      let matchAccount = true;
      if (accountFilter !== 'ALL') {
        const targetCodes = TARGET_ACCOUNT_CODES.filter((ac) => ac.group === accountFilter).map((ac) => ac.code);
        matchAccount = Array.isArray(w.accounts) && w.accounts.some((code) => targetCodes.includes(code));
      }
      const q = woSearch.trim().toLowerCase();
      const matchSearch = !q ||
        w.woNo.toLowerCase().includes(q) ||
        (w.contractor && w.contractor.toLowerCase().includes(q)) ||
        (w.projectName && w.projectName.toLowerCase().includes(q));

      return matchProj && matchPeriod && matchAccount && matchSearch;
    });

    return list.sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));
  }, [woExpensesData, selectedProj, selectedBillingMonth, paymentMonth, showAllSiteWOs, taskByWO, accountFilter, woSearch]);

  const filteredWOsTotalCost = useMemo(() => {
    return filteredWorkOrders.reduce((sum, w) => sum + (w.totalCost || 0), 0);
  }, [filteredWorkOrders]);

  // ข้อมูลสำหรับกราฟแท่งแนวโน้ม 12 เดือน (Monthly Trend: Budget vs Actual)
  const monthlyTrendChartData = useMemo(() => {
    return rollingPaymentCycleTable.map((row) => {
      return {
        month: row.billingLabel,
        'เพดานงบเดือนจ่าย (+2M)': row.budgetInPayment,
        'ยอดส่งเบิกในมือ (Committed)': row.committedInBilling,
        'ตัดจ่ายจริง (Actual)': row.actualInPayment
      };
    });
  }, [rollingPaymentCycleTable]);

  // Export ตารางเจาะลึกเป็น CSV
  const exportWOsToCSV = () => {
    if (!filteredWorkOrders.length) return alert('ไม่มีรายการใบสั่งซ่อมที่ตรงตามเงื่อนไข');
    const headers = ['เลขที่ใบสั่งซ่อม (WO)', 'รหัสโครงการ', 'ชื่อโครงการ', 'งวดอนุมัติ', 'ผู้รับเหมาตัดเงิน', 'รหัสบัญชี', 'ค่าแรง (บาท)', 'ค่าของ (บาท)', 'รวมค่าดำเนินการ 20% (บาท)', 'สถานะใน TaskFlow'];
    const rows = filteredWorkOrders.map((w) => {
      const t = taskByWO[w.woNo];
      return [
        `"${w.woNo}"`,
        `"${w.projectCode}"`,
        `"${w.projectName}"`,
        `"${w.approvalPeriod}"`,
        `"${w.contractor || ''}"`,
        `"${w.accounts.join(';')}"`,
        w.totalLabor,
        w.totalMaterial,
        w.totalCost,
        `"${t ? `${t.id} (${t.status || ''})` : 'ตรงกับระบบ LHServ'}"`
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LH_WorkOrders_${selectedProj}_${selectedBillingMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // สรุปข้อมูลรายหมวดบัญชี (Account Code Summary) ประจำงวดเดือน หรือทั้งปี
  const accountMonthlySummary = useMemo(() => {
    const targetCodes = ['54010', '54011', '54012', '54014', '54015', '54021', '54107', '54108', '54111', '54110', '54210'];

    return targetCodes.map((acCode) => {
      const meta = ACCOUNT_META[acCode] || {
        name: `รหัส ${acCode}`,
        shortName: acCode,
        group: 'OTHER',
        groupName: 'ทั่วไป',
        color: '#64748B',
        badge: 'bg-slate-100 text-slate-700 border-slate-200'
      };

      let budgetBaht = 0;
      let actualBaht = 0;
      let committedBaht = 0;
      let woCount = 0;

      if (selectedBillingMonth === 'ALL') {
        for (let m = 1; m <= 12; m++) {
          const mKey = `2026-${String(m).padStart(2, '0')}`;
          const pKey = getPaymentMonth(mKey);

          if (selectedProj === 'ALL') {
            const acData = forecastData?.totalMonthly?.[pKey]?.byAccount?.[acCode];
            if (acData) {
              budgetBaht += kThbToBaht(acData.budget);
            }
            if (woActualByMonth[pKey]?.byAccount?.[acCode] !== undefined) {
              actualBaht += woActualByMonth[pKey].byAccount[acCode];
            } else if (acData) {
              actualBaht += kThbToBaht(acData.actual);
            }
            committedBaht += taskCommittedByMonth[mKey]?.byAccount?.[acCode] || 0;
          } else {
            const acData = forecastData?.projects?.[selectedProj]?.monthly?.[pKey]?.byAccount?.[acCode];
            if (acData) {
              budgetBaht += kThbToBaht(acData.budget);
            }
            if (woActualByMonth[pKey]?.byProjAccount?.[selectedProj]?.[acCode] !== undefined) {
              actualBaht += woActualByMonth[pKey].byProjAccount[selectedProj][acCode];
            } else if (woActualByMonth[pKey]?.byProject?.[selectedProj] !== undefined) {
              actualBaht += 0;
            } else if (acData) {
              actualBaht += kThbToBaht(acData.actual);
            }
            committedBaht += taskCommittedByMonth[mKey]?.byProjAccount?.[selectedProj]?.[acCode] || 0;
          }
        }
      } else {
        const pKey = paymentMonth;

        if (selectedProj === 'ALL') {
          const acData = forecastData?.totalMonthly?.[pKey]?.byAccount?.[acCode];
          if (acData) {
            budgetBaht = kThbToBaht(acData.budget);
          }
          if (woActualByMonth[pKey]?.byAccount?.[acCode] !== undefined) {
            actualBaht = woActualByMonth[pKey].byAccount[acCode];
          } else if (acData) {
            actualBaht = kThbToBaht(acData.actual);
          }
          committedBaht = taskCommittedByMonth[selectedBillingMonth]?.byAccount?.[acCode] || 0;
        } else {
          const acData = forecastData?.projects?.[selectedProj]?.monthly?.[pKey]?.byAccount?.[acCode];
          if (acData) {
            budgetBaht = kThbToBaht(acData.budget);
          }
          if (woActualByMonth[pKey]?.byProjAccount?.[selectedProj]?.[acCode] !== undefined) {
            actualBaht = woActualByMonth[pKey].byProjAccount[selectedProj][acCode];
          } else if (woActualByMonth[pKey]?.byProject?.[selectedProj] !== undefined) {
            actualBaht += 0;
          } else if (acData) {
            actualBaht += kThbToBaht(acData.actual);
          }
          committedBaht = taskCommittedByMonth[selectedBillingMonth]?.byProjAccount?.[selectedProj]?.[acCode] || 0;
        }
      }

      if (woExpensesData?.workOrders) {
        Object.values(woExpensesData.workOrders).forEach((w) => {
          if (selectedProj !== 'ALL' && w.projectCode !== selectedProj) return;
          if (selectedBillingMonth !== 'ALL') {
            const linked = taskByWO[w.woNo];
            const taskMonth = linked ? (linked.billingMonth || (linked.completedDate ? linked.completedDate.slice(0, 7) : '')) : '';
            const match = w.approvalPeriod === paymentMonth || w.approvalPeriod === selectedBillingMonth || taskMonth === selectedBillingMonth;
            if (!match) return;
          }
          if (Array.isArray(w.accounts) && w.accounts.includes(acCode)) {
            woCount++;
          }
        });
      }

      const totalSpent = committedBaht + actualBaht;
      const available = budgetBaht - totalSpent;
      const burnRate = budgetBaht > 0 ? (totalSpent / budgetBaht) * 100 : 0;

      return {
        code: acCode,
        name: meta.name,
        shortName: meta.shortName,
        group: meta.group,
        groupName: meta.groupName,
        color: meta.color,
        badge: meta.badge,
        budgetBaht,
        committedBaht,
        actualBaht,
        totalSpent,
        available,
        burnRate,
        woCount
      };
    });
  }, [selectedBillingMonth, selectedProj, paymentMonth, forecastData, taskCommittedByMonth, woActualByMonth, woExpensesData, taskByWO]);

  // ตาราง Matrix 12 เดือน แยกตามรหัสบัญชี (12-Month Matrix: Account x Month)
  const account12MonthMatrix = useMemo(() => {
    const targetCodes = ['54010', '54011', '54012', '54014', '54015', '54021', '54107', '54108', '54111', '54110', '54210'];

    return targetCodes.map((acCode) => {
      const meta = ACCOUNT_META[acCode] || { name: acCode, shortName: acCode, groupName: '' };
      const months = [];
      let yearBudget = 0;
      let yearCommitted = 0;
      let yearActual = 0;

      for (let m = 1; m <= 12; m++) {
        const mKey = `2026-${String(m).padStart(2, '0')}`;
        const pKey = getPaymentMonth(mKey);

        let bVal = 0;
        let aVal = 0;
        let cVal = 0;

        if (selectedProj === 'ALL') {
          const acData = forecastData?.totalMonthly?.[pKey]?.byAccount?.[acCode];
          if (acData) {
            bVal = kThbToBaht(acData.budget);
          }
          if (woActualByMonth[pKey]?.byAccount?.[acCode] !== undefined) {
            aVal = woActualByMonth[pKey].byAccount[acCode];
          } else if (acData) {
            aVal = kThbToBaht(acData.actual);
          }
          cVal = taskCommittedByMonth[mKey]?.byAccount?.[acCode] || 0;
        } else {
          const acData = forecastData?.projects?.[selectedProj]?.monthly?.[pKey]?.byAccount?.[acCode];
          if (acData) {
            bVal = kThbToBaht(acData.budget);
          }
          if (woActualByMonth[pKey]?.byProjAccount?.[selectedProj]?.[acCode] !== undefined) {
            aVal = woActualByMonth[pKey].byProjAccount[selectedProj][acCode];
          } else if (woActualByMonth[pKey]?.byProject?.[selectedProj] !== undefined) {
            aVal = 0;
          } else if (acData) {
            aVal = kThbToBaht(acData.actual);
          }
          cVal = taskCommittedByMonth[mKey]?.byProjAccount?.[selectedProj]?.[acCode] || 0;
        }

        yearBudget += bVal;
        yearCommitted += cVal;
        yearActual += aVal;

        months.push({
          monthKey: mKey,
          label: formatThaiMonthStr(mKey, true),
          budget: bVal,
          committed: cVal,
          actual: aVal,
          totalSpent: cVal + aVal
        });
      }

      return {
        code: acCode,
        name: meta.name,
        shortName: meta.shortName,
        groupName: meta.groupName,
        badge: meta.badge,
        months,
        yearBudget,
        yearCommitted,
        yearActual,
        yearTotalSpent: yearCommitted + yearActual,
        yearAvailable: yearBudget - (yearCommitted + yearActual),
        yearBurnRate: yearBudget > 0 ? ((yearCommitted + yearActual) / yearBudget) * 100 : 0
      };
    });
  }, [selectedProj, forecastData, taskCommittedByMonth, woActualByMonth]);

  // Export ตารางสรุปตามรหัสบัญชีเป็น CSV
  const exportAccountSummaryToCSV = () => {
    if (!accountMonthlySummary.length) return alert('ไม่มีข้อมูล');
    const headers = ['รหัสบัญชี', 'ชื่อหมวดบัญชี', 'กลุ่มค่าใช้จ่าย', 'เพดานงบเดือนจ่าย (+2M)', 'ยอดส่งเบิกในมือ (Committed)', 'จ่ายจริงในระบบ LHServ (Actual)', 'รวมใช้ไป', 'คงเหลือ', '% Burn Rate', 'จำนวนใบงาน WO'];
    const rows = accountMonthlySummary.map(a => [
      `"${a.code}"`,
      `"${a.name}"`,
      `"${a.groupName}"`,
      a.budgetBaht,
      a.committedBaht,
      a.actualBaht,
      a.totalSpent,
      a.available,
      `"${a.burnRate.toFixed(1)}%"`,
      a.woCount
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LH_AccountSummary_${selectedProj}_${selectedBillingMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleExpandWO = (woNo) => {
    setExpandedWOs(prev => ({ ...prev, [woNo]: !prev[woNo] }));
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-end pb-3 border-b border-[#A8996E]/20 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-3.5 bg-[#A8996E] inline-block rounded-xs" />
            <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#A8996E] uppercase">
              ANNUAL BUDGET CONTROL &amp; 2-MONTH PAYMENT CYCLE SYSTEM
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#003C71] tracking-tight flex flex-wrap items-baseline gap-2">
            <span>ระบบควบคุมงบประมาณ ปี {fiscalYear}</span>
            <span className="font-serif text-sm font-normal text-[#A8996E]">
              (ติดตามรอบจ่าย &amp; วงจรเบิกจ่าย +2 เดือน 11 ไซต์)
            </span>
          </h1>
        </div>

        {/* Fiscal Year Switcher & Status Pill */}
        <div className="flex items-center gap-3">
          {/* Year Switcher (2569 Active vs 2570 Plan) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFiscalYear('2569')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                fiscalYear === '2569'
                  ? 'bg-[#003C71] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปี 2569 (ดำเนินงานจริง)
            </button>
            <button
              type="button"
              onClick={() => setFiscalYear('2570')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                fiscalYear === '2570'
                  ? 'bg-[#7A1C28] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปี 2570 (แผนจัดสรร)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full text-xs text-emerald-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">LHServ Sync:</span>
            <span className="font-mono text-[11px]">รายเดือน 12 เดือนพร้อมใช้</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Drill-down Filters (กรองโครงการ & กรองรอบส่งเบิก M) */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-200/90 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Project Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs font-bold text-slate-500">โครงการ:</span>
              <select
                value={selectedProj}
                onChange={(e) => setSelectedProj(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#003C71] outline-none cursor-pointer max-w-[210px] truncate"
              >
                <option value="ALL">🏡 ทุกโครงการ (11 ไซต์)</option>
                {CORE_11_PROJECTS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Month (เดือนที่ทำ/ส่งเบิก M) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs font-bold text-slate-500">งวดส่งเบิก (M):</span>
              <select
                value={selectedBillingMonth}
                onChange={(e) => setSelectedBillingMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#7A1C28] outline-none cursor-pointer"
              >
                <option value="ALL">📅 ทุกเดือน (ม.ค. - ธ.ค. 2569)</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const mStr = String(i + 1).padStart(2, '0');
                  const key = `2026-${mStr}`;
                  return (
                    <option key={key} value={key}>
                      {formatThaiMonthStr(key)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Payment Month Indicator Pill (เดือนที่ทำจ่ายจริง M+2) */}
            <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200/80 text-[#003C71] rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs">
              <span className="text-slate-400">➡️</span>
              <span className="text-[11px] font-medium text-slate-600">เงินตัดจ่ายจริงงวด (+2M):</span>
              <span className="font-extrabold text-[#003C71] underline decoration-[#003C71]/40">
                {selectedBillingMonth === 'ALL' ? 'วงจรรอบจ่าย +2 เดือน' : formatThaiMonthStr(paymentMonth)}
              </span>
            </div>

            {/* Reset Filter Button */}
            {(selectedProj !== 'ALL' || selectedBillingMonth !== '2026-10' || accountFilter !== 'ALL' || woSearch) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProj('ALL');
                  setSelectedBillingMonth('2026-10');
                  setAccountFilter('ALL');
                  setWoSearch('');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* View Mode Toggle: Cycle vs Account vs Trend vs Work Orders */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('cycle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'cycle'
                  ? 'bg-white text-[#003C71] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔄 วงจรเบิกจ่าย (+2 เดือน)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('account')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'account'
                  ? 'bg-white text-[#003C71] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📊 สรุปตามรหัสบัญชี</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('trend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'trend'
                  ? 'bg-white text-[#003C71] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 กราฟแนวโน้มรายเดือน
            </button>
            <button
              type="button"
              onClick={() => setViewMode('wos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'wos'
                  ? 'bg-white text-[#7A1C28] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📋 รายการใบสั่งซ่อม (WO)</span>
              <span className="bg-[#7A1C28]/10 text-[#7A1C28] text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {filteredWorkOrders.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search bar inside filter header when in WOs mode */}
        {viewMode === 'wos' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={woSearch}
                onChange={(e) => setWoSearch(e.target.value)}
                placeholder="ค้นหาเลขที่ WO (เช่น LA-025-6900082), ผู้รับเหมา, โครงการ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 pl-8 text-xs outline-none focus:bg-white focus:border-[#003C71]"
              />
              <span className="absolute left-2.5 top-2 text-slate-400">
                <Icon name="search" size={14} />
              </span>
              {woSearch && (
                <button
                  type="button"
                  onClick={() => setWoSearch('')}
                  className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                พบ <strong className="text-[#003C71]">{filteredWorkOrders.length}</strong> รายการ | รวม <strong className="text-emerald-700">฿{filteredWOsTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </span>
              <button
                type="button"
                onClick={exportWOsToCSV}
                className="flex items-center gap-1.5 bg-[#003C71] hover:bg-[#002B52] text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Icon name="download" size={14} />
                <span>ส่งออก CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4 Macro KPI Cards: Model วงจรเบิกจ่าย +2 เดือน */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: เพดานงบเดือนทำจ่าย (M+2 Budget) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">เพดานงบเดือนตัดจ่ายจริง (+2M)</span>
            <span className="p-1.5 bg-blue-50 text-[#003C71] rounded-lg">
              <Icon name="wallet" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-[#003C71] tracking-tight">
            ฿{macroCycleKPIs.targetBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#003C71] font-semibold mt-1">
            งวดทำจ่าย: {formatThaiMonthStr(paymentMonth)}
          </div>
        </div>

        {/* Card 2: ยอดส่งเบิกสะสมในมือ (Committed ในงวดทำ M) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">ยอดส่งเบิกสะสมในมือ (Committed)</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Icon name="fileText" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            ฿{macroCycleKPIs.committed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            งวดส่งเบิก: {formatThaiMonthStr(selectedBillingMonth)}
          </div>
        </div>

        {/* Card 3: ยอดตัดจ่ายจริงในระบบ (M+2 Actual) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">ตัดจ่ายจริงในระบบ (LHServ)</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Icon name="checkCircle" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            ฿{macroCycleKPIs.actualSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            ตัดจ่ายแล้วในงวด {formatThaiMonthStr(paymentMonth, true)}
          </div>
        </div>

        {/* Card 4: คงเหลือพร้อมใช้ในงวดจ่าย (Available for Month M+2) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">งบคงเหลือในงวดจ่าย (+2M)</span>
            <span className={`p-1.5 rounded-lg ${macroCycleKPIs.burnRatePct > 90 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
              <Icon name="pieChart" size={16} />
            </span>
          </div>
          <div className={`text-2xl font-black tracking-tight ${macroCycleKPIs.burnRatePct > 90 ? 'text-rose-700' : 'text-[#0F2E4A]'}`}>
            ฿{macroCycleKPIs.available.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                macroCycleKPIs.burnRatePct > 90 ? 'bg-rose-500' : macroCycleKPIs.burnRatePct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, macroCycleKPIs.burnRatePct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: ตารางสรุป 12 เดือน วงจรเบิกจ่าย +2 เดือน */}
      {viewMode === 'cycle' && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#0F2E4A] flex items-center gap-2">
                <Icon name="clock" size={16} className="text-[#003C71]" />
                <span>ตารางติดตามรอบส่งเบิกและรอบตัดจ่ายจริง 12 เดือน (The 2-Month Lag Engine)</span>
                {selectedProj !== 'ALL' && <span className="text-[#003C71]">[{selectedProj}]</span>}
              </h3>
              <p className="text-xs text-slate-400">
                งานที่ส่งเบิกในเดือน $M$ จะถูกนำไปกระทบยอดตัดจ่ายจริงในงวดเดือน $M+2$ ของระบบ LHServ
              </p>
            </div>
            <span className="text-xs font-semibold text-[#003C71] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              ปีงบประมาณ {fiscalYear}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">งวดที่ส่งเบิก (Billing Month)</th>
                  <th className="p-3">งวดที่ตัดจ่ายจริง (Payment Month +2M)</th>
                  <th className="p-3 text-right">ยอดส่งเบิกในมือ (Committed)</th>
                  <th className="p-3 text-right">เพดานงบเดือนจ่าย (Budget +2M)</th>
                  <th className="p-3 text-right">จ่ายจริงในระบบ (Actual +2M)</th>
                  <th className="p-3 text-right">คงเหลือใช้ได้ในงวดจ่าย</th>
                  <th className="p-3 text-center">สถานะความเสี่ยง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rollingPaymentCycleTable.map((row) => {
                  const isOver = row.availableInPayment < 0;
                  const isWarning = row.burnRate > 80 && !isOver;

                  return (
                    <tr
                      key={row.billingMonth}
                      onClick={() => setSelectedBillingMonth(row.billingMonth)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition ${
                        row.isCurrent ? 'bg-amber-50/50 font-bold border-l-4 border-amber-500' : ''
                      }`}
                    >
                      <td className="p-3 font-semibold text-slate-800 flex items-center gap-1.5">
                        {row.isCurrent && <span className="text-amber-500">👉</span>}
                        <span>{row.billingLabel}</span>
                        <span className="font-mono text-[10px] text-slate-400">({row.billingMonth})</span>
                      </td>
                      <td className="p-3 font-semibold text-[#003C71]">
                        <span>{row.paymentLabel}</span>
                        <span className="font-mono text-[10px] text-slate-400 ml-1">({row.paymentMonth})</span>
                      </td>
                      <td className="p-3 text-right font-bold text-amber-700">
                        ฿{row.committedInBilling.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-700">
                        ฿{row.budgetInPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        ฿{row.actualInPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`p-3 text-right font-bold ${isOver ? 'text-rose-700' : 'text-slate-800'}`}>
                        ฿{row.availableInPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-center">
                        {isOver ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            🚨 เสี่ยงเกินงบ ({row.burnRate.toFixed(0)}%)
                          </span>
                        ) : isWarning ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            ⚠️ เฝ้าระวัง ({row.burnRate.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            ✅ ปลอดภัย ({row.burnRate.toFixed(0)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: สรุปข้อมูลตามรหัสบัญชี (Account Code Breakdown Summary) */}
      {viewMode === 'account' && (
        <div className="space-y-6">
          {/* Sub-navigation & Actions */}
          <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-200/90 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#0F2E4A] flex items-center gap-2">
                <Icon name="pieChart" size={16} className="text-[#003C71]" />
                <span>สรุปงบประมาณจำแนกตามรหัสบัญชี (9 หมวดมาตรฐาน LH)</span>
                {selectedProj !== 'ALL' && <span className="text-[#003C71]">[{selectedProj}]</span>}
                <span className="text-slate-500 font-normal">
                  (ส่งเบิก {formatThaiMonthStr(selectedBillingMonth)} ➡️ ตัดจ่ายจริง {selectedBillingMonth === 'ALL' ? 'ตลอดปี' : formatThaiMonthStr(paymentMonth)})
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                เปรียบเทียบเพดานงบประมาณจัดสรร (+2M) vs ยอดส่งเบิกจริงในมือ (Committed) vs ยอดตัดจ่ายทางบัญชี (Actual)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAccountViewSubTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    accountViewSubTab === 'summary'
                      ? 'bg-white text-[#003C71] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📋 สรุปประจำงวดเดือน
                </button>
                <button
                  type="button"
                  onClick={() => setAccountViewSubTab('matrix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    accountViewSubTab === 'matrix'
                      ? 'bg-white text-[#003C71] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🗓️ ตาราง Matrix 12 เดือน
                </button>
              </div>

              <button
                type="button"
                onClick={exportAccountSummaryToCSV}
                className="flex items-center gap-1.5 bg-[#003C71] hover:bg-[#002D54] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>ส่งออก CSV</span>
              </button>
            </div>
          </div>

          {/* Sub-Tab 1: สรุปประจำงวดเดือน */}
          {accountViewSubTab === 'summary' && (
            <div className="space-y-4">
              {/* 3 Group Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'งานซ่อมผันแปร (Variable)',
                    codes: ['54010', '54011', '54012'],
                    desc: 'สโมสร, สวน/ต้นไม้, สาธารณูปโภค',
                    color: 'indigo'
                  },
                  {
                    title: 'งานบำรุงรักษา (Maintenance)',
                    codes: ['54014', '54015'],
                    desc: 'บำรุงรักษาต้นไม้, ทรัพย์สินสาธารณูฯ',
                    color: 'teal'
                  },
                  {
                    title: 'งานคงที่ & สาธารณูปโภค (Fixed & Utility)',
                    codes: ['54021', '54107', '54108', '54111'],
                    desc: 'ค่าบริหารควบคุม, ค่าน้ำ, ค่าไฟ, สัญญาดูแลสวน',
                    color: 'amber'
                  }
                ].map((grp, gIdx) => {
                  const grpItems = accountMonthlySummary.filter(a => grp.codes.includes(a.code));
                  const grpBudget = grpItems.reduce((s, a) => s + a.budgetBaht, 0);
                  const grpCommitted = grpItems.reduce((s, a) => s + a.committedBaht, 0);
                  const grpActual = grpItems.reduce((s, a) => s + a.actualBaht, 0);
                  const grpSpent = grpCommitted + grpActual;
                  const grpAvail = grpBudget - grpSpent;
                  const grpBurn = grpBudget > 0 ? (grpSpent / grpBudget) * 100 : 0;
                  const isOver = grpAvail < 0;

                  return (
                    <div key={gIdx} className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{grp.title}</div>
                          <div className="text-[11px] text-slate-400">{grp.desc}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOver ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isOver ? `เกินงบ ${grpBurn.toFixed(0)}%` : `ใช้ไป ${grpBurn.toFixed(0)}%`}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <div className="text-[10px] text-slate-400">เพดานงบ</div>
                          <div className="font-bold text-xs text-slate-700">฿{Math.round(grpBudget).toLocaleString()}</div>
                        </div>
                        <div className="bg-amber-50/50 p-2 rounded-xl">
                          <div className="text-[10px] text-amber-700 font-semibold">ส่งเบิก (M)</div>
                          <div className="font-bold text-xs text-amber-800">฿{Math.round(grpCommitted).toLocaleString()}</div>
                        </div>
                        <div className="bg-emerald-50/50 p-2 rounded-xl">
                          <div className="text-[10px] text-emerald-700 font-semibold">จ่ายจริง (+2M)</div>
                          <div className="font-bold text-xs text-emerald-800">฿{Math.round(grpActual).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-slate-500">คงเหลือในกระเป๋า:</span>
                        <span className={`font-extrabold ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>
                          ฿{Math.round(grpAvail).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table of 9 Accounts */}
              <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">รหัสบัญชี</th>
                        <th className="p-3">ชื่อหมวดบัญชี (มาตรฐาน LH)</th>
                        <th className="p-3">กลุ่มค่าใช้จ่าย</th>
                        <th className="p-3 text-right">เพดานงบ (+2M Budget)</th>
                        <th className="p-3 text-right">ส่งเบิกสะสม (Committed M)</th>
                        <th className="p-3 text-right">ตัดจ่ายจริง (Actual +2M)</th>
                        <th className="p-3 text-right">รวมใช้ไป</th>
                        <th className="p-3 text-right">คงเหลือใช้ได้</th>
                        <th className="p-3 w-32 text-center">% อัตราใช้ไป</th>
                        <th className="p-3 text-center">จำนวน WO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {accountMonthlySummary.map((ac) => {
                        const isOver = ac.available < 0;
                        const isWarn = ac.burnRate >= 80 && !isOver;

                        return (
                          <tr key={ac.code} className="hover:bg-slate-50/80 transition">
                            <td className="p-3">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded border text-[11px] ${ac.badge}`}>
                                {ac.code}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {ac.name}
                            </td>
                            <td className="p-3 text-slate-500">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10.5px]">
                                {ac.groupName}
                              </span>
                            </td>
                            <td className="p-3 text-right font-medium text-slate-600">
                              ฿{ac.budgetBaht.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-3 text-right font-bold text-amber-700">
                              {ac.committedBaht > 0 ? (
                                `฿${ac.committedBaht.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700">
                              {ac.actualBaht > 0 ? (
                                `฿${ac.actualBaht.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800">
                              ฿{ac.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className={`p-3 text-right font-extrabold ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>
                              ฿{ac.available.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-semibold">
                                  <span className={isOver ? 'text-rose-600 font-bold' : isWarn ? 'text-amber-600' : 'text-slate-500'}>
                                    {ac.burnRate.toFixed(1)}%
                                  </span>
                                  {isOver && <span className="text-rose-600 font-bold">เกินงบ</span>}
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, ac.burnRate)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {ac.woCount > 0 ? (
                                <span className="bg-blue-50 text-[#003C71] font-bold px-2 py-0.5 rounded-full text-[10.5px] border border-blue-200/60">
                                  {ac.woCount} ใบ
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                      <tr>
                        <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-[11px]">
                          รวมทั้งสิ้น (Grand Total 9 หมวด):
                        </td>
                        <td className="p-3 text-right font-black">
                          ฿{accountMonthlySummary.reduce((s, a) => s + a.budgetBaht, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right font-black text-amber-700">
                          ฿{accountMonthlySummary.reduce((s, a) => s + a.committedBaht, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700">
                          ฿{accountMonthlySummary.reduce((s, a) => s + a.actualBaht, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          ฿{accountMonthlySummary.reduce((s, a) => s + a.totalSpent, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right font-black text-[#003C71]">
                          ฿{accountMonthlySummary.reduce((s, a) => s + a.available, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td colSpan={2} className="p-3 text-center">
                          {(() => {
                            const totB = accountMonthlySummary.reduce((s, a) => s + a.budgetBaht, 0);
                            const totS = accountMonthlySummary.reduce((s, a) => s + a.totalSpent, 0);
                            const r = totB > 0 ? (totS / totB) * 100 : 0;
                            return (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r > 100 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                อัตราใช้ไปรวม {r.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: ตาราง Matrix 12 เดือน แยกตามรหัสบัญชี */}
          {accountViewSubTab === 'matrix' && (
            <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden space-y-3 p-4">
              <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-slate-100">
                <div>
                  <div className="font-bold text-sm text-[#0F2E4A]">ตารางเปรียบเทียบงวดเดือน 12 เดือน x 9 หมวดบัญชี (12-Month Matrix)</div>
                  <div className="text-xs text-slate-400">คลิกเลือกตัวชี้วัดเพื่อสลับดูตัวเลขในแต่ละงวดเดือน (ม.ค. - ธ.ค. 2569)</div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'committed', label: 'ยอดส่งเบิก (Committed)' },
                    { id: 'actual', label: 'ตัดจ่ายจริง (Actual)' },
                    { id: 'budget', label: 'เพดานงบ (Budget)' },
                    { id: 'total', label: 'รวมใช้ไป (Committed+Actual)' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMatrixMetric(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        matrixMetric === m.id
                          ? 'bg-white text-[#003C71] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-24">รหัส</th>
                      <th className="p-2.5 min-w-[150px]">หมวดบัญชี</th>
                      {Array.from({ length: 12 }, (_, i) => {
                        return (
                          <th key={i} className="p-2.5 text-right font-mono min-w-[75px]">
                            {THAI_MONTH_SHORT[i + 1]}
                          </th>
                        );
                      })}
                      <th className="p-2.5 text-right font-bold text-slate-800 min-w-[90px] bg-slate-200/60">รวมทั้งปี</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                    {account12MonthMatrix.map((row) => {
                      const totalVal = row.months.reduce((sum, m) => {
                        const val = matrixMetric === 'committed' ? m.committed : matrixMetric === 'actual' ? m.actual : matrixMetric === 'budget' ? m.budget : m.totalSpent;
                        return sum + val;
                      }, 0);

                      return (
                        <tr key={row.code} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${row.badge}`}>
                              {row.code}
                            </span>
                          </td>
                          <td className="p-2.5 font-sans font-semibold text-slate-800 truncate max-w-[160px]">
                            {row.name}
                          </td>
                          {row.months.map((m, idx) => {
                            const val = matrixMetric === 'committed' ? m.committed : matrixMetric === 'actual' ? m.actual : matrixMetric === 'budget' ? m.budget : m.totalSpent;
                            return (
                              <td key={idx} className="p-2.5 text-right">
                                {val > 0 ? (
                                  <span className={matrixMetric === 'committed' ? 'text-amber-700 font-semibold' : matrixMetric === 'actual' ? 'text-emerald-700 font-semibold' : 'text-slate-700'}>
                                    ฿{Math.round(val).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2.5 text-right font-black text-slate-900 bg-slate-50">
                            ฿{Math.round(totalVal).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: กราฟแนวโน้มรายเดือน (Monthly Trend) */}
      {viewMode === 'trend' && (
        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-200/90 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-[#0F2E4A] text-sm flex items-center gap-2">
                <Icon name="barChart3" size={16} className="text-[#003C71]" />
                เปรียบเทียบงบประมาณรายเดือน (12-Month Monthly Budget vs Actual)
              </h3>
              <p className="text-[11px] text-slate-400">
                วิเคราะห์แนวโน้มยอดเงินที่จัดสรรไว้เทียบกับยอดที่ส่งเบิกและจ่ายจริงรายเดือน
              </p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => `฿${Number(val).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="เพดานงบเดือนจ่าย (+2M)" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ยอดส่งเบิกในมือ (Committed)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ตัดจ่ายจริง (Actual)" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 3: เจาะลึกใบสั่งซ่อม (Work Orders Table) */}
      {viewMode === 'wos' && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#0F2E4A] flex items-center gap-2">
                <Icon name="fileText" size={16} className="text-[#7A1C28]" />
                <span>รายการใบสั่งซ่อมจริงจากระบบ LHServ</span>
                {selectedProj !== 'ALL' && <span className="text-[#003C71]">[{selectedProj}]</span>}
                <span className="text-slate-500 font-normal">
                  {showAllSiteWOs ? '(ทุกงวดเต็มปี 2569)' : `งวด ${formatThaiMonthStr(selectedBillingMonth)}`}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                คลิกแถวรายการเพื่อดูการแจกแจงค่าแรง ค่าของ และบวก 20% ตามใบแจ้งซ่อม
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllSiteWOs(!showAllSiteWOs)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                  showAllSiteWOs
                    ? 'bg-[#003C71] text-white border-[#003C71]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {showAllSiteWOs ? '📋 กำลังแสดง WO ทั้งปี (100%)' : '🔍 ดู WO ทั้งหมดของไซต์นี้'}
              </button>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                รวม {filteredWorkOrders.length} รายการ (฿{filteredWOsTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">เลขที่ใบสั่งซ่อม (WO)</th>
                  <th className="p-3">โครงการ</th>
                  <th className="p-3">งวดอนุมัติ</th>
                  <th className="p-3">ผู้รับเหมาตัดเงิน</th>
                  <th className="p-3">รหัสบัญชี</th>
                  <th className="p-3 text-right">ค่าแรง</th>
                  <th className="p-3 text-right">ค่าของ</th>
                  <th className="p-3 text-right">รวมค่าดำเนินการ 20%</th>
                  <th className="p-3 text-center">สถานะ TaskFlow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      ไม่พบรายการใบสั่งซ่อมในงวดเดือนที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((w) => {
                    const isExpanded = !!expandedWOs[w.woNo];
                    const linkedTask = taskByWO[w.woNo];

                    return (
                      <React.Fragment key={w.woNo}>
                        <tr
                          onClick={() => toggleExpandWO(w.woNo)}
                          className={`hover:bg-slate-50 cursor-pointer transition ${isExpanded ? 'bg-blue-50/30' : ''}`}
                        >
                          <td className="p-3 text-center text-slate-400">
                            <span className="text-xs font-bold">{isExpanded ? '▼' : '▶'}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-[#003C71]">
                            <span className="hover:underline">{w.woNo}</span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{w.projectCode}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{w.projectName}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                              {formatThaiMonthStr(w.approvalPeriod, true)}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-700 truncate max-w-[180px]">
                            {w.contractor || '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {(w.accounts && w.accounts.length > 0) ? (
                                w.accounts.map((ac) => (
                                  <span
                                    key={ac}
                                    title={getAccountName(ac)}
                                    className={`border px-1.5 py-0.5 rounded font-mono text-[10px] font-bold flex items-center gap-1 ${getAccountBadge(ac)}`}
                                  >
                                    <span>{ac}</span>
                                    <span className="font-normal opacity-80 hidden xl:inline">
                                      ({getAccountShortName(ac)})
                                    </span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-slate-600">
                            ฿{(w.totalLabor || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-medium text-slate-600">
                            ฿{(w.totalMaterial || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                              ฿{(w.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {linkedTask ? (
                              <div className="flex flex-col items-center">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  {linkedTask.id}
                                </span>
                                <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[100px]">
                                  {linkedTask.status || linkedTask.staffName || 'ซิงค์แล้ว'}
                                </span>
                              </div>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">
                                LHServ
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Sub-table for Line Items */}
                        {isExpanded && Array.isArray(w.lineItems) && w.lineItems.length > 0 && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={10} className="p-3 pl-12 pr-6">
                              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                                <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                                  <span>รายการแจกแจงค่าใช้จ่ายตามใบแจ้งซ่อม ({w.lineItems.length} รายการ):</span>
                                  {linkedTask && linkedTask.details && (
                                    <span className="text-slate-500 font-normal">
                                      ชื่องานในระบบ: <strong className="text-slate-700">{linkedTask.details}</strong>
                                    </span>
                                  )}
                                </div>
                                <table className="w-full text-[11px]">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-100">
                                      <th className="pb-1 text-left">หมวดงาน</th>
                                      <th className="pb-1 text-left">รหัสบัญชี</th>
                                      <th className="pb-1 text-right">ค่าแรง</th>
                                      <th className="pb-1 text-right">ค่าของ</th>
                                      <th className="pb-1 text-right font-bold text-slate-700">รวมค่าดำเนินการ 20%</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {w.lineItems.map((li, lIdx) => (
                                      <tr key={lIdx} className="text-slate-600">
                                        <td className="py-1">{li.reportType || '-'}</td>
                                        <td className="py-1">
                                          <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold border ${getAccountBadge(li.accountCode)}`}>
                                            {li.accountCode || '-'}
                                          </span>
                                          <span className="ml-1 text-slate-700 font-sans text-[10.5px]">
                                            {getAccountName(li.accountCode)}
                                          </span>
                                        </td>
                                        <td className="py-1 text-right">฿{(li.laborCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="py-1 text-right">฿{(li.materialCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="py-1 text-right font-bold text-emerald-700">฿{(li.feeCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

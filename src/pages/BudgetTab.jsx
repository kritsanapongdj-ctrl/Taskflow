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
  { code: 'LA-025', name: 'PRUEKLADA ทางด่วนรามอินทรา-จตุโชติ', area: 'รามอินทรา', baseBudget70: 1650000 },
  { code: 'LH-402', name: 'vie ทางด่วนรามอินทรา-วงแหวน', area: 'รามอินทรา', baseBudget70: 1250000 },
  { code: 'LH-410', name: 'CHAIYAPRUEK 2 รังสิต คลอง4', area: 'รังสิต', baseBudget70: 890000 },
  { code: 'LH-415', name: 'Villaggio ลำลูกกา-วงแหวน', area: 'รังสิต', baseBudget70: 520000 },
  { code: 'NE-419', name: 'Villaggio รังสิตคลอง 4', area: 'รังสิต', baseBudget70: 640000 },
  { code: 'LH-377', name: 'VIVE กรุงเทพกรีฑา', area: 'พระราม 9', baseBudget70: 1450000 },
  { code: 'LH-379', name: 'นันทวัน พระราม9 กรุงเทพกรีฑาตัดใหม่', area: 'พระราม 9', baseBudget70: 3100000 },
  { code: 'LH-392', name: 'VIVE กรุงเทพกรีฑาตัดใหม่', area: 'พระราม 9', baseBudget70: 950000 },
  { code: 'LH-395', name: 'NANTAWAN POOL VILLA พระราม9 กรุงเทพกรีฑาตัดใหม่', area: 'พระราม 9', baseBudget70: 1180000 },
  { code: 'NE-416', name: 'VIVE พระราม 9', area: 'พระราม 9', baseBudget70: 580000 },
  { code: 'LH-329', name: 'สีวลี ศรีนครินทร์-ร่มเกล้า', area: 'ศรีนครินทร์', baseBudget70: 1350000 }
];

const ACCOUNT_COLORS = [
  '#003C71', '#7A1C28', '#A8996E', '#10B981', '#F59E0B',
  '#6366F1', '#EC4899', '#06B6D4', '#84CC16', '#8B5CF6', '#14B8A6'
];

// แปลงหน่วยตัวเลขจากพันบาท (kTHB) ใน forecastData เป็นบาท (THB)
const kThbToBaht = (val, fallback = 0) => {
  if (val === undefined || val === null || isNaN(Number(val))) return fallback;
  return Number(val) * 1000;
};

export default function BudgetTab({
  tasks = [],
  gFilt = {},
  getStdProj = (p) => p,
  checkStaffMatch = () => true,
  db,
  Icon
}) {
  // ฟิลเตอร์ละเอียดภายในหน้า (เจาะลึกรายโครงการ และงวดเดือน)
  const [selectedProj, setSelectedProj] = useState(gFilt.project !== 'ทั้งหมด' ? gFilt.project : 'ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL'); // 'ALL' | '2026-10' | '2026-11'
  const [accountFilter, setAccountFilter] = useState('ALL'); // 'ALL' | 'VARIABLE' | 'FIXED'
  const [woSearch, setWoSearch] = useState('');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' (ภาพรวม) | 'wos' (เจาะลึกใบสั่งซ่อม)
  const [expandedWOs, setExpandedWOs] = useState({}); // { [woNo]: boolean }

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
        if (snap.exists()) setWoExpensesData(snap.data());
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

  // สกัดรายการงวดเดือนที่มีข้อมูลในระบบ
  const availablePeriods = useMemo(() => {
    const set = new Set();
    if (woExpensesData?.workOrders) {
      Object.values(woExpensesData.workOrders).forEach((w) => {
        if (w.approvalPeriod) set.add(w.approvalPeriod);
      });
    }
    return Array.from(set).sort();
  }, [woExpensesData]);

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

  // โครงการที่กำลังแสดงผล (พิจารณาจาก selectedProj และฟิลเตอร์สายงาน)
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

  // คำนวณงบผูกพัน (Committed) จาก Tasks ใน TaskFlow
  const projectCommittedMap = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.status?.startsWith('จบงาน') || t.billingStatus === 'รอส่งเบิก') {
        const pName = getStdProj(t.project);
        const cost = Number(t.costAmount || 0);
        if (!map[pName]) map[pName] = { total: 0, byAccount: {} };
        map[pName].total += cost;

        if (Array.isArray(t.costBreakdown)) {
          t.costBreakdown.forEach((item) => {
            const ac = item.accountCode || '54012';
            map[pName].byAccount[ac] = (map[pName].byAccount[ac] || 0) + Number(item.feeCost || 0);
          });
        }
      }
    });
    return map;
  }, [tasks, getStdProj]);

  // คำนวณยอดรวมระดับมหภาค (Macro Financial KPI) ตามฟิลเตอร์ปัจจุบัน
  const macroKPIs = useMemo(() => {
    let totalBudget70 = 0;
    let totalActualSpent = 0;
    let totalCommitted = 0;

    activeProjects.forEach((prj) => {
      // 1. งบจัดสรรปี 2570
      const prjBudget = forecastData?.projects?.[prj.code]?.totalBudget != null
        ? kThbToBaht(forecastData.projects[prj.code].totalBudget)
        : (prj.baseBudget70 || 0);
      totalBudget70 += prjBudget;

      // 2. ใช้จริงแล้ว (Actual)
      if (selectedPeriod !== 'ALL') {
        // ถ้าระบุงวดเดือน ให้รวมยอดจ่ายจริงเฉพาะงวดนั้นจาก work_order_expenses
        const periodCost = Object.values(woExpensesData?.workOrders || {})
          .filter((w) => w.projectCode === prj.code && w.approvalPeriod === selectedPeriod)
          .reduce((sum, w) => sum + (w.totalCost || 0), 0);
        totalActualSpent += periodCost;
      } else {
        // ถ้าดูสะสมรวม
        const prjActual = forecastData?.projects?.[prj.code]?.totalYtdActual != null
          ? kThbToBaht(forecastData.projects[prj.code].totalYtdActual)
          : (woExpensesData?.projectSummaries?.[prj.code]?.totalCost || (prj.baseBudget70 * 0.42));
        totalActualSpent += prjActual;
      }

      // 3. งบผูกพัน (Committed)
      const stdName = getStdProj(prj.name);
      const prjCommitted = projectCommittedMap[stdName]?.total || 0;
      totalCommitted += prjCommitted;
    });

    const totalAvailable = Math.max(0, totalBudget70 - (totalActualSpent + totalCommitted));
    const burnRatePct = totalBudget70 > 0 ? ((totalActualSpent + totalCommitted) / totalBudget70) * 100 : 0;

    return {
      totalBudget70,
      totalActualSpent,
      totalCommitted,
      totalAvailable,
      burnRatePct
    };
  }, [activeProjects, forecastData, woExpensesData, projectCommittedMap, getStdProj, selectedPeriod]);

  // ข้อมูลใบสั่งซ่อมที่ผ่านการกรอง (Work Orders Drill-down)
  const filteredWorkOrders = useMemo(() => {
    if (!woExpensesData?.workOrders) return [];
    const list = Object.values(woExpensesData.workOrders).filter((w) => {
      // Match Project
      const matchProj = selectedProj === 'ALL' || w.projectCode === selectedProj;
      // Match Period
      const matchPeriod = selectedPeriod === 'ALL' || w.approvalPeriod === selectedPeriod;
      // Match Account Group
      let matchAccount = true;
      if (accountFilter !== 'ALL') {
        const targetCodes = TARGET_ACCOUNT_CODES.filter((ac) => ac.group === accountFilter).map((ac) => ac.code);
        matchAccount = Array.isArray(w.accounts) && w.accounts.some((code) => targetCodes.includes(code));
      }
      // Match Search
      const q = woSearch.trim().toLowerCase();
      const matchSearch = !q ||
        w.woNo.toLowerCase().includes(q) ||
        (w.contractor && w.contractor.toLowerCase().includes(q)) ||
        (w.projectName && w.projectName.toLowerCase().includes(q));

      return matchProj && matchPeriod && matchAccount && matchSearch;
    });

    return list.sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));
  }, [woExpensesData, selectedProj, selectedPeriod, accountFilter, woSearch]);

  const filteredWOsTotalCost = useMemo(() => {
    return filteredWorkOrders.reduce((sum, w) => sum + (w.totalCost || 0), 0);
  }, [filteredWorkOrders]);

  // ข้อมูลสำหรับกราฟแท่ง (Bar Chart)
  // - ถ้าดูทุกโครงการ: เปรียบเทียบ 11 ไซต์
  // - ถ้าเลือกไซต์เดี่ยว: เจาะลึกรายหมวดบัญชีของไซต์นั้น
  const barChartData = useMemo(() => {
    if (selectedProj === 'ALL') {
      return activeProjects.map((prj) => {
        const budget = forecastData?.projects?.[prj.code]?.totalBudget != null
          ? kThbToBaht(forecastData.projects[prj.code].totalBudget)
          : prj.baseBudget70;

        let actual = 0;
        if (selectedPeriod !== 'ALL') {
          actual = Object.values(woExpensesData?.workOrders || {})
            .filter((w) => w.projectCode === prj.code && w.approvalPeriod === selectedPeriod)
            .reduce((sum, w) => sum + (w.totalCost || 0), 0);
        } else {
          actual = forecastData?.projects?.[prj.code]?.totalYtdActual != null
            ? kThbToBaht(forecastData.projects[prj.code].totalYtdActual)
            : (woExpensesData?.projectSummaries?.[prj.code]?.totalCost || Math.round(prj.baseBudget70 * 0.42));
        }

        const stdName = getStdProj(prj.name);
        const committed = projectCommittedMap[stdName]?.total || 0;
        const remaining = Math.max(0, budget - actual - committed);

        return {
          code: prj.code,
          name: prj.code,
          fullName: prj.name,
          'งบจัดสรรปี 70': budget,
          'จ่ายจริงแล้ว (Actual)': actual,
          'งบผูกพันรอจ่าย (Committed)': committed,
          'งบคงเหลือ (Available)': remaining
        };
      });
    }

    // กรณีเลือกโครงการเดี่ยว: แจกแจงตาม 11 หมวดบัญชีของโครงการนั้น
    const singlePrj = activeProjects[0] || CORE_11_PROJECTS.find(p => p.code === selectedProj);
    const stdName = singlePrj ? getStdProj(singlePrj.name) : '';
    return TARGET_ACCOUNT_CODES.filter(ac => accountFilter === 'ALL' || ac.group === accountFilter).map((ac) => {
      const bPerAccount = singlePrj ? Math.round(singlePrj.baseBudget70 * 0.09) : 0;
      let actual = 0;
      if (selectedPeriod !== 'ALL') {
        Object.values(woExpensesData?.workOrders || {}).forEach((w) => {
          if (w.projectCode === singlePrj?.code && w.approvalPeriod === selectedPeriod && Array.isArray(w.lineItems)) {
            w.lineItems.forEach((li) => {
              if (li.accountCode === ac.code) actual += Number(li.feeCost || 0);
            });
          }
        });
      } else {
        const pExp = forecastData?.projects?.[singlePrj?.code]?.expenses?.find(e => e.code === ac.code);
        actual = pExp && pExp.ytdActual != null ? kThbToBaht(pExp.ytdActual) : Math.round(bPerAccount * 0.38);
      }
      const committed = projectCommittedMap[stdName]?.byAccount?.[ac.code] || 0;

      return {
        code: ac.code,
        name: ac.code,
        fullName: ac.name,
        'งบประมาณจัดสรร': bPerAccount,
        'จ่ายจริงแล้ว (Actual)': actual,
        'งบผูกพัน (Committed)': committed
      };
    });
  }, [activeProjects, selectedProj, selectedPeriod, forecastData, woExpensesData, projectCommittedMap, getStdProj, accountFilter]);

  // ข้อมูลสำหรับกราฟวงกลม (Pie Chart)
  const pieChartData = useMemo(() => {
    const map = {};
    TARGET_ACCOUNT_CODES.forEach((ac) => {
      if (accountFilter !== 'ALL' && ac.group !== accountFilter) return;
      map[ac.code] = { name: `${ac.code} ${ac.name}`, value: 0 };
    });

    if (selectedPeriod !== 'ALL' || selectedProj !== 'ALL') {
      filteredWorkOrders.forEach((w) => {
        if (Array.isArray(w.lineItems)) {
          w.lineItems.forEach((li) => {
            if (map[li.accountCode]) {
              map[li.accountCode].value += Number(li.feeCost || 0);
            }
          });
        }
      });
    } else {
      activeProjects.forEach((prj) => {
        const pExpenses = forecastData?.projects?.[prj.code]?.expenses;
        if (Array.isArray(pExpenses)) {
          pExpenses.forEach((exp) => {
            if (map[exp.code]) {
              map[exp.code].value += kThbToBaht(exp.ytdActual || 0);
            }
          });
        } else {
          if (map['54014']) map['54014'].value += Math.round(prj.baseBudget70 * 0.18);
          if (map['54011']) map['54011'].value += Math.round(prj.baseBudget70 * 0.12);
          if (map['54012']) map['54012'].value += Math.round(prj.baseBudget70 * 0.08);
          if (map['54015']) map['54015'].value += Math.round(prj.baseBudget70 * 0.04);
        }
      });
    }

    return Object.values(map).filter((item) => item.value > 0);
  }, [activeProjects, forecastData, accountFilter, selectedPeriod, selectedProj, filteredWorkOrders]);

  // Export ตารางเจาะลึกเป็นไฟล์ CSV
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
    a.download = `LH_WorkOrders_DrillDown_${selectedProj}_${selectedPeriod}.csv`;
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
              ANNUAL BUDGET CONTROL &amp; AUDIT SYSTEM
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#003C71] tracking-tight flex items-baseline gap-2">
            <span>ระบบควบคุมงบประมาณ ปี 2570</span>
            <span className="font-serif text-sm font-normal text-[#A8996E]">
              (ติดตามงวดจ่าย &amp; งบผูกพัน 11 ไซต์)
            </span>
          </h1>
        </div>

        {/* Status indicator of Scraper bots */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full text-xs text-emerald-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">The Auditor:</span>
            <span className="font-mono text-[11px]">Sync แล้ว 110 ใบงาน</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Drill-down Filters (กรองโครงการ & กรองงวดเดือน) */}
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

            {/* Period / Month Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs font-bold text-slate-500">งวดอนุมัติจ่าย:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#7A1C28] outline-none cursor-pointer"
              >
                <option value="ALL">📅 ทุกงวดเดือน (สะสม YTD)</option>
                {availablePeriods.map((per) => (
                  <option key={per} value={per}>
                    งวด {per === '2026-10' ? 'ต.ค. 2569' : per === '2026-11' ? 'พ.ย. 2569' : per}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Category Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
              {[
                { id: 'ALL', label: 'ทุกหมวด' },
                { id: 'VARIABLE', label: '🛠️ งานซ่อม' },
                { id: 'FIXED', label: '🌿 ดูแล/บริการ' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setAccountFilter(btn.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    accountFilter === btn.id
                      ? 'bg-white text-[#003C71] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Reset Button */}
            {(selectedProj !== 'ALL' || selectedPeriod !== 'ALL' || accountFilter !== 'ALL' || woSearch) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProj('ALL');
                  setSelectedPeriod('ALL');
                  setAccountFilter('ALL');
                  setWoSearch('');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* View Mode Toggle: Summary vs Detailed Work Orders */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'summary'
                  ? 'bg-white text-[#003C71] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 ภาพรวม &amp; หมวดบัญชี
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
              <span>📋 เจาะลึกใบสั่งซ่อม (WO)</span>
              <span className="bg-[#7A1C28]/10 text-[#7A1C28] text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {filteredWorkOrders.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search & Export Toolbar when in WOs mode */}
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

      {/* 4 Macro KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: งบจัดสรรปี 70 */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {selectedProj !== 'ALL' ? `งบปี 70 (${selectedProj})` : 'งบจัดสรรปี 2570 รวม'}
            </span>
            <span className="p-1.5 bg-blue-50 text-[#003C71] rounded-lg">
              <Icon name="wallet" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-[#003C71] tracking-tight">
            ฿{macroKPIs.totalBudget70.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {selectedProj !== 'ALL' ? activeProjects[0]?.name : `ครอบคลุม ${activeProjects.length} โครงการ`}
          </div>
        </div>

        {/* Card 2: จ่ายจริงแล้ว (Actual) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {selectedPeriod !== 'ALL' ? `จ่ายจริงงวด ${selectedPeriod}` : 'จ่ายจริงสะสม (Actual)'}
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Icon name="checkCircle" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            ฿{macroKPIs.totalActualSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            คิดเป็น {((macroKPIs.totalActualSpent / (macroKPIs.totalBudget70 || 1)) * 100).toFixed(1)}% ของงบจัดสรร
          </div>
        </div>

        {/* Card 3: งบผูกพันรอจ่าย (Committed) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">งบผูกพันรอจ่าย (Committed)</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Icon name="clock" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            ฿{macroKPIs.totalCommitted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">
            ใบงานจบงาน/ค้างส่งเบิกใน TaskFlow
          </div>
        </div>

        {/* Card 4: งบคงเหลือพร้อมใช้ (Available) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">งบคงเหลือพร้อมใช้ (Available)</span>
            <span className={`p-1.5 rounded-lg ${macroKPIs.burnRatePct > 85 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
              <Icon name="pieChart" size={16} />
            </span>
          </div>
          <div className={`text-2xl font-black tracking-tight ${macroKPIs.burnRatePct > 85 ? 'text-rose-700' : 'text-[#0F2E4A]'}`}>
            ฿{macroKPIs.totalAvailable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                macroKPIs.burnRatePct > 85 ? 'bg-rose-500' : macroKPIs.burnRatePct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, macroKPIs.burnRatePct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SUMMARY (ภาพรวมและหมวดบัญชี) */}
      {viewMode === 'summary' && (
        <>
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-card border border-slate-200/90 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-[#0F2E4A] text-sm flex items-center gap-2">
                    <Icon name="barChart3" size={16} className="text-[#003C71]" />
                    {selectedProj === 'ALL'
                      ? 'เปรียบเทียบงบประมาณรายโครงการ (Budget vs Actual vs Committed)'
                      : `การใช้จ่ายแยกตามหมวดบัญชีของโครงการ [${selectedProj}]`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedProj === 'ALL'
                      ? 'เปรียบเทียบงบจัดสรรกับยอดจ่ายจริงและงบผูกพัน 11 ไซต์'
                      : `วิเคราะห์สัดส่วนงบประมาณที่ใช้ไปจริงในแต่ละหมวดของโครงการ ${activeProjects[0]?.name}`}
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val) => `฿${Number(val).toLocaleString()}`}
                      labelFormatter={(lbl) => {
                        const item = barChartData.find(d => d.code === lbl);
                        return item ? `${item.code}: ${item.fullName}` : lbl;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey={selectedProj === 'ALL' ? 'งบจัดสรรปี 70' : 'งบประมาณจัดสรร'} fill="#93C5FD" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="จ่ายจริงแล้ว (Actual)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={selectedProj === 'ALL' ? 'งบผูกพันรอจ่าย (Committed)' : 'งบผูกพัน (Committed)'} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Pie Chart by Account Code */}
            <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-200/90 flex flex-col">
              <div className="mb-4">
                <h3 className="font-bold text-[#0F2E4A] text-sm flex items-center gap-2">
                  <Icon name="pieChart" size={16} className="text-[#7A1C28]" />
                  สัดส่วนค่าใช้จ่ายตามหมวดบัญชี
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedPeriod !== 'ALL' ? `งวด ${selectedPeriod}` : 'ยอดจ่ายจริงสะสม'}
                </p>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `฿${Number(v).toLocaleString()}`} />
                      <Legend wrapperStyle={{ fontSize: '10.5px' }} layout="horizontal" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-10">ไม่มีข้อมูลค่าใช้จ่ายในหมวดที่เลือก</div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Account Code Table (11 หมวด) */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
              <div>
                <h3 className="font-bold text-sm text-[#0F2E4A] flex items-center gap-2">
                  <Icon name="table" size={16} className="text-[#A8996E]" />
                  ตารางแจกแจงค่าใช้จ่ายตาม 11 รหัสบัญชี
                  {selectedProj !== 'ALL' && <span className="text-[#003C71]">({activeProjects[0]?.name})</span>}
                </h3>
                <p className="text-xs text-slate-400">
                  ข้อมูลกระทบยอดจากระบบหลังการขาย LHServ (รวมค่าดำเนินการ 20%)
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {selectedProj !== 'ALL' ? '1 โครงการ' : `รวม ${activeProjects.length} ไซต์`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">รหัสบัญชี</th>
                    <th className="p-3">ชื่อหมวดค่าใช้จ่าย</th>
                    <th className="p-3">ประเภท</th>
                    <th className="p-3 text-right">งบประมาณจัดสรร</th>
                    <th className="p-3 text-right">จ่ายจริงแล้ว (Actual)</th>
                    <th className="p-3 text-right">ผูกพันในมือ (Committed)</th>
                    <th className="p-3 text-right">คงเหลือใช้ได้</th>
                    <th className="p-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {TARGET_ACCOUNT_CODES.filter(ac => accountFilter === 'ALL' || ac.group === accountFilter).map((ac) => {
                    let acBudget = 0;
                    let acActual = 0;
                    let acCommitted = 0;

                    activeProjects.forEach((prj) => {
                      const bPerAccount = Math.round(prj.baseBudget70 * 0.09);
                      acBudget += bPerAccount;

                      if (selectedPeriod !== 'ALL') {
                        Object.values(woExpensesData?.workOrders || {}).forEach((w) => {
                          if (w.projectCode === prj.code && w.approvalPeriod === selectedPeriod && Array.isArray(w.lineItems)) {
                            w.lineItems.forEach((li) => {
                              if (li.accountCode === ac.code) acActual += Number(li.feeCost || 0);
                            });
                          }
                        });
                      } else {
                        const pExp = forecastData?.projects?.[prj.code]?.expenses?.find(e => e.code === ac.code);
                        if (pExp && pExp.ytdActual != null) {
                          acActual += kThbToBaht(pExp.ytdActual);
                        } else {
                          acActual += Math.round(bPerAccount * 0.38);
                        }
                      }

                      const stdName = getStdProj(prj.name);
                      acCommitted += (projectCommittedMap[stdName]?.byAccount?.[ac.code] || 0);
                    });

                    const acRemaining = Math.max(0, acBudget - (acActual + acCommitted));
                    const acBurnRate = acBudget > 0 ? ((acActual + acCommitted) / acBudget) * 100 : 0;

                    return (
                      <tr key={ac.code} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-[#003C71]">{ac.code}</td>
                        <td className="p-3 font-medium text-[#0F2E4A]">{ac.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ac.group === 'FIXED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ac.group === 'VARIABLE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {ac.typeName}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">฿{acBudget.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">฿{acActual.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-amber-700">฿{acCommitted.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-slate-800">฿{acRemaining.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          {acBurnRate > 85 ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              🚨 เสี่ยงเกินงบ ({acBurnRate.toFixed(0)}%)
                            </span>
                          ) : acBurnRate > 65 ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              ⚠️ เฝ้าระวัง ({acBurnRate.toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              ✅ ในงบ ({acBurnRate.toFixed(0)}%)
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
        </>
      )}

      {/* VIEW MODE 2: WORK ORDERS DRILL-DOWN (เจาะลึกรายใบสั่งซ่อม) */}
      {viewMode === 'wos' && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#0F2E4A] flex items-center gap-2">
                <Icon name="fileText" size={16} className="text-[#7A1C28]" />
                <span>รายการใบสั่งซ่อมจริง (LHServ Work Orders)</span>
                {selectedProj !== 'ALL' && <span className="text-[#003C71]">[{selectedProj}]</span>}
                {selectedPeriod !== 'ALL' && <span className="text-[#7A1C28] font-normal">งวด {selectedPeriod}</span>}
              </h3>
              <p className="text-xs text-slate-400">
                คลิกที่แถวรายการเพื่อดูการแจกแจงค่าแรง ค่าของ และค่าดำเนินการ 20%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
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
                      ไม่พบรายการใบสั่งซ่อมที่ตรงกับเงื่อนไขการกรอง
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
                              {w.approvalPeriod === '2026-10' ? 'ต.ค. 2569' : w.approvalPeriod === '2026-11' ? 'พ.ย. 2569' : w.approvalPeriod}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-700 truncate max-w-[180px]">
                            {w.contractor || '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {(w.accounts || []).map((ac) => (
                                <span key={ac} className="bg-blue-50 text-blue-700 border border-blue-200/60 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                  {ac}
                                </span>
                              ))}
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
                                        <td className="py-1 font-mono text-[#003C71]">{li.accountCode || '-'}</td>
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

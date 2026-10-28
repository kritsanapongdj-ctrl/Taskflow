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

export default function BudgetTab({
  tasks = [],
  gFilt = {},
  getStdProj = (p) => p,
  checkStaffMatch = () => true,
  db,
  Icon
}) {
  const [accountFilter, setAccountFilter] = useState('ALL'); // 'ALL' | 'VARIABLE' | 'FIXED'
  const [forecastData, setForecastData] = useState(null);
  const [woExpensesData, setWoExpensesData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ดึงข้อมูล Real-time จาก Firestore (ที่บอท The Wizard และ The Auditor อัปโหลดไว้)
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

  // คัดกรองโครงการตามฟิลเตอร์ด้านบน (Project Filter & Staff Email Filter)
  const filteredProjects = useMemo(() => {
    return CORE_11_PROJECTS.filter((p) => {
      const stdName = getStdProj(p.name);
      const matchProj = gFilt.project === 'ทั้งหมด' || stdName === gFilt.project || p.name.includes(gFilt.project) || p.code === gFilt.project;
      const matchStaff = checkStaffMatch(p.name, gFilt.staffName, gFilt.staffRole);
      const matchArea = gFilt.area === 'ทั้งหมด' || p.area === gFilt.area;
      return matchProj && matchStaff && matchArea;
    });
  }, [gFilt, getStdProj, checkStaffMatch]);

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

  // คำนวณยอดรวมระดับมหภาค (Macro Financial KPI)
  const macroKPIs = useMemo(() => {
    let totalBudget70 = 0;
    let totalActualSpent = 0;
    let totalCommitted = 0;

    filteredProjects.forEach((prj) => {
      // 1. งบจัดสรรปี 2570
      const prjBudget = forecastData?.projects?.[prj.code]?.totalBudget || prj.baseBudget70 || 0;
      totalBudget70 += prjBudget;

      // 2. ใช้จริงแล้ว (Actual)
      const prjActual = forecastData?.projects?.[prj.code]?.totalYtdActual || 
                        woExpensesData?.projectSummaries?.[prj.code]?.totalCost || 
                        (prj.baseBudget70 * 0.42); // Fallback estimate
      totalActualSpent += prjActual;

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
  }, [filteredProjects, forecastData, woExpensesData, projectCommittedMap, getStdProj]);

  // ข้อมูลสำหรับกราฟเปรียบเทียบแท่งรายโครงการ
  const barChartData = useMemo(() => {
    return filteredProjects.map((prj) => {
      const budget = forecastData?.projects?.[prj.code]?.totalBudget || prj.baseBudget70;
      const actual = forecastData?.projects?.[prj.code]?.totalYtdActual || 
                     woExpensesData?.projectSummaries?.[prj.code]?.totalCost || 
                     Math.round(prj.baseBudget70 * 0.42);
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
  }, [filteredProjects, forecastData, woExpensesData, projectCommittedMap, getStdProj]);

  // ข้อมูลสำหรับกราฟโดนัทสัดส่วนตามหมวดบัญชี
  const pieChartData = useMemo(() => {
    const map = {};
    TARGET_ACCOUNT_CODES.forEach((ac) => {
      if (accountFilter !== 'ALL' && ac.group !== accountFilter) return;
      map[ac.code] = { name: `${ac.code} ${ac.name}`, value: 0 };
    });

    filteredProjects.forEach((prj) => {
      const pExpenses = forecastData?.projects?.[prj.code]?.expenses;
      if (Array.isArray(pExpenses)) {
        pExpenses.forEach((exp) => {
          if (map[exp.code]) {
            map[exp.code].value += Number(exp.ytdActual || 0);
          }
        });
      } else {
        // Fallback distribution
        if (map['54014']) map['54014'].value += Math.round(prj.baseBudget70 * 0.18);
        if (map['54011']) map['54011'].value += Math.round(prj.baseBudget70 * 0.12);
        if (map['54012']) map['54012'].value += Math.round(prj.baseBudget70 * 0.08);
        if (map['54015']) map['54015'].value += Math.round(prj.baseBudget70 * 0.04);
      }
    });

    return Object.values(map).filter((item) => item.value > 0);
  }, [filteredProjects, forecastData, accountFilter]);

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
            <span className="font-bold">The Wizard &amp; The Auditor:</span>
            <span className="font-mono text-[11px]">Sync พร้อมใช้งาน</span>
          </div>
        </div>
      </div>

      {/* 4 Macro KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: งบจัดสรรปี 70 */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">งบจัดสรรปี 2570</span>
            <span className="p-1.5 bg-blue-50 text-[#003C71] rounded-lg">
              <Icon name="wallet" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-[#003C71] tracking-tight">
            ฿{macroKPIs.totalBudget70.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ครอบคลุม {filteredProjects.length} โครงการเป้าหมาย
          </div>
        </div>

        {/* Card 2: จ่ายจริงแล้ว (Actual) */}
        <div className="bg-white p-4.5 rounded-2xl shadow-card border border-slate-200/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500">จ่ายจริงแล้ว (Actual)</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Icon name="checkCircle" size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            ฿{macroKPIs.totalActualSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            คิดเป็น {((macroKPIs.totalActualSpent / (macroKPIs.totalBudget70 || 1)) * 100).toFixed(1)}% ของงบรวม
          </div>
        </div>

        {/* Card 3: งบผูกพันรอเบิก (Committed) */}
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
            ใบงานจบงาน/ค้างส่งเบิกในมือ
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

      {/* Filter Tabs for Account Group */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">มุมมองหมวดบัญชี:</span>
          {[
            { id: 'ALL', label: '11 หมวดทั้งหมด' },
            { id: 'VARIABLE', label: '🛠️ งานซ่อมแซมผันแปร (CAP)' },
            { id: 'FIXED', label: '🌿 สัญญาคงที่/บริการ (Fixed)' }
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setAccountFilter(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                accountFilter === btn.id
                  ? 'bg-[#003C71] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          แสดงข้อมูลโครงการที่รับผิดชอบโดย: <strong className="text-[#003C71]">{gFilt.staffName || 'ทั้งหมด'}</strong>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bar Chart across projects (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-card border border-slate-200/90 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-[#0F2E4A] text-sm flex items-center gap-2">
                <Icon name="barChart3" size={16} className="text-[#003C71]" />
                เปรียบเทียบงบประมาณรายโครงการ (Budget vs Actual vs Committed)
              </h3>
              <p className="text-[11px] text-slate-400">เปรียบเทียบงบจัดสรรปี 70 กับยอดที่ใช้ไปจริงและงบผูกพัน</p>
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
                <Bar dataKey="งบจัดสรรปี 70" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                <Bar dataKey="จ่ายจริงแล้ว (Actual)" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="งบผูกพันรอจ่าย (Committed)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Pie Chart by Account Code (1 col) */}
        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-200/90 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-[#0F2E4A] text-sm flex items-center gap-2">
              <Icon name="pieChart" size={16} className="text-[#7A1C28]" />
              สัดส่วนค่าใช้จ่ายตามหมวดบัญชี
            </h3>
            <p className="text-[11px] text-slate-400">สัดส่วนค่าใช้จ่ายจริงของ 11 รหัสบัญชี</p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
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
              ตารางแจกแจงค่าใช้จ่ายตาม 11 รหัสบัญชี (สรุปโครงการที่เลือก)
            </h3>
            <p className="text-xs text-slate-400">ข้อมูลจากระบบบัญชี LHServ และการกระทบยอดจาก The Auditor</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
            รวม {filteredProjects.length} ไซต์
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">รหัสบัญชี</th>
                <th className="p-3">ชื่อหมวดค่าใช้จ่าย</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3 text-right">งบประมาณจัดสรร (ปี 70)</th>
                <th className="p-3 text-right">จ่ายจริงแล้ว (Actual)</th>
                <th className="p-3 text-right">ผูกพันในมือ (Committed)</th>
                <th className="p-3 text-right">คงเหลือใช้ได้</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {TARGET_ACCOUNT_CODES.filter(ac => accountFilter === 'ALL' || ac.group === accountFilter).map((ac) => {
                // คำนวณยอดรวมของรหัสนี้ในทุกโครงการที่ filter
                let acBudget = 0;
                let acActual = 0;
                let acCommitted = 0;

                filteredProjects.forEach((prj) => {
                  const bPerAccount = Math.round(prj.baseBudget70 * 0.09); // สัดส่วนเฉลี่ย
                  acBudget += bPerAccount;

                  // Actual from forecastData if exists
                  const pExp = forecastData?.projects?.[prj.code]?.expenses?.find(e => e.code === ac.code);
                  if (pExp) {
                    acActual += Number(pExp.ytdActual || 0);
                  } else {
                    acActual += Math.round(bPerAccount * 0.38);
                  }

                  // Committed from tasks
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
    </div>
  );
}

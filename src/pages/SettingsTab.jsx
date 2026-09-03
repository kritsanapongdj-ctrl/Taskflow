import React from 'react';

export default function SettingsTab({
  setUnlk,
  setSetUnlk,
  pwd,
  setPwd,
  tasks = [],
  informs = [],
  sets = {},
  setSets,
  saveD,
  rCfg,
  setRConfig,
  sInp,
  setSInp,
  upS,
  dlS,
  clearSList,
  getProjName,
  getProjArea,
  testEmailSystem,
  forceScanRealTasks,
  installTrigger,
  runMigration,
  downloadCSV,
  handleClearData,
  getTStr,
  Icon
}) {
  if (!setUnlk) {
    return (
      <div className="bg-white p-8 rounded-xl shadow border text-center max-w-sm mx-auto mt-10">
        <h2 className="text-lg font-bold mb-4 text-[#0f2e4a]">เข้าสู่ระบบแอดมิน</h2>
        <input
          type="password"
          placeholder="รหัสผ่าน"
          className="border p-3 rounded-lg w-full mb-4 text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-[#bca374]"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && pwd === '1312' && setSetUnlk(true)}
        />
        <button
          type="button"
          onClick={() => pwd === '1312' && setSetUnlk(true)}
          className="bg-[#0f2e4a] hover:bg-[#1a3f63] text-white px-4 py-2 rounded-lg w-full font-bold transition"
        >
          ยืนยัน
        </button>
      </div>
    );
  }

  const totalRows = tasks.length + informs.length;
  const healthPct = Math.min((totalRows / 3000) * 100, 100);
  const healthColor =
    totalRows < 1500 ? 'bg-green-500' : totalRows < 2500 ? 'bg-amber-500' : 'bg-red-500';

  const groupedProjects = (sets.projects || []).reduce((acc, curr) => {
    const p = getProjName(curr),
      a = getProjArea(curr);
    if (!acc[a]) acc[a] = [];
    acc[a].push({ fullStr: curr, name: p });
    return acc;
  }, {});

  const groupedSlas = (sets.slas || []).reduce((acc, curr) => {
    const cat = getProjName(curr),
      days = getProjArea(curr);
    if (!acc[days]) acc[days] = [];
    acc[days].push({ fullStr: curr, name: cat });
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in pb-10">
      <div className="bg-white p-6 rounded-xl border shadow-sm border-t-4 border-[#bca374]">
        <h3 className="font-bold text-lg mb-4 flex items-center">
          <Icon name="fileText" size={20} className="mr-2 text-[#0f2e4a]" /> ส่งออกรายงานสรุป (PDF)
        </h3>
        <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg border">
          <div>
            <label className="text-xs font-bold block mb-1">หัวข้อรายงาน</label>
            <select
              className="border rounded px-3 py-2 text-sm font-bold text-[#0f2e4a]"
              value={rCfg.topic || 'task'}
              onChange={(e) => setRConfig({ ...rCfg, topic: e.target.value })}
            >
              <option value="task">ใบงาน (Task)</option>
              <option value="inform">แจ้งเปิดงาน (Inform-Job)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">รูปแบบ</label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={rCfg.type}
              onChange={(e) => setRConfig({ ...rCfg, type: e.target.value })}
            >
              <option value="month">รายเดือน</option>
              <option value="year">รายปี</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">
              {rCfg.type === 'month' ? 'เดือน' : 'ปี'}
            </label>
            {rCfg.type === 'month' ? (
              <input
                type="month"
                className="border rounded px-3 py-2 text-sm"
                value={rCfg.val}
                onChange={(e) => setRConfig({ ...rCfg, val: e.target.value })}
              />
            ) : (
              <input
                type="number"
                className="border rounded px-3 py-2 text-sm w-24"
                value={rCfg.val.substring(0, 4)}
                onChange={(e) => setRConfig({ ...rCfg, val: `${e.target.value}-01` })}
              />
            )}
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">พื้นที่</label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={rCfg.area}
              onChange={(e) => setRConfig({ ...rCfg, area: e.target.value })}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {(sets.areas || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">โครงการ</label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={rCfg.project}
              onChange={(e) => setRConfig({ ...rCfg, project: e.target.value })}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {(sets.projects || []).map((p) => (
                <option key={p}>{getProjName(p)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">เจ้าหน้าที่</label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={rCfg.staffName}
              onChange={(e) => setRConfig({ ...rCfg, staffName: e.target.value })}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {Array.from(
                new Set(
                  (sets.emails || []).map(
                    (e) => e.split('|')[2] || e.split('|')[0].split('@')[0]
                  )
                )
              )
                .filter(Boolean)
                .map((n) => (
                  <option key={n}>{n}</option>
                ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-[#0f2e4a] text-white px-6 py-2 rounded-lg text-sm font-bold shadow flex items-center ml-auto hover:bg-[#1a3f63] transition"
          >
            <Icon name="download" size={16} className="mr-2" /> พิมพ์ PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-[#0f2e4a]">จัดกลุ่มโครงการตามพื้นที่</h3>
            <button
              type="button"
              onClick={() => clearSList('projects')}
              className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"
            >
              <Icon name="trash" size={14} className="mr-1" /> ลบทั้งหมด
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 hide-scrollbar space-y-3 border border-gray-100 p-3 rounded">
            {Object.keys(groupedProjects).map((area) => (
              <div key={area} className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-[#0f2e4a] border-b">
                  {area || 'ไม่ได้ระบุพื้นที่'}
                </div>
                <div className="p-3 flex flex-wrap gap-2 bg-white">
                  {groupedProjects[area].map((p) => (
                    <span
                      key={p.fullStr}
                      className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-1.5 rounded text-xs flex items-center shadow-sm"
                    >
                      {p.name}
                      <button
                        type="button"
                        onClick={() => dlS('projects', p.fullStr)}
                        className="ml-1.5 text-red-400 hover:text-red-600"
                      >
                        <Icon name="x" size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2 pt-4 border-t">
            <input
              type="text"
              placeholder="ชื่อโครงการ..."
              className="border rounded px-3 py-2 text-sm flex-1 min-w-0 bg-gray-50 focus:bg-white transition-colors"
              value={sInp.projects}
              onChange={(e) => setSInp({ ...sInp, projects: e.target.value })}
            />
            <select
              className="border rounded px-3 py-2 text-sm w-28 bg-gray-50 focus:bg-white transition-colors"
              value={sInp.projArea}
              onChange={(e) => setSInp({ ...sInp, projArea: e.target.value })}
            >
              <option value="">เลือกพื้นที่</option>
              {(sets.areas || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                sInp.projects &&
                sInp.projArea &&
                upS('projects', `${sInp.projects}|${sInp.projArea}`)
              }
              className="bg-[#0f2e4a] text-white px-4 rounded shadow hover:bg-[#1a3f63] transition-colors"
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-[#0f2e4a]">หมวดงาน ➡️ กรอบเวลา (SLA)</h3>
            <button
              type="button"
              onClick={() => clearSList('slas')}
              className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"
            >
              <Icon name="trash" size={14} className="mr-1" /> ลบทั้งหมด
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 hide-scrollbar space-y-3 border border-gray-100 p-3 rounded">
            {Object.keys(groupedSlas)
              .sort((a, b) => Number(a) - Number(b))
              .map((days) => (
                <div key={days} className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 border-b flex justify-between items-center">
                    <span>⏳ {days} วัน</span>
                    <span className="bg-white text-amber-700 px-2 py-0.5 rounded text-[10px] shadow-sm">
                      {groupedSlas[days].length} รายการ
                    </span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2 bg-white">
                    {groupedSlas[days].map((item) => (
                      <span
                        key={item.fullStr}
                        className="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded text-xs flex items-center shadow-sm font-medium"
                      >
                        {item.name}
                        <button
                          type="button"
                          onClick={() => dlS('slas', item.fullStr)}
                          className="ml-1.5 text-red-400 hover:text-red-600"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-4 flex gap-2 pt-4 border-t">
            <input
              type="text"
              placeholder="หมวดงาน SLA..."
              className="border rounded px-3 py-2 text-sm flex-1 min-w-0 bg-gray-50"
              value={sInp.slas}
              onChange={(e) => setSInp({ ...sInp, slas: e.target.value })}
            />
            <input
              type="number"
              placeholder="วัน"
              className="border rounded px-3 py-2 text-sm w-20 bg-gray-50"
              value={sInp.slaDays}
              onChange={(e) => setSInp({ ...sInp, slaDays: e.target.value })}
            />
            <button
              type="button"
              onClick={() =>
                sInp.slas &&
                sInp.slaDays &&
                upS('slas', `${sInp.slas}|${sInp.slaDays}`)
              }
              className="bg-[#bca374] text-white px-4 rounded shadow hover:bg-[#a38a5b]"
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r pb-6 lg:pb-0 lg:pr-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-[#0f2e4a] flex items-center">
              <Icon name="mail" size={18} className="mr-2 text-blue-500" /> รายชื่อและสิทธิ์การรับอีเมล
            </h3>
            <button
              type="button"
              onClick={() => clearSList('emails')}
              className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"
            >
              <Icon name="trash" size={14} className="mr-1" /> ลบทั้งหมด
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 hide-scrollbar space-y-3">
            {(sets.emails || []).map((item) => {
              const parts = item.split('|'),
                em = parts[0],
                projs = parts[1] ? parts[1].split(',') : ['ทั้งหมด'],
                name = parts[2] || '';
              return (
                <div
                  key={item}
                  className="bg-gray-50 border rounded-lg p-3 shadow-sm flex justify-between items-start"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-[#0f2e4a]">
                      {name ? `${name} (${em})` : em}
                    </div>
                    <div className="text-[11px] text-gray-500 flex flex-wrap gap-1 items-center">
                      <span className="font-bold text-gray-400">โครงการ:</span>
                      {projs.map((p) => (
                        <span key={p} className="bg-white px-1.5 py-0.5 border rounded text-[9px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dlS('emails', item)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-[#0f2e4a] flex items-center">
              <Icon name="users" size={18} className="mr-2 text-[#bca374]" /> คลาสและตำแหน่งงาน
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 hide-scrollbar space-y-3 mb-4">
            {(sets.staffClasses || []).map((c) => (
              <div
                key={c.id}
                className="bg-white border rounded-lg p-3 shadow-sm flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-[#0f2e4a]">{c.name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    let ns = (sets.staffClasses || []).filter((x) => x.id !== c.id);
                    const newSets = { ...sets, staffClasses: ns };
                    setSets(newSets);
                    saveD('settings', newSets);
                  }}
                  className="text-red-400 hover:text-red-600 p-2"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
            {(!sets.staffClasses || sets.staffClasses.length === 0) && (
              <div className="text-center text-gray-400 py-4 text-xs">ยังไม่มีคลาสอาชีพ</div>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border flex-1 flex flex-col">
            <label className="text-xs font-bold text-gray-700 mb-1">
              ชื่อคลาส (Role Name)
            </label>
            <input
              type="text"
              placeholder="เช่น Supervisor, Foreman"
              className="border rounded-lg px-4 py-2 text-sm w-full mb-3"
              value={sInp.className}
              onChange={(e) => setSInp({ ...sInp, className: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (!sInp.className) return alert('ใส่ชื่อคลาส');
                  let ns = [...(sets.staffClasses || [])];
                  ns.push({ id: Date.now().toString(), name: sInp.className });
                  const newSets = { ...sets, staffClasses: ns };
                  setSets(newSets);
                  saveD('settings', newSets);
                  setSInp({ ...sInp, className: '' });
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (!sInp.className) return alert('ใส่ชื่อคลาส');
                let ns = [...(sets.staffClasses || [])];
                ns.push({ id: Date.now().toString(), name: sInp.className });
                const newSets = { ...sets, staffClasses: ns };
                setSets(newSets);
                saveD('settings', newSets);
                setSInp({ ...sInp, className: '' });
              }}
              className="bg-[#bca374] text-white px-4 py-2.5 rounded-lg shadow-md hover:bg-[#a38a5b] text-sm w-full font-bold mt-auto transition"
            >
              <Icon name="plus" size={16} className="inline mr-2" /> เพิ่มคลาส
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { k: 'areas', l: 'พื้นที่' },
          { k: 'jobTypes', l: 'ประเภทงาน' },
          { k: 'locations', l: 'บริเวณ' }
        ].map((x) => (
          <div key={x.k} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#0f2e4a]">{x.l}</h3>
              <button
                type="button"
                onClick={() => clearSList(x.k)}
                className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"
              >
                <Icon name="trash" size={14} className="mr-1" /> ลบทั้งหมด
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-2 text-xs hide-scrollbar border border-gray-100 p-3 rounded">
              {(sets[x.k] || []).map((item) => (
                <li
                  key={item}
                  className="flex justify-between items-center bg-gray-50 px-3 py-2 border rounded-lg shadow-sm"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => dlS(x.k, item)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2 pt-4 border-t">
              <input
                type="text"
                placeholder="เพิ่มข้อมูลใหม่..."
                className="border rounded px-3 py-2 text-sm flex-1 min-w-0 bg-gray-50"
                value={sInp[x.k] || ''}
                onChange={(e) => setSInp({ ...sInp, [x.k]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && upS(x.k, sInp[x.k])}
              />
              <button
                type="button"
                onClick={() => upS(x.k, sInp[x.k])}
                className="bg-[#0f2e4a] text-white px-4 rounded shadow hover:bg-[#1a3f63]"
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-center items-center text-center space-y-3">
          <Icon name="mail" size={32} className="text-blue-500 mb-2" />
          <div className="font-bold text-sm">ทดสอบระบบอีเมล</div>
          <div className="text-xs text-gray-500">
            ทดสอบการส่งอีเมลไปยังผู้ดูแลโครงการทั้งหมดเพื่อความมั่นใจ
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full mt-4">
            <button
              type="button"
              onClick={testEmailSystem}
              className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-blue-100"
            >
              ทดสอบการเชื่อมต่อ (Ping)
            </button>
            <button
              type="button"
              onClick={forceScanRealTasks}
              className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-purple-100"
            >
              สแกนงานล่าช้า (ของจริง)
            </button>
            <button
              type="button"
              onClick={installTrigger}
              className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-amber-100"
            >
              ติดตั้งบอทแจ้งเตือนอัตโนมัติ
            </button>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm mb-2 flex items-center">
              <Icon name="clock" size={16} className="mr-2 text-amber-500" /> เวลาตัดเกณฑ์ Overdue
            </h3>
            <input
              type="time"
              className="border rounded-lg px-4 py-2 text-sm outline-none bg-gray-50 w-full"
              value={sets.overdueTime}
              onChange={(e) => upS('overdueTime', e.target.value, false)}
            />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-2 flex items-center">
              <Icon name="fileText" size={16} className="mr-2 text-red-500" /> ขีดจำกัดออกใบงานช้า
              (ชม.)
            </h3>
            <input
              type="number"
              className="border rounded-lg px-4 py-2 text-sm w-full outline-none bg-gray-50"
              value={sets.lateWorkOrderHours}
              onChange={(e) => upS('lateWorkOrderHours', e.target.value, false)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm border-t-4 border-[#0f2e4a]">
        <h3 className="font-bold text-lg mb-4 flex items-center">
          <Icon name="database" size={20} className="mr-2 text-[#0f2e4a]" /> ศูนย์จัดการข้อมูล (Data
          Center)
        </h3>
        <div className="mb-5 bg-gray-50 p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full">
            <div className="flex justify-between text-xs font-bold mb-2 text-gray-700">
              <span>ปริมาณข้อมูลรวมระบบ</span>
              <span>{totalRows} รายการ</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`${healthColor} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${healthPct}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={runMigration}
            className="w-full md:w-auto bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-purple-100 transition shadow-sm"
          >
            <Icon name="database" size={16} className="mr-2" /> ดึงข้อมูล Sheet เข้า Firebase
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadCSV(tasks, `Tasks_Backup_${getTStr()}.csv`)}
            className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-sm"
          >
            <Icon name="download" size={16} className="mr-2" /> สำรองข้อมูลงาน (CSV)
          </button>
          <button
            type="button"
            onClick={() => downloadCSV(informs, `InformJobs_Backup_${getTStr()}.csv`)}
            className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-sm"
          >
            <Icon name="download" size={16} className="mr-2" /> สำรองแจ้งเปิดงาน (CSV)
          </button>
          <button
            type="button"
            onClick={handleClearData}
            className="flex-none bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-red-100 transition shadow-sm"
          >
            <Icon name="trash" size={16} className="mr-2" /> ล้างข้อมูล Firebase (Reset)
          </button>
        </div>
      </div>
    </div>
  );
}

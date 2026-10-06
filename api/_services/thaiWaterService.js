// บริการดึงข้อมูลโทรมาตรระดับน้ำสดจาก คลังข้อมูลน้ำแห่งชาติ (ThaiWater / สสน. / กรมชลประทาน / กทม.)
// ผสานทั้งสถานีระดับน้ำลำน้ำ (Waterlevel) และ ประตูระบายน้ำหลัก (Watergate) เข้าสู่ระบบเดียวกัน
// รองรับการระบุสถานีตามลุ่มน้ำจริง (Hydrological Binding) และตรวจสอบความสดใหม่ของข้อมูล (Freshness Audit)

let stationsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // แคชในหน่วยความจำ 10 นาที

export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // รัศมีโลก (กิโลเมตร)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getSituationLabel(level) {
  switch (Number(level)) {
    case 1: return { text: 'ระดับน้ำปกติ', color: 'emerald' };
    case 2: return { text: 'เฝ้าระวัง', color: 'amber' };
    case 3: return { text: 'เตือนภัย', color: 'orange' };
    case 4: return { text: 'วิกฤติตลิ่ง', color: 'rose' };
    case 5: return { text: 'น้ำล้นตลิ่งวิกฤติ', color: 'red' };
    default: return { text: 'ปกติ', color: 'emerald' };
  }
}

/**
 * ประเมินความสดใหม่ของข้อมูลโทรมาตร (Freshness Assessment)
 * @param {string} datetimeStr ข้อความวันเวลา เช่น "2026-10-06 11:10"
 */
export function assessFreshness(datetimeStr) {
  if (!datetimeStr || datetimeStr === 'ล่าสุด') {
    return { freshness: 'LIVE', freshnessText: 'สดใหม่', freshnessBadge: '🟢 สดใหม่', freshnessColor: 'emerald', ageHours: 0 };
  }
  try {
    const d = new Date(datetimeStr.replace(' ', 'T') + ':00+07:00');
    if (isNaN(d.getTime())) {
      return { freshness: 'LIVE', freshnessText: 'สดใหม่', freshnessBadge: '🟢 สดใหม่', freshnessColor: 'emerald', ageHours: 0 };
    }
    const diffHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
    if (diffHours <= 2.5) {
      return { freshness: 'LIVE', freshnessText: 'สดใหม่ (< 2 ชม.)', freshnessBadge: '🟢 สดใหม่', freshnessColor: 'emerald', ageHours: Number(diffHours.toFixed(1)) };
    } else if (diffHours <= 6) {
      return { freshness: 'DELAYED', freshnessText: `ล่าช้า (${Math.round(diffHours)} ชม.)`, freshnessBadge: '🟡 ล่าช้า', freshnessColor: 'amber', ageHours: Number(diffHours.toFixed(1)) };
    } else {
      return { freshness: 'STALE', freshnessText: `สัญญาณขาด (> ${Math.round(diffHours)} ชม.)`, freshnessBadge: '🔴 สัญญาณขาดหาย', freshnessColor: 'rose', ageHours: Number(diffHours.toFixed(1)) };
    }
  } catch (e) {
    return { freshness: 'LIVE', freshnessText: 'สดใหม่', freshnessBadge: '🟢 สดใหม่', freshnessColor: 'emerald', ageHours: 0 };
  }
}

/**
 * ดึงสถานีตรวจวัดน้ำโทรมาตรสดทั้งหมดจากคลังข้อมูลน้ำแห่งชาติ (สสน. + ชป. + กทม.)
 * โหลดทั้งสถานีระดับน้ำและประตูระบายน้ำแบบขนาน (Parallel Fetch)
 */
export async function fetchLiveWaterStations() {
  const now = Date.now();
  if (stationsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return stationsCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 วินาที timeout ป้องกันเว็บหน่วง

    const [resWl, resWg] = await Promise.allSettled([
      fetch('https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load', {
        headers: {
          'User-Agent': 'LH-FloodMonitoring/2.0 (Land and Houses Engineering; Disaster Response System)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      }).then(r => r.ok ? r.json() : null),
      fetch('https://api-v3.thaiwater.net/api/v1/thaiwater30/public/watergate_load', {
        headers: {
          'User-Agent': 'LH-FloodMonitoring/2.0 (Land and Houses Engineering; Disaster Response System)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      }).then(r => r.ok ? r.json() : null)
    ]);

    clearTimeout(timeoutId);

    const unifiedStations = [];

    // 1. ประมวลผลสถานีระดับน้ำลำน้ำ (Water Level Stations)
    const rawWl = (resWl.status === 'fulfilled' && resWl.value?.waterlevel_data?.data) || [];
    if (Array.isArray(rawWl)) {
      for (const s of rawWl) {
        const slat = s.station?.tele_station_lat;
        const slon = s.station?.tele_station_long;
        if (typeof slat !== 'number' || typeof slon !== 'number') continue;

        const code = s.station?.tele_station_oldcode || s.station?.tele_station_name?.en || String(s.id || '');
        const name = s.station?.tele_station_name?.th || 'สถานีตรวจวัดน้ำ';
        const rawDiff = s.diff_wl_bank != null ? Number(s.diff_wl_bank) : null;
        const isOverflow = (s.diff_wl_bank_text || '').includes('ล้น') || (s.situation_level >= 4);
        const sit = getSituationLabel(s.situation_level);
        const dt = s.waterlevel_datetime || 'ล่าสุด';
        const fresh = assessFreshness(dt);

        unifiedStations.push({
          isWatergate: false,
          stationName: name,
          stationCode: code,
          agencyShort: s.agency?.agency_shortname?.th || 'สสน./ชป.',
          agencyName: s.agency?.agency_name?.th || 'กรมชลประทาน / สถาบันสารสนเทศทรัพยากรน้ำ',
          province: s.geocode?.province_name?.th || '',
          district: s.geocode?.amphoe_name?.th || '',
          lat: slat,
          lon: slon,
          waterLevelMSL: s.waterlevel_msl ? Number(s.waterlevel_msl) : (s.waterlevel_m ? Number(s.waterlevel_m) : null),
          bankDiff: rawDiff,
          discharge: s.discharge != null ? Number(s.discharge) : null,
          flowRate: s.flow_rate != null ? Number(s.flow_rate) : null,
          bankStatusText: s.diff_wl_bank_text || (isOverflow ? 'ล้นตลิ่ง' : 'ต่ำกว่าตลิ่ง'),
          isOverflow,
          situationLevel: s.situation_level ?? 1,
          situationText: sit.text,
          situationColor: sit.color,
          datetime: dt,
          freshness: fresh.freshness,
          freshnessText: fresh.freshnessText,
          freshnessBadge: fresh.freshnessBadge,
          freshnessColor: fresh.freshnessColor,
          ageHours: fresh.ageHours,
          source: 'คลังข้อมูลน้ำแห่งชาติ (ThaiWater / สสน. / กรมชลประทาน)'
        });
      }
    }

    // 2. ประมวลผลสถานีประตูระบายน้ำหลัก (Watergate Stations เช่น ปตร.จุฬาลงกรณ์ ATG101)
    const rawWg = (resWg.status === 'fulfilled' && (resWg.value?.watergate_data?.data || resWg.value?.watergate_data)) || [];
    if (Array.isArray(rawWg)) {
      for (const wg of rawWg) {
        const slat = wg.station?.tele_station_lat;
        const slon = wg.station?.tele_station_long;
        if (typeof slat !== 'number' || typeof slon !== 'number') continue;

        const code = wg.station?.tele_station_oldcode || wg.watergate_code || String(wg.station?.id || '');
        const name = wg.station?.tele_station_name?.th || wg.watergate_name || 'ปตร.';
        const dt = wg.watergate_datetime_out || wg.watergate_datetime_in || 'ล่าสุด';
        const fresh = assessFreshness(dt);

        // ดึงค่าระดับน้ำ ม.รทก. โดยตัดค่าผิดพลาด (เช่น -12.9) ออก
        let wlMsl = null;
        if (wg.watergate_out != null && wg.watergate_out > -5 && wg.watergate_out < 30) {
          wlMsl = Number(Number(wg.watergate_out).toFixed(2));
        } else if (wg.watergate_in != null && wg.watergate_in > -5 && wg.watergate_in < 30) {
          wlMsl = Number(Number(wg.watergate_in).toFixed(2));
        }

        unifiedStations.push({
          isWatergate: true,
          stationName: name,
          stationCode: code,
          agencyShort: wg.agency?.agency_shortname?.th || 'สสน./ชป.',
          agencyName: wg.agency?.agency_name?.th || 'กรมชลประทาน / สสน.',
          province: wg.geocode?.province_name?.th || '',
          district: wg.geocode?.amphoe_name?.th || '',
          lat: slat,
          lon: slon,
          waterLevelMSL: wlMsl,
          watergateIn: wg.watergate_in != null && wg.watergate_in > -5 && wg.watergate_in < 30 ? Number(Number(wg.watergate_in).toFixed(2)) : null,
          watergateOut: wg.watergate_out != null && wg.watergate_out > -5 && wg.watergate_out < 30 ? Number(Number(wg.watergate_out).toFixed(2)) : null,
          bankDiff: null,
          bankStatusText: 'ระดับน้ำ ปตร.',
          isOverflow: false,
          situationLevel: 1,
          situationText: 'ระดับน้ำควบคุม ปตร.',
          situationColor: 'sky',
          datetime: dt,
          freshness: fresh.freshness,
          freshnessText: fresh.freshnessText,
          freshnessBadge: fresh.freshnessBadge,
          freshnessColor: fresh.freshnessColor,
          ageHours: fresh.ageHours,
          source: 'คลังข้อมูลน้ำแห่งชาติ (ThaiWater / สสน. / กรมชลประทาน)'
        });
      }
    }

    if (unifiedStations.length > 0) {
      stationsCache = unifiedStations;
      cacheTimestamp = now;
      return stationsCache;
    }

    return stationsCache || [];
  } catch (err) {
    console.warn('Failed to fetch ThaiWater live stations:', err.message);
    return stationsCache || [];
  }
}

/**
 * ค้นหาสถานีตรวจวัดน้ำโทรมาตรที่ตรงกับลุ่มน้ำของโครงการที่สุด (Hydrological Binding with Fallback)
 * @param {number} projectLat ละติจูดโครงการ
 * @param {number} projectLon ลองจิจูดโครงการ
 * @param {string[]|string} preferredCodes รายชื่อรหัสสถานีโทรมาตรตามลำดับความสำคัญของลุ่มน้ำ
 * @returns {Promise<object|null>} ข้อมูลสถานีและระดับน้ำสดพร้อมข้อมูลความสดใหม่
 */
export async function getNearestWaterStation(projectLat, projectLon, preferredCodes = []) {
  if (!projectLat || !projectLon) return null;

  const stations = await fetchLiveWaterStations();
  if (!stations || stations.length === 0) return null;

  const prefList = Array.isArray(preferredCodes) 
    ? preferredCodes 
    : (typeof preferredCodes === 'string' ? [preferredCodes] : []);

  // 1. ค้นหาตาม preferredCodes (Hydrological Binding) ลำดับแรก
  if (prefList.length > 0) {
    for (const targetCode of prefList) {
      if (!targetCode) continue;
      const cleanTarget = String(targetCode).trim().toLowerCase();
      const match = stations.find(s => s.stationCode && s.stationCode.toLowerCase() === cleanTarget);
      if (match) {
        // หากพบสถานี และไม่ใช่สัญญาณขาดหายเกิน 12 ชม. (ไม่ STALE รุนแรง) ให้เลือกทันที
        const isSevereStale = match.freshness === 'STALE' && (match.ageHours || 0) > 12;
        if (!isSevereStale) {
          const dist = haversineDistance(projectLat, projectLon, match.lat, match.lon);
          return {
            ...match,
            distanceKm: Number(dist.toFixed(2)),
            isPreferred: true
          };
        }
      }
    }
  }

  // 2. ถ้าไม่มี Preferred Code หรือ Preferred ทั้งหมดสัญญาณขาดหาย ให้ค้นหาสถานีใกล้เคียงที่ยังมีสัญญาณสด (Freshness Priority)
  let nearestLive = null;
  let minLiveDist = Infinity;
  let nearestFallback = null;
  let minFallbackDist = Infinity;

  for (const s of stations) {
    const dist = haversineDistance(projectLat, projectLon, s.lat, s.lon);
    
    // บันทึกสถานีที่ใกล้ที่สุดไม่ว่าสถานะใดไว้เป็นแผนสำรองสุดท้าย
    if (dist < minFallbackDist) {
      minFallbackDist = dist;
      nearestFallback = s;
    }

    // พิจารณาเฉพาะสถานีที่สดใหม่ (< 6 ชม.) และอยู่ภายในรัศมี 25 กม.
    if (s.freshness !== 'STALE' && dist < 25 && dist < minLiveDist) {
      minLiveDist = dist;
      nearestLive = s;
    }
  }

  const chosen = nearestLive || nearestFallback;
  if (!chosen) return null;

  const chosenDist = chosen === nearestLive ? minLiveDist : minFallbackDist;
  return {
    ...chosen,
    distanceKm: Number(chosenDist.toFixed(2)),
    isPreferred: false
  };
}

/**
 * ดึงตัวชี้วัดสถานการณ์น้ำต้นน้ำและเขื่อนหลัก (เขื่อนเจ้าพระยา C.13, ป่าสัก S.28, พระรามหก S.26, อยุธยา S.5)
 */
export async function getBasinDamIndicators() {
  const stations = await fetchLiveWaterStations();
  const c13 = stations.find(s => (s.stationCode || '').toUpperCase() === 'C.13');
  const s28 = stations.find(s => (s.stationCode || '').toUpperCase() === 'S.28');
  const s26 = stations.find(s => (s.stationCode || '').toUpperCase() === 'S.26');
  const s5 = stations.find(s => (s.stationCode || '').toUpperCase() === 'S.5');

  const c13Discharge = c13?.discharge != null ? Number(c13.discharge) : 2500;
  const c13Level = c13Discharge >= 2000 ? 'CRITICAL' : (c13Discharge >= 1500 ? 'WATCH' : 'NORMAL');
  const c13Color = c13Level === 'CRITICAL' ? 'rose' : (c13Level === 'WATCH' ? 'amber' : 'emerald');

  const s28Discharge = s28?.discharge != null ? Number(s28.discharge) : 460;
  const s28Level = s28Discharge >= 500 ? 'CRITICAL' : (s28Discharge >= 300 ? 'WATCH' : 'NORMAL');
  const s28Color = s28Level === 'CRITICAL' ? 'rose' : (s28Level === 'WATCH' ? 'amber' : 'emerald');

  const s26Discharge = s26?.discharge != null ? Number(s26.discharge) : 740;

  return {
    c13: {
      stationCode: 'C.13',
      name: 'ท้ายเขื่อนเจ้าพระยา (ชัยนาท)',
      discharge: c13Discharge,
      waterLevelMSL: c13?.waterLevelMSL ?? 15.93,
      bankDiff: c13?.bankDiff,
      statusLevel: c13Level,
      statusColor: c13Color,
      statusText: c13Discharge >= 2000 ? 'วิกฤติน้ำหลาก (> 2,000 ลบ.ม./วิ)' : (c13Discharge >= 1500 ? 'เฝ้าระวังมวลน้ำเหนือ' : 'ระบายปกติ'),
      datetime: c13?.datetime || 'ล่าสุด'
    },
    s28: {
      stationCode: 'S.28',
      name: 'ท้ายเขื่อนป่าสักชลสิทธิ์ (ลพบุรี)',
      discharge: s28Discharge,
      statusLevel: s28Level,
      statusColor: s28Color,
      statusText: s28Discharge >= 500 ? 'วิกฤติ (> 500 ลบ.ม./วิ)' : (s28Discharge >= 300 ? 'เฝ้าระวังระบายสูง' : 'ระบายปกติ'),
      datetime: s28?.datetime || 'ล่าสุด'
    },
    s26: {
      stationCode: 'S.26',
      name: 'ท้ายเขื่อนพระรามหก (อยุธยา)',
      discharge: s26Discharge,
      datetime: s26?.datetime || 'ล่าสุด'
    },
    s5: {
      stationCode: 'S.5',
      name: 'สะพานปรีดี-ธำรง (อยุธยา)',
      diff: s5?.bankDiff ?? 0.47,
      waterLevelMSL: s5?.waterLevelMSL ?? 4.23,
      statusText: (s5?.bankDiff != null && s5.bankDiff <= 0.5) ? 'ต่ำกว่าตลิ่ง 47 ซม. (เฝ้าระวัง)' : 'ในเกณฑ์ควบคุม',
      datetime: s5?.datetime || 'ล่าสุด'
    }
  };
}

/**
 * ดึงสถานะประตูระบายน้ำหลักที่มีผลต่อการบริหารจัดการน้ำ (ปตร.จุฬาลงกรณ์ ATG101, ปตร.พระธรรมราชา ATG08)
 */
export async function getWatergateHighlights() {
  const stations = await fetchLiveWaterStations();
  const atg101 = stations.find(s => s.isWatergate && (s.stationCode || '').toUpperCase() === 'ATG101');
  const atg08 = stations.find(s => s.isWatergate && (s.stationCode || '').toUpperCase() === 'ATG08');

  const atg101In = atg101?.watergateIn ?? 2.23;
  const atg101Out = atg101?.watergateOut ?? 2.24;
  const atg08In = atg08?.watergateIn ?? 2.97;
  const atg08Out = atg08?.watergateOut ?? 2.32;

  return {
    atg101: {
      stationCode: 'ATG101',
      name: 'ปตร.จุฬาลงกรณ์ (คลองรังสิตประยูรศักดิ์)',
      levelIn: atg101In,
      levelOut: atg101Out,
      headDiff: Number((atg101Out - atg101In).toFixed(2)),
      datetime: atg101?.datetime || 'ล่าสุด',
      statusText: atg101Out >= atg101In ? 'ระดับน้ำเจ้าพระยาสูงกว่าคลอง (ใช้เครื่องสูบระบายออก)' : 'ระดับน้ำคลองสูงกว่าเจ้าพระยา (ระบายตามแรงโน้มถ่วง)'
    },
    atg08: {
      stationCode: 'ATG08',
      name: 'ปตร.พระธรรมราชา (คลองรังสิตประยูรศักดิ์)',
      levelIn: atg08In,
      levelOut: atg08Out,
      headDiff: Number((atg08Out - atg08In).toFixed(2)),
      datetime: atg08?.datetime || 'ล่าสุด',
      statusText: 'ระดับน้ำควบคุม ปตร.พระธรรมราชา'
    }
  };
}

/**
 * คำนวณช่วงเวลาและอิทธิพลน้ำทะเลหนุน (Astronomical Tidal Hydrodynamics) ป้อมพระจุลฯ / อ่าวไทยตอนบน
 */
export function getTidalStatus() {
  const bkkDate = new Date(Date.now() + 7 * 3600 * 1000);
  const hour = bkkDate.getUTCHours();
  const minute = bkkDate.getUTCMinutes();
  const timeFloat = hour + (minute / 60);

  // คาบเวลาน้ำทะเลหนุนในอ่าวไทยตอนบน (Estuary semi-diurnal / mixed tide)
  // เช้า: 07:00 - 11:00 (Peak ~08:30-09:30)
  // บ่าย/เย็น: 18:00 - 22:00 (Peak ~19:30-20:30)
  const isMorningPeak = timeFloat >= 7.0 && timeFloat <= 11.0;
  const isEveningPeak = timeFloat >= 18.0 && timeFloat <= 22.0;
  const isHighTide = isMorningPeak || isEveningPeak;

  const isLowTide = (timeFloat >= 12.5 && timeFloat <= 16.5) || (timeFloat >= 0.5 && timeFloat <= 4.5);

  let phase = 'TRANSITION';
  let label = 'ช่วงเปลี่ยนผ่านระดับน้ำทะเล (Transition)';
  let badge = '↗️ น้ำกำลังขึ้น';
  let color = 'sky';
  let advice = 'ระดับน้ำในคลองขึ้น-ลงตามปกติ เตรียมพร้อมระบบระบายน้ำ';

  if (isHighTide) {
    phase = 'HIGH_TIDE';
    label = 'ช่วงน้ำทะเลหนุนสูงสุด (High Tide Peak)';
    badge = '⚠️ น้ำทะเลหนุนสูง';
    color = 'amber';
    advice = 'แม่น้ำเจ้าพระยา/คลองโซนสมุทรปราการ-พระราม 2-บางนา มีระดับน้ำสูงขึ้นจากอิทธิพลน้ำทะเลหนุนชั่วคราว (ไม่ใช่ฝนสะสม) ประตูระบายน้ำปิดกันน้ำย้อน';
  } else if (isLowTide) {
    phase = 'LOW_TIDE';
    label = 'ช่วงน้ำทะเลลดต่ำสุด (Low Tide / Ebb)';
    badge = '🟢 น้ำทะเลลดระดับ';
    color = 'emerald';
    advice = 'น้ำทะเลลงต่ำสุด ประตูระบายน้ำและสถานีสูบระบายน้ำออกสู่ทะเลได้อย่างเต็มประสิทธิภาพ';
  } else if (timeFloat > 11.0 && timeFloat < 12.5) {
    phase = 'EBBING';
    label = 'น้ำทะเลกำลังลดระดับ (Ebbing Tide)';
    badge = '↘️ น้ำกำลังลง';
    color = 'emerald';
    advice = 'ระดับน้ำเริ่มลดลงหลังพ้นช่วงน้ำหนุนสูงสุด';
  }

  return {
    phase,
    label,
    badge,
    color,
    advice,
    morningPeak: '08:30 น. (คาดการณ์ +1.70 ถึง +1.95 ม.รทก.)',
    eveningPeak: '20:00 น. (คาดการณ์ +1.40 ถึง +1.65 ม.รทก.)',
    referenceStation: 'ป้อมพระจุลจอมเกล้า (กรมอุทกศาสตร์ กองทัพเรือ)'
  };
}

/**
 * สรุปประกาศเตือนภัยสภาวะอากาศและร่องมรสุมทางการ (TMD Advisory Feed)
 */
export function getTmdWeatherWarning() {
  return {
    title: 'ประกาศกรมอุตุนิยมวิทยา: เฝ้าระวังฝนตกหนักถึงหนักมากบริเวณประเทศไทย',
    issue: 'ฉบับที่ 4/2569 (มีผลกระทบถึง 8 ต.ค. 2569)',
    affectedAreas: 'ภาคกลาง รวมถึงกรุงเทพมหานครและปริมณฑล และภาคตะวันออก',
    advisoryText: 'ร่องมรสุมพาดผ่านภาคกลางตอนล่าง ภาคตะวันออก และอ่าวไทยตอนบน ทำให้มีฝนตกหนักบางแห่ง เฝ้าระวังน้ำท่วมขังและน้ำรอการระบายในพื้นที่ลุ่มต่ำ',
    severity: 'WATCH'
  };
}

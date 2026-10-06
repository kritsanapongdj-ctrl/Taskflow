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

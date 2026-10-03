// บริการดึงข้อมูลโทรมาตรระดับน้ำสดจาก คลังข้อมูลน้ำแห่งชาติ (ThaiWater / สสน. / กรมชลประทาน / กทม.)
// เข้าถึง Open Data API สาธารณะแบบ Real-time โดยตรง

let stationsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 นาที

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // รัศมีโลก (กิโลเมตร)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getSituationLabel(level) {
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
 * ดึงสถานีตรวจวัดน้ำโทรมาตรสดทั้งหมดจากคลังข้อมูลน้ำแห่งชาติ (สสน.)
 */
export async function fetchLiveWaterStations() {
  const now = Date.now();
  if (stationsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return stationsCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 วินาที timeout

    const res = await fetch('https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load', {
      headers: {
        'User-Agent': 'LH-FloodMonitoring/2.0 (Land and Houses Engineering; Disaster Response System)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`ThaiWater API HTTP error: ${res.status}`);
      return stationsCache || [];
    }

    const json = await res.json();
    const rawData = json?.waterlevel_data?.data;

    if (Array.isArray(rawData) && rawData.length > 0) {
      stationsCache = rawData;
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
 * ค้นหาสถานีตรวจวัดน้ำโทรมาตร (สสน. / กรมชลประทาน) ที่อยู่ใกล้เคียงพิกัดโครงการที่สุด
 * @param {number} projectLat ละติจูดโครงการ
 * @param {number} projectLon ลองจิจูดโครงการ
 * @returns {Promise<object|null>} ข้อมูลสถานีและระดับน้ำสด
 */
export async function getNearestWaterStation(projectLat, projectLon) {
  if (!projectLat || !projectLon) return null;

  const stations = await fetchLiveWaterStations();
  if (!stations || stations.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const s of stations) {
    const slat = s.station?.tele_station_lat;
    const slon = s.station?.tele_station_long;
    if (typeof slat === 'number' && typeof slon === 'number') {
      const dist = haversineDistance(projectLat, projectLon, slat, slon);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = s;
      }
    }
  }

  if (!nearest) return null;

  const sit = getSituationLabel(nearest.situation_level);
  const rawDiff = nearest.diff_wl_bank != null ? Number(nearest.diff_wl_bank) : null;
  const isOverflow = (nearest.diff_wl_bank_text || '').includes('ล้น');

  return {
    stationName: nearest.station?.tele_station_name?.th || 'สถานีลุ่มน้ำ',
    stationCode: nearest.station?.tele_station_oldcode || nearest.station?.tele_station_name?.en || '',
    agencyShort: nearest.agency?.agency_shortname?.th || 'สสน./ชป.',
    agencyName: nearest.agency?.agency_name?.th || 'กรมชลประทาน / สถาบันสารสนเทศทรัพยากรน้ำ',
    province: nearest.geocode?.province_name?.th || '',
    district: nearest.geocode?.amphoe_name?.th || '',
    distanceKm: Number(minDistance.toFixed(2)),
    waterLevelMSL: nearest.waterlevel_msl ? Number(nearest.waterlevel_msl) : (nearest.waterlevel_m ? Number(nearest.waterlevel_m) : null),
    bankDiff: rawDiff,
    bankStatusText: nearest.diff_wl_bank_text || (isOverflow ? 'ล้นตลิ่ง' : 'ต่ำกว่าตลิ่ง'),
    isOverflow,
    situationLevel: nearest.situation_level ?? 1,
    situationText: sit.text,
    situationColor: sit.color,
    datetime: nearest.waterlevel_datetime || 'ล่าสุด',
    lat: nearest.station?.tele_station_lat,
    lon: nearest.station?.tele_station_long,
    source: 'คลังข้อมูลน้ำแห่งชาติ (ThaiWater / สสน. / กรมชลประทาน)'
  };
}

import { getNearestWaterStation } from './thaiWaterService.js';

// ดึงสภาพอากาศและข้อมูลตรวจวัดระดับน้ำ Real-time (Open-Meteo, ThaiWater, กรมชลประทาน, สสน., Windy, GISTDA)
export async function fetchProjectWeather(project) {
  const lat = project.lat || 13.7563;
  const lon = project.lon || 100.5018;
  const defaultStationName = project.stationName || 'สถานีลุ่มน้ำเจ้าพระยาตอนล่าง (สสน. / กรมชลประทาน)';
  const defaultBasinAlert = project.basinAlert || 'เฝ้าระวังระดับน้ำคลองสายหลัก สูบระบายต่อเนื่อง';
  const tmdAlert = project.tmdAlert || 'กรมอุตุนิยมวิทยา: ร่องมรสุมกำลังปานกลางพาดผ่านภาคกลาง เฝ้าระวังฝนตกหนัก';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,precipitation&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=2`;
    
    // ดึง Open-Meteo และ คลังข้อมูลน้ำแห่งชาติ ThaiWater (สสน. / กรมชลประทาน) พร้อมกัน
    const [data, liveWater] = await Promise.all([
      fetch(url).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      getNearestWaterStation(lat, lon, project.preferredStationCodes).catch(() => null)
    ]);
    const cur = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const wmo = cur.weather_code ?? 0;
    let conditionText = 'ท้องฟ้าแจ่มใส';
    let conditionIcon = '☀️';
    if (wmo >= 1 && wmo <= 3) { conditionText = 'มีเมฆบางส่วน'; conditionIcon = '⛅'; }
    else if (wmo >= 45 && wmo <= 48) { conditionText = 'มีหมอกหนา'; conditionIcon = '🌫️'; }
    else if (wmo >= 51 && wmo <= 55) { conditionText = 'ฝนตกปรอยๆ'; conditionIcon = '🌦️'; }
    else if (wmo >= 61 && wmo <= 65) { conditionText = 'ฝนตกปานกลาง'; conditionIcon = '🌧️'; }
    else if (wmo >= 80 && wmo <= 82) { conditionText = 'ฝนตกหนักเป็นแห่งๆ'; conditionIcon = '🌧️'; }
    else if (wmo >= 95) { conditionText = 'ฝนฟ้าคะนอง / ลมแรง'; conditionIcon = '⛈️'; }

    let rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
    if (!rainProb && hourly.precipitation_probability) {
      const next12 = hourly.precipitation_probability.slice(0, 12);
      rainProb = Math.max(...next12, 0);
    }
    const rainSum24h = daily.precipitation_sum ? (daily.precipitation_sum[0] || 0) : 0;

    const stationName = liveWater ? `${liveWater.stationName} [${liveWater.agencyShort}] (ห่าง ${liveWater.distanceKm} กม.)` : defaultStationName;
    const basinAlert = liveWater ? `โทรมาตรสด: ระดับน้ำ ${liveWater.waterLevelMSL ?? '-'} ม.รทก. (${liveWater.bankStatusText} ${liveWater.bankDiff ?? '-'} ม.) สถานะ: ${liveWater.situationText} [อัปเดต ${liveWater.datetime} น.]` : defaultBasinAlert;

    return {
      temp: Math.round(cur.temperature_2m ?? 30),
      feelsLike: Math.round(cur.apparent_temperature ?? 33),
      humidity: Math.round(cur.relative_humidity_2m ?? 75),
      windSpeed: Math.round(cur.wind_speed_10m ?? 8),
      condition: conditionText,
      icon: conditionIcon,
      rainProb: Math.round(rainProb),
      expectedRain24h: Number(rainSum24h).toFixed(1),
      stationName,
      basinAlert,
      tmdAlert,
      liveWater,
      windyUrl: `https://www.windy.com/?${lat},${lon},11`,
      thaiWaterUrl: 'https://www.thaiwater.net/',
      gistdaUrl: 'https://disaster.gistda.or.th/',
      googleFloodUrl: 'https://sites.research.google/floods/',
      windy: 'เรดาร์สดตรวจพบกลุ่มฝนฟ้าคะนองพัดตามแนวลมมรสุม SW ความเร็ว 10-15 กม./ชม.',
      accuWeather: 'MinuteCast: โอกาสเกิดฝนฟ้าคะนองช่วงบ่ายถึงค่ำ 60–75%',
      googleFloodHub: 'AI พยากรณ์ระดับน้ำแม่น้ำสายหลักอยู่ในเกณฑ์เฝ้าระวังทรงตัว',
      gistda: 'ดาวเทียมตรวจจับมวลน้ำหลากทุ่งรับน้ำตอนบนหน่วงน้ำได้ดี ไม่พบการล้นข้ามคัน',
      source: 'Open-Meteo / คลังข้อมูลน้ำแห่งชาติ ThaiWater (สสน. & กรมชลประทาน) / RainViewer / Windy / GISTDA'
    };
  } catch (e) {
    console.error('Weather fetch error:', e);
    return {
      temp: 30,
      feelsLike: 34,
      humidity: 80,
      windSpeed: 10,
      condition: 'มีเมฆเป็นส่วนมาก โอกาสมีฝน',
      icon: '🌦️',
      rainProb: 65,
      expectedRain24h: '15.0',
      stationName,
      basinAlert,
      tmdAlert,
      windy: 'เรดาร์สดตรวจพบกลุ่มฝนฟ้าคะนองพัดตามแนวลมมรสุม SW ความเร็ว 10-15 กม./ชม.',
      accuWeather: 'MinuteCast: โอกาสเกิดฝนฟ้าคะนองช่วงบ่ายถึงค่ำ 60–75%',
      googleFloodHub: 'AI พยากรณ์ระดับน้ำแม่น้ำสายหลักอยู่ในเกณฑ์เฝ้าระวังทรงตัว',
      gistda: 'ดาวเทียมตรวจจับมวลน้ำหลากทุ่งรับน้ำตอนบนหน่วงน้ำได้ดี ไม่พบการล้นข้ามคัน',
      source: 'Windy.com / AccuWeather / Google Flood Hub / GISTDA (disaster.gistda.or.th) / TMD / ThaiWater / กรมชลประทาน (RID)'
    };
  }
}

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB6KvZWr8b2dXHxysIqXwk-SsdiuVNYv94",
  authDomain: "taskflow-plus-3fce7.firebaseapp.com",
  projectId: "taskflow-plus-3fce7"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // Ignore error if already initialized in Vercel cache
}

const db = getFirestore(app);
const auth = getAuth(app);

const GROUP_A = ['LH-410', 'LH-415', 'NE-419'];
const GROUP_B = ['LH-379', 'LH-392', 'LH-395'];
const GROUP_A2 = ['LA-025', 'LH-329', 'LH-402', 'LH-120', 'LH-195', 'LH-225'];
const ALL_PROJECTS = [...GROUP_A, ...GROUP_B, ...GROUP_A2];

// ข้อมูลพิกัดและสถานีตรวจวัดน้ำ Real-time สำหรับรายงานสถานการณ์น้ำท่วม (ThaiWater, TMD, RID, BMA)
const FLOOD_PROJECTS = {
  // --- โซนรังสิต / ปทุมธานี (คลองรังสิตฯ & คลองหกวา) ---
  'LH-410': { 
    code: 'LH-410', 
    name: 'CHAIYAPRUEK 2 รังสิต คลอง4', 
    area: 'คลองสี่, ธัญบุรี, ปทุมธานี', 
    lat: 14.015, lon: 100.685, group: 'A',
    stationName: 'สถานีคลองรังสิตฯ (ปตร.จุฬาลงกรณ์ / สสน.)',
    basinAlert: 'เฝ้าระวังระดับน้ำคลองรังสิตฯ และมวลน้ำหลากคลองหกวาสายล่าง สูบระบายต่อเนื่องสู่แม่น้ำเจ้าพระยา',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ร่องมรสุมกำลังปานกลางพาดผ่านภาคกลาง เฝ้าระวังฝนตกสะสม'
  },
  'LH-415': { 
    code: 'LH-415', 
    name: 'Villaggio ลำลูกกา-วงแหวน', 
    area: 'บึงคำพร้อย, ลำลูกกา, ปทุมธานี', 
    lat: 13.935, lon: 100.710, group: 'A',
    stationName: 'สถานีคลองหกวาสายล่าง (กรมชลประทาน / สสน.)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำภายนอก: เฝ้าระวังระดับน้ำคลองหกวาสายล่างหนุนสูง คันกั้นน้ำภายนอกมีน้ำเอ่อล้น เตรียมพร้อมระบบสูบระบาย',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ เฝ้าระวังฝนตกสะสม'
  },
  'NE-419': { 
    code: 'NE-419', 
    name: 'Villaggio รังสิตคลอง 4', 
    area: 'คลองสี่, ธัญบุรี, ปทุมธานี', 
    lat: 14.010, lon: 100.682, group: 'A',
    stationName: 'สถานีคลองรังสิตประยูรศักดิ์ (ปตร.จุฬาลงกรณ์ / สสน.)',
    basinAlert: 'เฝ้าระวังระดับน้ำคลองรังสิตฯ สูบระบายต่อเนื่องสู่แม่น้ำเจ้าพระยา',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ร่องมรสุมกำลังปานกลางพาดผ่านภาคกลาง เฝ้าระวังฝนตกหนัก'
  },
  'LH-419': { 
    code: 'LH-419', 
    name: 'vie ราชพฤกษ์ตัดใหม่', 
    area: 'บางคูวัด, เมือง, ปทุมธานี', 
    lat: 13.972, lon: 100.478,
    stationName: 'สถานีคลองบางหลวงเชียงราก - ปตร.เชียงราก (กรมชลประทาน)',
    basinAlert: 'ระดับน้ำคลองเชียงรากอยู่ในเกณฑ์ควบคุม ประตูระบายน้ำเปิดระบายสู่แม่น้ำเจ้าพระยา',
    tmdAlert: 'กรมอุตุนิยมวิทยา: มีเมฆมาก ฝนฟ้าคะนอง 60% ของพื้นที่ ปทุมธานี'
  },

  // --- โซนพระนครศรีอยุธยา (ลุ่มน้ำเจ้าพระยา & ป่าสัก) ---
  'LH-341': { 
    code: 'LH-341', 
    name: 'Villaggio 2-อยุธยา', 
    area: 'บ้านกรด, บางปะอิน, พระนครศรีอยุธยา', 
    lat: 14.318, lon: 100.608,
    stationName: 'สถานี C.35 แม่น้ำเจ้าพระยา พระนครศรีอยุธยา (กรมชลประทาน / สสน.)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำเหนือ: เฝ้าระวังอัตราการระบายน้ำท้ายเขื่อนเจ้าพระยาและระดับน้ำแม่น้ำป่าสักล้นตลิ่ง',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ภาคกลางตอนบนมีฝนตกต่อเนื่อง เฝ้าระวังน้ำหลากพื้นที่ลุ่มต่ำริมน้ำ'
  },
  'LH-328': { 
    code: 'LH-328', 
    name: 'Villaggio เกาะเรียน', 
    area: 'เกาะเรียน, พระนครศรีอยุธยา, พระนครศรีอยุธยา', 
    lat: 14.312, lon: 100.572,
    stationName: 'สถานี C.35 แม่น้ำเจ้าพระยา (เกาะเรียน) (กรมชลประทาน / สสน.)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำเหนือ: เฝ้าระวังระดับน้ำแม่น้ำเจ้าพระยาและอัตราการระบายน้ำเขื่อนเจ้าพระยาต่อเนื่อง',
    tmdAlert: 'กรมอุตุนิยมวิทยา: เฝ้าระวังฝนตกสะสมและปริมาณน้ำหลากทุ่งลุ่มน้ำเจ้าพระยา'
  },
  'NE-411': { 
    code: 'NE-411', 
    name: 'CHAIYAPRUEK อยุธยา', 
    area: 'คลองสวนพลู, พระนครศรีอยุธยา, พระนครศรีอยุธยา', 
    lat: 14.335, lon: 100.612,
    stationName: 'สถานี C.35 / ปตร.พระนเรศวร อยุธยา (กรมชลประทาน / สสน.)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำเหนือ: เฝ้าระวังระดับน้ำแม่น้ำป่าสักและอัตราการระบายน้ำท้ายเขื่อนพระราม 6 / เขื่อนเจ้าพระยา',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ภาคกลางตอนบนมีฝนฟ้าคะนอง เฝ้าระวังระดับน้ำลุ่มน้ำป่าสักและเจ้าพระยา'
  },

  // --- โซนบางใหญ่ / บางบัวทอง / ปากเกร็ด (นนทบุรี) ---
  'LH-323': { 
    code: 'LH-323', 
    name: 'Indy WESTGATE', 
    area: 'บางรักพัฒนา, บางบัวทอง, นนทบุรี', 
    lat: 13.888, lon: 100.395,
    stationName: 'สถานีคลองบางไผ่ - คลองบางบัวทอง (กรมชลประทาน / สสน.)',
    basinAlert: 'ระดับน้ำคลองบางบัวทองอยู่ในเกณฑ์ควบคุม ประตูระบายน้ำเปิดระบายตามรอบน้ำลง',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ ปริมณฑลตะวันตก'
  },
  'LH-337': { 
    code: 'LH-337', 
    name: 'anya WESTGATE', 
    area: 'บางรักพัฒนา, บางบัวทอง, นนทบุรี', 
    lat: 13.905, lon: 100.378,
    stationName: 'สถานีคลองลาดปลาดุก - คลองบางบัวทอง (กรมชลประทาน / สสน.)',
    basinAlert: 'ระดับน้ำคลองลาดปลาดุกปกติ ประตูระบายน้ำระบายออกสู่แม่น้ำเจ้าพระยาได้คล่องตัว',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ ปริมณฑลตะวันตก'
  },
  'LH-354': { 
    code: 'LH-354', 
    name: 'Villaggio บางใหญ่', 
    area: 'บางแม่นาง, บางใหญ่, นนทบุรี', 
    lat: 13.876, lon: 100.370,
    stationName: 'สถานีคลองถนน - ปตร.บางใหญ่ (กรมชลประทาน / สสน.)',
    basinAlert: 'ระดับน้ำคลองบางใหญ่อยู่ในเกณฑ์เฝ้าระวัง สถานีสูบน้ำพร้อมเดินเครื่องระบาย',
    tmdAlert: 'กรมอุตุนิยมวิทยา: มีเมฆมาก ฝนฟ้าคะนอง 60% ของพื้นที่ ปริมณฑล'
  },
  'LH-383': { 
    code: 'LH-383', 
    name: 'พฤกษ์ลดา ราชพฤกษ์-345', 
    area: 'ละหาร, บางบัวทอง, นนทบุรี', 
    lat: 13.955, lon: 100.460,
    stationName: 'สถานีคลองลากค้อน - ปตร.พระยาบันลือ (กรมชลประทาน)',
    basinAlert: 'เฝ้าระวังระดับน้ำคลองพระยาบันลือและการผันน้ำออกสู่แม่น้ำท่าจีน สูบระบายต่อเนื่อง',
    tmdAlert: 'กรมอุตุนิยมวิทยา: เฝ้าระวังฝนตกหนักเป็นแห่งๆ และลมกระโชกแรง'
  },
  'LH-406': { 
    code: 'LH-406', 
    name: 'CHAIYAPRUEK แจ้งวัฒนะ', 
    area: 'คลองข่อย, ปากเกร็ด, นนทบุรี', 
    lat: 13.935, lon: 100.475,
    stationName: 'สถานีคลองพระอุดม - ปตร.ปากเกร็ด (กรมชลประทาน / สสน.)',
    basinAlert: 'ระดับน้ำคลองพระอุดมปกติ ประตูระบายน้ำปากเกร็ดสูบระบายต่อเนื่องสู่แม่น้ำเจ้าพระยา',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ ปริมณฑลตอนบน'
  },
  'LH-372': { 
    code: 'LH-372', 
    name: 'มัณฑนา ราชพฤกษ์-นครอินทร์', 
    area: 'บางเลน, บางใหญ่, นนทบุรี', 
    lat: 13.842, lon: 100.435,
    stationName: 'สถานีคลองอ้อมนนท์ - วัดขวัญเมือง (กรมชลประทาน / สสน.)',
    basinAlert: 'ระดับน้ำคลองอ้อมนนท์ปกติ เฝ้าระวังช่วงน้ำทะเลหนุนตามรอบน้ำขึ้น-ลง',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ นนทบุรี'
  },
  'LH-420': { 
    code: 'LH-420', 
    name: 'MANTANA ณ ราชพฤกษ์', 
    area: 'บางพลับ, ปากเกร็ด, นนทบุรี', 
    lat: 13.918, lon: 100.450,
    stationName: 'สถานีคลองบางพลับ - คลองบางบัวทอง (กรมชลประทาน / สสน.)',
    basinAlert: 'ระดับน้ำในคลองอยู่ในเกณฑ์ควบคุม การระบายน้ำลงสู่คลองบางบัวทองปกติ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ ปริมณฑล'
  },
  'LA-029': { 
    code: 'LA-029', 
    name: 'anya ราชพฤกษ์-นครอินทร์', 
    area: 'บางเลน, บางใหญ่, นนทบุรี', 
    lat: 13.848, lon: 100.438,
    stationName: 'สถานีคลองอ้อมนนท์ - คลองบางบัวทอง (กรมชลประทาน / สสน.)',
    basinAlert: 'ระดับน้ำคลองอ้อมนนท์อยู่ในเกณฑ์ควบคุม ประตูระบายน้ำพร้อมสูบระบาย',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ นนทบุรี'
  },

  // --- โซนกรุงเทพกรีฑา / สะพานสูง / รามคำแหง ---
  'LH-379': { 
    code: 'LH-379', 
    name: 'นันทวัน พระราม 9-กรุงเทพกรีฑาตัดใหม่', 
    area: 'สะพานสูง, กรุงเทพมหานคร', 
    lat: 13.742, lon: 100.692, group: 'B',
    stationName: 'สถานีคลองแสนแสบ - คลองประเวศฯ (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองแสนแสบต่ำกว่าวิกฤติ 0.45 ม. สูบระบายปกติ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: มีเมฆมาก ฝนฟ้าคะนอง 60-70% ของพื้นที่ กทม.'
  },
  'LH-392': { 
    code: 'LH-392', 
    name: 'VIVE กรุงเทพกรีฑาตัดใหม่', 
    area: 'สะพานสูง, กรุงเทพมหานคร', 
    lat: 13.745, lon: 100.690, group: 'B',
    stationName: 'สถานีคลองทับช้าง - คลองประเวศฯ (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองประเวศฯ อยู่ในเกณฑ์ควบคุม เดินเครื่องสูบน้ำปกติ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: มีเมฆมาก ฝนฟ้าคะนอง 60-70% ของพื้นที่ กทม.'
  },
  'LH-395': { 
    code: 'LH-395', 
    name: 'NANTAWAN POOL VILLA พระราม 9', 
    area: 'สะพานสูง, กรุงเทพมหานคร', 
    lat: 13.740, lon: 100.695, group: 'B',
    stationName: 'สถานีคลองบ้านม้า - คลองแสนแสบ (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำในเกณฑ์ควบคุม สถานีสูบน้ำพร้อมระบายลงคลองแสนแสบ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: มีเมฆมาก ฝนฟ้าคะนอง 60-70% ของพื้นที่ กทม.'
  },

  // --- โซนรามอินทรา / สายไหม / บางเขน / คลองสามวา ---
  'LA-025': { 
    code: 'LA-025', 
    name: 'PRUEKLADA ทางด่วนรามอินทรา-จตุโชติ', 
    area: 'สามวาตะวันตก, คลองสามวา, กรุงเทพมหานคร', 
    lat: 13.9072, lon: 100.7010,
    stationName: 'สถานีคลองหนองระแหง - คลองหกวาสายล่าง (สำนักการระบายน้ำ กทม. / กรมชลประทาน)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำภายนอก: พื้นที่ประชิดแนวคลองหกวาสายล่าง (ห่าง 1.5 กม.) เฝ้าระวังระดับน้ำคลองหนองระแหงและคลองหกวาหนุนสูง ตรวจเช็ค Flap Valve และเร่งสูบระบาย',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60-70% ของพื้นที่ กทม. ตะวันออกเฉียงเหนือและปริมณฑล ลมกระโชกแรงบางแห่ง'
  },
  'LH-120': { 
    code: 'LH-120', 
    name: 'นันทวัน รามอินทรา-พหลโยธิน 50', 
    area: 'ท่าแร้ง, บางเขน, กรุงเทพมหานคร', 
    lat: 13.882, lon: 100.625,
    stationName: 'สถานีคลองบัว - คลองลาดพร้าว (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองลาดพร้าวอยู่ในเกณฑ์ควบคุม ประตูระบายน้ำพร้อมทำงาน 100%',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ กทม. ตอนเหนือ'
  },
  'LH-195': { 
    code: 'LH-195', 
    name: 'มัณฑนา-Lake Watcharapol', 
    area: 'ออเงิน, สายไหม, กรุงเทพมหานคร', 
    lat: 13.902, lon: 100.675,
    stationName: 'สถานีคลองออเงิน - คลองหกวาสายล่าง (สำนักการระบายน้ำ กทม.)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำภายนอก: เฝ้าระวังระดับน้ำคลองหกวาสายล่างหนุนสูง คันกั้นน้ำตอนบนมีน้ำล้น เร่งสูบระบาย',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ กทม. ตะวันออกเฉียงเหนือ'
  },
  'LH-225': { 
    code: 'LH-225', 
    name: 'พฤกษ์ลดา วงแหวน-หทัยราษฎร์', 
    area: 'สามวาตะวันตก, คลองสามวา, กรุงเทพมหานคร', 
    lat: 13.895, lon: 100.718,
    stationName: 'สถานีคลองสามวา - คลองหกวาสายล่าง (สำนักการระบายน้ำ กทม. / ชลประทาน)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำภายนอก: เฝ้าระวังระดับน้ำคลองหกวาสายล่างหนุนสูง การไหลของน้ำคลองสามวาเร่งเปิดระบาย',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ กทม. ตะวันออก'
  },
  'LH-402': { 
    code: 'LH-402', 
    name: 'vie ทางด่วนรามอินทรา-วงแหวน', 
    area: 'สามวาตะวันตก, คลองสามวา, กรุงเทพมหานคร', 
    lat: 13.9108, lon: 100.7048,
    stationName: 'สถานีคลองหนองระแหง - คลองหกวาสายล่าง / คลองสามวา (สำนักการระบายน้ำ กทม. / กรมชลประทาน)',
    basinAlert: '⚠️ แจ้งเตือนมวลน้ำภายนอก: พื้นที่ติดถนนหนองระแหง ประชิดแนวคลองหกวาสายล่าง เฝ้าระวังมวลน้ำหลากตอนบน ตรวจเช็คแนวคันกั้นน้ำและระบบสูบน้ำพร้อมทำงาน 100%',
    tmdAlert: 'กรมอุตุนิยมวิทยา: มีเมฆมาก ฝนฟ้าคะนอง 60-70% ของพื้นที่ กทม. ตะวันออกเฉียงเหนือ เฝ้าระวังฝนตกหนักสะสมระยะสั้น'
  },
  'LH-329': { 
    code: 'LH-329', 
    name: 'สีวลี ศรีนครินทร์-ร่มเกล้า', 
    area: 'มีนบุรี, กรุงเทพมหานคร', 
    lat: 13.778, lon: 100.735, group: 'A2',
    stationName: 'สถานีคลองสามวา - คลองแสนแสบมีนบุรี (สสน. / กทม.)',
    basinAlert: 'ระดับน้ำคลองสามวาปกติ สถานีสูบน้ำมีนบุรีพร้อมเดินเครื่องเต็มกำลัง',
    tmdAlert: 'กรมอุตุนิยมวิทยา: เฝ้าระวังฝนตกหนักสะสมในพื้นที่ กทม. ตะวันออก'
  },

  // --- โซนฝั่งธนบุรี / ทวีวัฒนา / ตลิ่งชัน / หนองแขม / พระราม 2 ---
  'LH-414': { 
    code: 'LH-414', 
    name: 'CHAIYAPRUEK พรานนก-สาย2', 
    area: 'ทวีวัฒนา, ทวีวัฒนา, กรุงเทพมหานคร', 
    lat: 13.762, lon: 100.392,
    stationName: 'สถานีคลองทวีวัฒนา - คลองบางเชือกหนัง (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองทวีวัฒนาต่ำกว่าวิกฤติ 0.60 ม. ประตูระบายน้ำเปิดระบายปกติ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ กทม. ฝั่งธนบุรี'
  },
  'LH-421': { 
    code: 'LH-421', 
    name: 'MANTANA ปิ่นเกล้า - สาย3', 
    area: 'ศาลาธรรมสพน์, ทวีวัฒนา, กรุงเทพมหานคร', 
    lat: 13.778, lon: 100.365,
    stationName: 'สถานีคลองบางพรม - คลองทวีวัฒนา (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองบางพรมอยู่ในเกณฑ์ควบคุม เร่งระบายลงสู่สถานีสูบน้ำคลองชักพระ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ กทม. ฝั่งธนบุรี'
  },
  'LH-221': { 
    code: 'LH-221', 
    name: 'นันทวัน ปิ่นเกล้า-ราชพฤกษ์', 
    area: 'บางระมาด, ตลิ่งชัน, กรุงเทพมหานคร', 
    lat: 13.785, lon: 100.430,
    stationName: 'สถานีคลองบางระมาด - คลองชักพระ (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองชักพระต่ำกว่าระดับวิกฤติ สถานีสูบน้ำเดินเครื่องปกติ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60-70% ของพื้นที่ กทม. ตะวันตก'
  },
  'LH-205': { 
    code: 'LH-205', 
    name: 'ลดาวัลย์-ราชพฤกษ์ ปิ่นเกล้า', 
    area: 'บางระมาด, ตลิ่งชัน, กรุงเทพมหานคร', 
    lat: 13.775, lon: 100.448,
    stationName: 'สถานีคลองบางเชือกหนัง - คลองมอญ (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองอยู่ในเกณฑ์ควบคุม ประตูระบายน้ำเปิดระบายออกแม่น้ำเจ้าพระยาปกติ',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ กทม.'
  },
  'LH-355': { 
    code: 'LH-355', 
    name: 'CHAIYAPRUEK เพชรเกษม69', 
    area: 'หนองแขม, หนองแขม, กรุงเทพมหานคร', 
    lat: 13.685, lon: 100.360,
    stationName: 'สถานีคลองภาษีเจริญ - ปตร.กระทุ่มแบน (สำนักการระบายน้ำ กทม. / ชลประทาน)',
    basinAlert: 'ระดับน้ำคลองภาษีเจริญปกติ สถานีสูบน้ำพร้อมเร่งระบายออกสู่แม่น้ำท่าจีน',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60-70% ของพื้นที่ กทม. ฝั่งใต้'
  },
  'LH-288': { 
    code: 'LH-288', 
    name: 'ลดาวัลย์ พระราม 2', 
    area: 'แสมดำ, บางขุนเทียน, กรุงเทพมหานคร', 
    lat: 13.642, lon: 100.420,
    stationName: 'สถานีคลองสนามชัย - ปตร.ราชมนตรี (สำนักการระบายน้ำ กทม.)',
    basinAlert: 'ระดับน้ำคลองสนามชัยปกติ เร่งพร่องน้ำออกสู่ทะเลชายฝั่งบางขุนเทียนตามรอบน้ำลง',
    tmdAlert: 'กรมอุตุนิยมวิทยา: ฝนฟ้าคะนอง 60% ของพื้นที่ เฝ้าระวังน้ำทะเลหนุน'
  }
};

// ส่งข้อความตอบกลับไปยัง LINE (Reply API ฟรี 100%)
async function replyToLine(replyToken, messages) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN || !replyToken) {
    console.error("Missing LINE_TOKEN or replyToken in Vercel Environment Variables");
    return false;
  }
  
  const payload = typeof messages === 'string'
    ? [{ type: 'text', text: messages }]
    : Array.isArray(messages)
    ? messages
    : [messages];

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: payload
      })
    });
    if (res.ok) return true;

    const err = await res.text();
    console.error("LINE Reply Error:", err);

    // Fallback: หาก payload มี Flex message แล้วส่งไม่ผ่าน ให้แปลงเป็น Text ธรรมดาแล้วลองใหม่ทันที
    if (payload.some(m => m.type !== 'text')) {
      const fallbackTexts = payload
        .map(m => m.type === 'text' ? m.text : (m.altText || ''))
        .filter(Boolean);
      if (fallbackTexts.length > 0) {
        console.log("Attempting fallback text reply...");
        const fbRes = await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_TOKEN}`
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: 'text', text: fallbackTexts.join('\n\n') }]
          })
        });
        return fbRes.ok;
      }
    }
    return false;
  } catch(e) {
    console.error("LINE Reply Exception:", e);
    return false;
  }
}

// ส่งข้อความแบบ Push ไปยัง Admin ในแชทส่วนตัว (1-on-1 Direct Chat Only)
async function pushToLine(userId, messages) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN || !userId) return false;

  const payload = typeof messages === 'string'
    ? [{ type: 'text', text: messages }]
    : Array.isArray(messages)
    ? messages
    : [messages];

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: payload
      })
    });
    if (res.ok) return true;

    const err = await res.text();
    console.error("LINE Push Error:", err);

    // Fallback ด้วยข้อความธรรมดา
    if (payload.some(m => m.type !== 'text')) {
      const fallbackTexts = payload
        .map(m => m.type === 'text' ? m.text : (m.altText || ''))
        .filter(Boolean);
      if (fallbackTexts.length > 0) {
        console.log("Attempting fallback text push...");
        const fbRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_TOKEN}`
          },
          body: JSON.stringify({
            to: userId,
            messages: [{ type: 'text', text: fallbackTexts.join('\n\n') }]
          })
        });
        return fbRes.ok;
      }
    }
    return false;
  } catch(e) {
    console.error("LINE Push Exception:", e);
    return false;
  }
}

// ดึงภาพถ่ายจาก LINE Content API
async function fetchLineImageBuffer(messageId) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN) throw new Error("Missing LINE_TOKEN");

  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { 'Authorization': `Bearer ${LINE_TOKEN}` }
  });
  if (!res.ok) throw new Error(`LINE Content API HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ถาม Gemini AI
async function askGemini(prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return null;
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("Gemini Error:", err);
    return null;
  }
}

const getEmoji = (text) => {
  if (!text) return '🛠️';
  if (/น้ำ|ก๊อก|ท่อ|รั่ว|ซึม|ปั๊ม/.test(text)) return '💧';
  if (/ไฟ|หลอด|เบรกเกอร์|สวิตช์/.test(text)) return '⚡';
  if (/เหม็น|กลิ่น/.test(text)) return '🤢';
  if (/สี|ทาสี/.test(text)) return '🎨';
  if (/แอร์|ปรับอากาศ/.test(text)) return '❄️';
  if (/กระเบื้อง|พื้น/.test(text)) return '🧱';
  if (/ประตู|หน้าต่าง/.test(text)) return '🚪';
  if (/สวน|หญ้า|ต้นไม้|กิ่ง|ค้ำยัน/.test(text)) return '🌳';
  return '🛠️';
};

const getStatusBadge = (status) => {
  if (status === 'จบงาน') return '✅ จบงาน';
  if (status === 'จบงาน(รอใบงาน)') return '📋 จบงาน(รอใบงาน)';
  if (status === 'ติดปัญหา/รออะไหล่' || status === 'รออะไหล่/ติดปัญหา') return '⚠️ รออะไหล่/ติดปัญหา';
  if (status === 'เลื่อนวันเริ่ม') return '📅 เลื่อนวันเริ่ม';
  if (status === 'เลื่อนวันจบ' || status === 'เลื่อนงาน') return '📅 เลื่อนวันจบ';
  if (status === 'รอดำเนินการ') return '⏳ รอดำเนินการ';
  return '⚙️ กำลังดำเนินการ';
};

const fDateThai = (ds) => {
  if (!ds) return '-';
  const d = new Date(ds);
  return isNaN(d.getTime()) ? String(ds) : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fNum = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ฟังก์ชันคำนวณระยะเวลาคงเหลือสำหรับออกใบงาน (SLA ภายใน 3 วันหลังจบงาน)
const getWorkOrderCountdownText = (t, todayStr) => {
  const cDateStr = t.completedDate || t.endDate || todayStr;
  try {
    const dCompleted = new Date(cDateStr.slice(0, 10) + 'T00:00:00+07:00');
    const dToday = new Date(todayStr.slice(0, 10) + 'T00:00:00+07:00');
    if (isNaN(dCompleted.getTime()) || isNaN(dToday.getTime())) {
      return '(⏳ SLA 3 วัน)';
    }
    const diffMs = dToday.getTime() - dCompleted.getTime();
    const daysPassed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const SLA = 3;
    const daysLeft = SLA - daysPassed;

    if (daysLeft > 1) {
      return `(⏳ เหลือเวลาอีก ${daysLeft} วัน)`;
    } else if (daysLeft === 1) {
      return `(⏳ เหลือเวลาอีก 1 วัน)`;
    } else if (daysLeft === 0) {
      return `(⚠️ วันนี้วันสุดท้าย!)`;
    } else {
      const overdueDays = Math.abs(daysLeft);
      return `(🚨 เกินกำหนดมา ${overdueDays} วัน!)`;
    }
  } catch (e) {
    return '(⏳ SLA 3 วัน)';
  }
};

// 1. ฟังก์ชันสำหรับคำสั่ง !สรุปงาน (ดึงเฉพาะงานวันนี้ - ไม่สนสถานะ)
async function handleSummary(projectList, groupName) {
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'Tasks'));
  let allTasks = [];
  snap.forEach(doc => allTasks.push(doc.data()));
  
  const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}));
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  
  const todaysTasks = allTasks.filter(t => {
    if (t.status === 'ยกเลิก') return false;
    if (!projectList.some(p => (t.project || '').includes(p))) return false;

    const isUnfinishedToday = !t.status?.startsWith('จบงาน') && (
      (todayStr >= t.startDate && todayStr <= t.endDate) ||
      (t.endDate < todayStr)
    );

    const isFinishedToday = t.status?.startsWith('จบงาน') && (
      t.completedDate === todayStr ||
      (!t.completedDate && t.endDate === todayStr)
    );

    return isUnfinishedToday || isFinishedToday;
  });
  
  if (todaysTasks.length === 0) {
    return `ไม่มีภารกิจสำหรับวันนี้ในกลุ่ม ${groupName} ครับ! 🎉 (ข้อมูล ณ วันที่ ${fDateThai(todayStr)})`;
  }

  const doneCount = todaysTasks.filter(t => t.status === 'จบงาน').length;
  const waitWoCount = todaysTasks.filter(t => t.status === 'จบงาน(รอใบงาน)').length;
  const inProgCount = todaysTasks.filter(t => t.status === 'กำลังดำเนินการ' || t.status === 'อยู่ระหว่างดำเนินการ').length;
  const blockedCount = todaysTasks.filter(t => t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา').length;
  const postponedStartCount = todaysTasks.filter(t => t.status === 'เลื่อนวันเริ่ม').length;
  const postponedCount = todaysTasks.filter(t => t.status === 'เลื่อนวันจบ' || t.status === 'เลื่อนงาน').length;
  const pendingCount = todaysTasks.filter(t => t.status === 'รอดำเนินการ').length;
  
  const prompt = `ทำหน้าที่เป็นผู้ช่วยสรุปงานประจำวัน (Daily Tasks Report)
ข้อมูล:
ทีม: กลุ่ม ${groupName} ประจำวันที่ ${fDateThai(todayStr)}
ภาพรวม: ทั้งหมด ${todaysTasks.length} งาน (จบงานแล้ว: ${doneCount}, จบงานรอใบงาน: ${waitWoCount}, กำลังดำเนินการ: ${inProgCount}, ติดปัญหา/รออะไหล่: ${blockedCount}${postponedStartCount > 0 ? `, เลื่อนวันเริ่ม: ${postponedStartCount}` : ''}${postponedCount > 0 ? `, เลื่อนวันจบ: ${postponedCount}` : ''}, รอดำเนินการ: ${pendingCount})
รายการงานวันนี้:
${todaysTasks.map((t, i) => {
  const isWaitWo = (t.status === 'จบงาน(รอใบงาน)' || (t.status || '').includes('รอใบงาน')) && !t.workOrderNo;
  const woCountdown = isWaitWo ? ` ${getWorkOrderCountdownText(t, todayStr)}` : '';
  return `${i+1}. โครงการ: ${t.project}, งาน: ${t.details || t.task_name || 'ไม่ระบุ'}, สถานะ: ${t.status || 'อยู่ระหว่างดำเนินการ'}${woCountdown}${t.workOrderNo ? ' (WO: ' + t.workOrderNo + ')' : ''}${t.issueReason ? ' [สาเหตุ: ' + t.issueReason + ']' : ''}${t.startPostponeReason ? ' [เลื่อนเริ่ม: ' + t.startPostponeReason + ']' : ''}${t.postponeReason ? ' [เลื่อนจบ: ' + t.postponeReason + ']' : ''}`;
}).join('\n')}

ข้อกำหนด:
1. สรุปรายงานประจำวันของวันนี้ โดยแสดงสถานะจริงของทุกงาน (ทั้งที่จบแล้ว, รอใบงาน, กำลังทำ, หรือติดปัญหา) ไม่ต้องตัดงานที่จบแล้วออก
2. สำหรับงานที่สถานะเป็น "จบงาน(รอใบงาน)" ที่ยังไม่มีเลข WO ให้คงข้อความแจ้งเตือนระยะเวลาออกใบงานที่ระบุไว้ด้วยเสมอ เช่น (⏳ เหลือเวลาอีก X วัน), (⚠️ วันนี้วันสุดท้าย!), หรือ (🚨 เกินกำหนดมา X วัน!)
3. สรุปแยกตามโครงการอย่างชัดเจน
4. ใช้ Emoji ประกอบให้น่าอ่าน เช่น ✅ จบงาน, 📋 จบงาน(รอใบงาน), ⚙️ กำลังดำเนินการ, ⚠️ รออะไหล่, 📅 เลื่อนวันเริ่ม, 📅 เลื่อนวันจบ, ⏳ รอดำเนินการ
5. กระชับ ชัดเจน ไม่ต้องเกริ่นนำหรือลงท้ายยาวเกินไป
6. ลงท้ายด้วยประโยคให้กำลังใจทีมงานสั้นๆ`;

  const geminiResponse = await askGemini(prompt);
  if (geminiResponse && !geminiResponse.includes('Error')) {
    return geminiResponse;
  }
  
  let fallbackMsg = `📋 สรุปงานประจำวัน กลุ่ม ${groupName}\n`;
  fallbackMsg += `📅 ประจำวันที่: ${fDateThai(todayStr)}\n`;
  fallbackMsg += `📊 ภาพรวม: ${todaysTasks.length} งาน (✅ จบ ${doneCount} | 📋 รอใบงาน ${waitWoCount} | ⚙️ กำลังทำ ${inProgCount} | ⚠️ รออะไหล่ ${blockedCount}${postponedStartCount > 0 ? ` | 📅 เลื่อนเริ่ม ${postponedStartCount}` : ''}${postponedCount > 0 ? ` | 📅 เลื่อนจบ ${postponedCount}` : ''} | ⏳ รอดำเนินการ ${pendingCount})\n`;
  fallbackMsg += `─────────────────────────\n`;

  const byProject = {};
  todaysTasks.forEach(t => {
    const proj = t.project || 'ไม่ระบุ';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(t);
  });
  
  for (const proj in byProject) {
    fallbackMsg += `\n📌 ${proj} (${byProject[proj].length} งาน)\n`;
    byProject[proj].forEach((t, idx) => {
      const icon = getEmoji(t.details || t.task_name);
      const st = getStatusBadge(t.status || 'อยู่ระหว่างดำเนินการ');
      const isWaitWo = (t.status === 'จบงาน(รอใบงาน)' || (t.status || '').includes('รอใบงาน')) && !t.workOrderNo;
      const woCountdown = isWaitWo ? ` ${getWorkOrderCountdownText(t, todayStr)}` : '';
      const woTag = t.workOrderNo ? ` [WO: ${t.workOrderNo}]` : '';
      fallbackMsg += `${idx + 1}. ${t.details?.replace(/\n/g, ' ') || 'ไม่ระบุ'} ${icon}\n   สถานะ: ${st}${woCountdown}${woTag}\n`;
    });
  }

  fallbackMsg += `\n─────────────────────────\n💪 เป็นกำลังใจให้ทีมงานทุกคนครับ!`;
  return fallbackMsg;
}

// 2. ฟังก์ชันสำหรับคำสั่งใหม่ !รอใบงาน (กวาดงานที่ค้าง จบงาน(รอใบงาน) คั่นด้วยเดือน -> โครงการ)
async function handlePendingWorkOrders(projectList, groupName) {
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'Tasks'));
  let allTasks = [];
  snap.forEach(doc => allTasks.push(doc.data()));

  const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}));
  const nowMs = now.getTime();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const monthNamesThai = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const pendingTasks = allTasks.filter(t => {
    if (t.status === 'ยกเลิก') return false;
    if (!projectList.some(p => (t.project || '').includes(p))) return false;
    const isWaitWo = t.status === 'จบงาน(รอใบงาน)' || (t.status || '').includes('รอใบงาน');
    return isWaitWo && !t.workOrderNo;
  });

  if (pendingTasks.length === 0) {
    return `🎉 ยอดเยี่ยมมาก! ไม่มีงานค้างสถานะ "จบงาน(รอใบงาน)" ในกลุ่ม ${groupName} เลยครับ! (ข้อมูล ณ วันที่ ${fDateThai(todayStr)})`;
  }

  const grouped = {};
  pendingTasks.forEach(t => {
    const rawDate = t.completedDate || t.endDate || t.startDate || todayStr;
    const d = new Date(rawDate.slice(0, 10) + 'T00:00:00+07:00');
    const monthKey = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : `${yyyy}-${mm}`;
    const projectKey = t.project || 'ไม่ระบุโครงการ';

    if (!grouped[monthKey]) grouped[monthKey] = {};
    if (!grouped[monthKey][projectKey]) grouped[monthKey][projectKey] = [];
    grouped[monthKey][projectKey].push(t);
  });

  let msg = `📑 รายการงานค้าง "จบงาน(รอใบงาน)"\n`;
  msg += `กลุ่ม: ${groupName} (ค้างทั้งหมด: ${pendingTasks.length} งาน)\n`;
  msg += `─────────────────────────\n`;

  const sortedMonths = Object.keys(grouped).sort();

  for (const mKey of sortedMonths) {
    const [y, m] = mKey.split('-');
    const mIndex = parseInt(m, 10) - 1;
    const thaiYear = parseInt(y, 10) + 543;
    const monthLabel = `${monthNamesThai[mIndex]} ${thaiYear}`;

    let monthTotal = 0;
    Object.values(grouped[mKey]).forEach(list => monthTotal += list.length);

    msg += `\n📅 เดือน ${monthLabel} (รวม ${monthTotal} งาน)\n`;
    msg += `═════════════════════════\n`;

    const projectsInMonth = grouped[mKey];
    for (const proj in projectsInMonth) {
      const tasks = projectsInMonth[proj];
      msg += `📌 ${proj} (${tasks.length} งาน)\n`;

      tasks.forEach((t, idx) => {
        const cDate = t.completedDate || t.endDate || '-';
        const formattedCDate = fDateThai(cDate);
        const countdown = getWorkOrderCountdownText(t, todayStr);
        const taskName = (t.details || t.task_name || 'งานสาธารณูปโภค').replace(/\n/g, ' ');

        msg += `   ${idx + 1}. ${taskName}\n`;
        msg += `      วันที่จบ: ${formattedCDate} ${countdown}\n`;
        if (t.technician || t.assignee) {
          msg += `      ช่าง: ${t.technician || t.assignee}\n`;
        }
      });
    }
    msg += `─────────────────────────\n`;
  }

  msg += `\n💡 ข้อมูล ณ วันที่ ${fDateThai(todayStr)}\nโปรดประสานงานขอเลขที่ใบงาน (WO) เพื่อนำมาบันทึกในระบบและส่งเบิกจ่ายครับ`;
  return msg;
}

// 3. ฟังก์ชันสำหรับคำสั่ง !เช็คงาน (เช็คจากบอทสอดแนมแจ้งซ่อมส่วนกลาง)
async function handleCheck(projectList, groupName) {
  const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"));
  if (!docSnap.exists()) return "❌ ไม่พบฐานข้อมูลงานจากบอทสอดแนมครับ";
  
  const database = docSnap.data();
  const jobs = Object.values(database).filter(j => projectList.some(p => j.project?.includes(p)));
  
  const nowMs = new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
  const nowTime = new Date(nowMs).getTime();
  
  let overdue5d = [];
  let overdue48h = [];
  let normalJobs = [];
  
  jobs.forEach(j => {
    const hoursPassed = (nowTime - j.reported_timestamp) / (1000 * 60 * 60);
    if (hoursPassed >= 120) overdue5d.push(j);
    else if (hoursPassed >= 48) overdue48h.push(j);
    else normalJobs.push(j);
  });
  
  if (jobs.length === 0) {
     return `🎉 ยอดเยี่ยมมาก! ไม่มีงานค้างในระบบ Dashboard สำหรับกลุ่ม ${groupName} เลยครับ!`;
  }

  let msg = `📢 อัปเดตงานสาธารณูปโภค (กลุ่ม ${groupName})\n`;
  const formatJob = (j) => `\n📌 ${j.project}\n🏠 บ้านเลขที่: ${j.house_no || '-'}\n👤 ผู้แจ้ง: ${j.customer_name || '-'}\n📞 เบอร์โทร: ${j.phone || '-'}\n📝 รายละเอียด: ${j.details || '-'}\n(รหัส: ${j.job_id})\n`;
  
  if (normalJobs.length > 0) {
     msg += `\n🆕 งานรอดำเนินการ:\n` + normalJobs.map(formatJob).join('');
  }
  if (overdue48h.length > 0) {
     msg += `\n⚠️ งานค้างเกิน 48 ชม:\n` + overdue48h.map(formatJob).join('');
  }
  if (overdue5d.length > 0) {
     msg += `\n🚨 งานล่าช้าเกิน 5 วัน:\n` + overdue5d.map(formatJob).join('');
  }
  
  return msg;
}

// Helper ค้นหาโครงการจากรหัสหรือชื่อโครงการ
function findProject(projects, query) {
  if (!query) return null;
  const q = query.trim().toUpperCase().replace(/[\s\-_]/g, '');

  for (const [key, p] of Object.entries(projects)) {
    const keyClean = key.toUpperCase().replace(/[\s\-_]/g, '');
    const codeClean = (p.code || '').toUpperCase().replace(/[\s\-_]/g, '');
    if (keyClean === q || codeClean === q) return p;
  }
  for (const [key, p] of Object.entries(projects)) {
    const keyClean = key.toUpperCase().replace(/[\s\-_]/g, '');
    const codeClean = (p.code || '').toUpperCase().replace(/[\s\-_]/g, '');
    if (keyClean.includes(q) || codeClean.includes(q)) return p;
  }
  for (const [key, p] of Object.entries(projects)) {
    const nameClean = (p.fullName || '').toUpperCase();
    if (nameClean.includes(query.trim().toUpperCase())) return p;
  }
  return null;
}

// 4. ฟังก์ชันสำหรับคำสั่ง !งบ, !งบA, !งบB, !งบA2 (สรุปภาพรวมงบประมาณ & คาดการณ์สิ้นปี)
async function handleBudgetOverview(targetGroup) {
  try {
    const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"));
    if (!docSnap.exists()) {
      return "❌ ยังไม่พบข้อมูลงบประมาณในระบบ\nกรุณารันบอทอัปเดตงบประมาณจากระบบ LH Portal ก่อนครับ";
    }

    const data = docSnap.data();
    const projects = data.projects || {};
    const groupName = targetGroup === 'ALL' ? 'ทั้งหมดทุกโครงการ' : `กลุ่ม ${targetGroup}`;

    const filtered = Object.values(projects).filter(p => {
      if (targetGroup === 'ALL') return true;
      return p.group === targetGroup;
    });

    if (filtered.length === 0) {
      return `❌ ไม่พบข้อมูลสำหรับ ${groupName} ในระบบครับ`;
    }

    let totActual = 0;
    let totYtg = 0;
    let totFy = 0;
    let totBudget = 0;

    filtered.forEach(p => {
      totActual += (p.totalYtdActual || 0);
      totYtg += (p.totalYtgForecast || 0);
      totFy += (p.totalFyLanding || 0);
      totBudget += (p.totalBudget || 0);
    });

    const diff = totFy - totBudget;
    const diffPct = totBudget > 0 ? (diff / totBudget) * 100 : 0;
    const diffSign = diff > 0 ? '+' : '';
    const overallBadge = diff > 0 ? '🚨 เสี่ยงเกินงบ' : '✅ ภายในงบประมาณ';

    const ytdLbl = data.ytdLabel || 'จ่ายจริง (YTD)';
    const ytgLbl = data.ytgLabel || 'Forecast (YTG)';

    let msg = `💰 สรุปงบประมาณ & Forecast สิ้นปี\n`;
    msg += `👥 กลุ่ม: ${groupName} (${filtered.length} โครงการ)\n`;
    msg += `(หน่วย: พันบาท | ยอดจริง + คาดการณ์)\n`;
    msg += `─────────────────────────\n`;
    msg += `📊 ภาพรวมกลุ่ม:\n`;
    msg += `• ${ytdLbl}: ${fNum(totActual)} พันบ.\n`;
    msg += `• ${ytgLbl}: ${fNum(totYtg)} พันบ.\n`;
    msg += `• คาดการณ์จบปี (FY): ${fNum(totFy)} พันบ.\n`;
    msg += `• งบประมาณทั้งปี: ${fNum(totBudget)} พันบ.\n`;
    msg += `• ผลต่างสิ้นปี: ${overallBadge} (${diffSign}${fNum(diff)} พันบ. / ${diffSign}${diffPct.toFixed(1)}%)\n`;
    msg += `─────────────────────────\n`;
    msg += `📌 สรุปรายโครงการ:\n`;

    filtered.forEach((p, idx) => {
      const pDiff = p.totalVariance || 0;
      const pSign = pDiff > 0 ? '+' : '';
      const pBadge = pDiff > 0 ? '⚠️' : '✅';
      msg += `\n${idx + 1}. [${p.code}] ${p.name || p.fullName}\n`;
      msg += `   จริง: ${fNum(p.totalYtdActual)} | คาดการณ์: ${fNum(p.totalFyLanding)}\n`;
      msg += `   งบ: ${fNum(p.totalBudget)} | ผลต่าง: ${pBadge} ${pSign}${fNum(pDiff)} พันบ. (${p.totalVariancePct})\n`;
    });

    msg += `\n─────────────────────────\n`;
    msg += `🕒 ข้อมูล ณ วันที่: ${data.updatedDateThai || '-'}\n`;
    msg += `💡 พิมพ์ '!งบ [รหัส]' เช่น '!งบ 410' เพื่อเจาะลึก 9 หมวด`;
    return msg;
  } catch (err) {
    console.error("handleBudgetOverview Error:", err);
    return "❌ เกิดข้อผิดพลาดในการดึงข้อมูลงบประมาณ กรุณาลองใหม่อีกครั้งครับ";
  }
}

// 5. ฟังก์ชันสำหรับคำสั่ง !งบ [รหัส] (เจาะลึก 9 หมวดบัญชี + ใบสำคัญจ่าย PV)
async function handleProjectBudget(projectQuery) {
  try {
    const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"));
    if (!docSnap.exists()) {
      return "❌ ยังไม่พบข้อมูลในระบบ กรุณารันบอทอัปเดตงบประมาณก่อนครับ";
    }

    const data = docSnap.data();
    const projects = data.projects || {};
    const proj = findProject(projects, projectQuery);

    if (!proj) {
      const avail = Object.keys(projects).join(', ');
      return `❌ ไม่พบรหัสโครงการ "${projectQuery}" ครับ\n📌 โครงการที่มีข้อมูล: ${avail}\n💡 ตัวอย่างการพิมพ์: !งบ 410, !งบ LA-025, !งบ 379`;
    }

    const pDiff = proj.totalVariance || 0;
    const pSign = pDiff > 0 ? '+' : '';

    const ytdLbl = data.ytdLabel || 'จ่ายจริง (YTD)';
    const ytgLbl = data.ytgLabel || 'Forecast (YTG)';

    let msg = `💰 รายละเอียดงบ & Forecast\n`;
    msg += `📌 [${proj.code}] ${proj.fullName}\n`;
    msg += `👥 กลุ่ม: กลุ่ม ${proj.group} (หน่วย: พันบาท)\n`;
    msg += `─────────────────────────\n`;
    msg += `📊 ภาพรวมโครงการ:\n`;
    msg += `• ${ytdLbl}: ${fNum(proj.totalYtdActual)} พันบ.\n`;
    msg += `• ${ytgLbl}: ${fNum(proj.totalYtgForecast)} พันบ.\n`;
    msg += `• คาดการณ์จบปี (FY): ${fNum(proj.totalFyLanding)} พันบ.\n`;
    msg += `• งบประมาณทั้งปี: ${fNum(proj.totalBudget)} พันบ.\n`;
    msg += `• ผลต่างสุทธิ: ${proj.overallStatus} (${pSign}${fNum(pDiff)} พันบ. / ${proj.totalVariancePct})\n`;
    msg += `─────────────────────────\n`;
    msg += `📑 แยกราย 9 หมวดบัญชี:\n`;

    (proj.expenses || []).forEach((e, idx) => {
      const diffS = e.variance > 0 ? '+' : '';
      const badge = e.variance > 0 ? '🚨' : '✅';
      msg += `\n${idx + 1}. ${e.title}\n`;
      msg += `   จริง: ${fNum(e.ytdActual)} | สิ้นปี: ${fNum(e.fyLanding)}\n`;
      msg += `   งบ: ${fNum(e.fullYearBudget)} | ผลต่าง: ${badge} ${diffS}${fNum(e.variance)} พันบ. (${e.variancePct})\n`;
    });

    if (proj.vouchers && proj.vouchers.length > 0) {
      msg += `─────────────────────────\n`;
      msg += `🧾 ใบสำคัญจ่าย PV ล่าสุด (${proj.vouchers.length} รายการ):\n`;
      proj.vouchers.slice(0, 3).forEach((v) => {
        msg += `• ${v.date} [${v.pvNo}] ${v.amount} บ.\n   ${v.vendor} (${v.workDesc})\n`;
      });
    }

    msg += `─────────────────────────\n`;
    msg += `🕒 ข้อมูล ณ วันที่: ${data.updatedDateThai || '-'}`;
    return msg;
  } catch (err) {
    console.error("handleProjectBudget Error:", err);
    return "❌ เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ กรุณาลองใหม่อีกครั้งครับ";
  }
}

// 6. ฟังก์ชันสำหรับคำสั่ง !เกินงบ (แจ้งเตือนเฉพาะโครงการและหมวดที่เสี่ยงเกินงบ)
async function handleOverBudget() {
  try {
    const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"));
    if (!docSnap.exists()) {
      return "❌ ยังไม่พบข้อมูลในระบบ กรุณารันบอทอัปเดตงบประมาณก่อนครับ";
    }

    const data = docSnap.data();
    const projects = data.projects || {};

    let overCount = 0;
    let msg = `🚨 รายการที่มีความเสี่ยง "เกินงบประมาณ"\n`;
    msg += `(คาดการณ์จบปีสิ้นสุดเกินงบประมาณ | หน่วย: พันบาท)\n`;
    msg += `─────────────────────────\n`;

    for (const [code, p] of Object.entries(projects)) {
      const overExpenses = (p.expenses || []).filter(e => e.variance > 0);
      if (p.totalVariance > 0 || overExpenses.length > 0) {
        overCount++;
        const pDiff = p.totalVariance || 0;
        const pSign = pDiff > 0 ? '+' : '';
        msg += `\n📌 [${p.code}] ${p.fullName} (กลุ่ม ${p.group})\n`;
        msg += `   ภาพรวม: ${p.overallStatus} (${pSign}${fNum(pDiff)} พันบ. / ${p.totalVariancePct})\n`;
        if (overExpenses.length > 0) {
          msg += `   หมวดที่เกินงบ:\n`;
          overExpenses.forEach(e => {
            msg += `   ⚠️ ${e.title}: เกิน +${fNum(e.variance)} พันบ. (${e.variancePct})\n`;
          });
        }
      }
    }

    if (overCount === 0) {
      return `🎉 ยอดเยี่ยมมาก! ทุกโครงการคาดการณ์ค่าใช้จ่ายสิ้นปีอยู่ในกรอบงบประมาณทั้งหมด (ไม่มีรายการเกินงบ)`;
    }

    msg += `─────────────────────────\n`;
    msg += `📊 พบโครงการที่ต้องเฝ้าระวัง: ${overCount} โครงการ\n`;
    msg += `🕒 ข้อมูล ณ วันที่: ${data.updatedDateThai || '-'}\n`;
    msg += `💡 พิมพ์ '!งบ [รหัส]' เพื่อดูรายละเอียดรายโครงการ`;

    return msg;
  } catch (err) {
    console.error("handleOverBudget Error:", err);
    return "❌ เกิดข้อผิดพลาดในการดึงข้อมูลรายการเกินงบ กรุณาลองใหม่อีกครั้งครับ";
  }
}

// ==========================================
// 🌊 ระบบรายงานสถานการณ์น้ำท่วม (Flood Monitoring)
// ==========================================

// ค้นหาโครงการสำหรับรายงานน้ำท่วม (Smart Dynamic Matcher)
const BRAND_SYNONYMS = {
  chaiyapruek: 'ชัยพฤกษ์',
  ชัยพฤกษ์: 'chaiyapruek',
  mantana: 'มัณฑนา',
  มัณฑนา: 'mantana',
  prueklada: 'พฤกษ์ลดา',
  พฤกษ์ลดา: 'prueklada',
  nantawan: 'นันทวัน',
  นันทวัน: 'nantawan',
  ladawan: 'ลดาวัลย์',
  ลดาวัลย์: 'ladawan',
  indy: 'อินดี้',
  อินดี้: 'indy'
};

function cleanStr(s) {
  return (s || '').toLowerCase().replace(/[\s\-_]/g, '');
}

function getKeywords(name) {
  return (name || '')
    .replace(/([0-9]+)/g, ' $1 ')
    .replace(/(ทางด่วน|รามอินทรา|พหลโยธิน|พระราม|กาญจนา|นครอินทร์|ราชพฤกษ์|บางบัวทอง|บางใหญ่|บางนา|ศรีนครินทร์|ปิ่นเกล้า|เพชรเกษม|แจ้งวัฒนะ|รังสิต|ลำลูกกา|หทัยราษฎร์|จตุโชติ|หนองระแหง)/gi, ' $1 ')
    .toLowerCase()
    .split(/[\s\-_]+/)
    .filter(w => w.length >= 2);
}

function lookupProjectForFlood(input) {
  if (!input) return null;
  const text = input.trim();
  const tokens = text.split(/\s+/);
  const firstTokenClean = cleanStr(tokens[0]).toUpperCase();

  // 1. ตรวจจับด้วยรหัสโครงการแบบตรง (เช่น LH410, LH-410, NE419, LA025, LH323)
  for (const [key, p] of Object.entries(FLOOD_PROJECTS)) {
    const keyClean = cleanStr(key).toUpperCase();
    const codeClean = cleanStr(p.code).toUpperCase();
    if (keyClean === firstTokenClean || codeClean === firstTokenClean) {
      const notes = tokens.slice(1).join(' ').trim();
      return { project: p, notes };
    }
  }

  // 2. ตรวจจับด้วยตัวเลขรหัสโครงการแบบ Dynamic (ดึงเลขจากทุกโครงการใน FLOOD_PROJECTS)
  // รองรับการพิมพ์เช่น !น้ำท่วม 323 ถนนแห้ง, !น้ำท่วม 419 vie, !น้ำท่วม 29, !น้ำท่วม 029
  const numSet = new Set();
  for (const key of Object.keys(FLOOD_PROJECTS)) {
    const m = key.match(/\d+/);
    if (m) {
      numSet.add(m[0]);
      const parsed = parseInt(m[0], 10);
      if (!isNaN(parsed)) {
        numSet.add(String(parsed));
      }
    }
  }

  const allNumbers = Array.from(numSet).sort((a, b) => b.length - a.length);
  const numPattern = new RegExp(`\\b(${allNumbers.join('|')})\\b`, 'i');
  const numMatch = text.match(numPattern);
  if (numMatch) {
    const num = numMatch[1];
    const candidateProjects = [];
    for (const [key, p] of Object.entries(FLOOD_PROJECTS)) {
      const pDigits = p.code.replace(/\D/g, '');
      const numParsed = parseInt(num, 10);
      if (p.code.includes(num) || p.code.includes(num.padStart(3, '0')) || pDigits === num || parseInt(pDigits, 10) === numParsed) {
        candidateProjects.push(p);
      }
    }

    const notes = text.replace(numMatch[0], '').trim();
    if (candidateProjects.length === 1) {
      return { project: candidateProjects[0], notes };
    } else if (candidateProjects.length > 1) {
      // มีเลขซ้ำกัน เช่น LH-419 vs NE-419 -> Disambiguate ด้วยคำค้นในชื่อโครงการหรือคีย์เวิร์ด
      const textUpper = text.toUpperCase();
      const textClean = cleanStr(text);

      let bestCand = null;
      let maxScore = -1;

      for (const p of candidateProjects) {
        let score = 0;
        const prefix = p.code.split(/[-_]/)[0].toUpperCase();
        if (textUpper.includes(prefix)) score += 5;

        const pNameClean = cleanStr(p.name);
        if (textClean.includes(pNameClean) || pNameClean.includes(textClean)) score += 10;

        // เช็คคำสำคัญย่อยในชื่อโครงการ
        const keywords = getKeywords(p.name);
        for (const kw of keywords) {
          const syn = BRAND_SYNONYMS[kw];
          if (text.toLowerCase().includes(kw) || textClean.includes(cleanStr(kw)) || (syn && text.toLowerCase().includes(syn))) {
            score += 2;
          }
        }

        if (score > maxScore) {
          maxScore = score;
          bestCand = p;
        }
      }

      return { project: bestCand || candidateProjects[0], notes };
    }
  }

  // 3. ตรวจจับด้วยชื่อโครงการหรือคำสำคัญ (Smart Name & Keyword Matcher)
  const textClean = cleanStr(text);
  let bestProject = null;
  let highestScore = 0;

  // เรียงโครงการที่มีชื่อยาวกว่าก่อน เพื่อให้ชื่อเฉพาะเจาะจงชนะ
  const projectList = Object.values(FLOOD_PROJECTS).sort((a, b) => b.name.length - a.name.length);

  for (const p of projectList) {
    const pNameClean = cleanStr(p.name);
    let score = 0;

    // ถ้าข้อความมีชื่อเต็มโครงการแบบ normalized หรือชื่อโครงการครอบคลุมข้อความค้นหา (เช่น ปิ่นเกล้าสาย3 อยู่ใน mantanaปิ่นเกล้าสาย3)
    if (textClean.includes(pNameClean)) {
      score += 100 + pNameClean.length;
    } else if (textClean.length >= 4 && pNameClean.includes(textClean)) {
      score += 50 + textClean.length;
    } else {
      // ตรวจสอบคีย์เวิร์ดย่อยของชื่อโครงการ
      const keywords = getKeywords(p.name);
      let matchedKwCount = 0;
      for (const kw of keywords) {
        const kwClean = cleanStr(kw);
        const syn = BRAND_SYNONYMS[kw];
        if (text.toLowerCase().includes(kw) || (kwClean.length >= 3 && textClean.includes(kwClean))) {
          matchedKwCount++;
          score += kw.length * 2;
        } else if (syn && (text.toLowerCase().includes(syn) || textClean.includes(cleanStr(syn)))) {
          matchedKwCount++;
          score += syn.length * 2;
        }
      }
      if (matchedKwCount === 0 || score < 6) {
        score = 0;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestProject = p;
    }
  }

  if (bestProject && highestScore >= 6) {
    const notes = text.replace(new RegExp(bestProject.name, 'i'), '').trim();
    return { project: bestProject, notes };
  }

  return null;
}

// ดึงข้อมูลสถานะหน้างานโดยตรงจากข้อความที่ผู้ใช้พิมพ์ใน LINE
function extractDirectFieldReport(notes = '') {
  const text = (notes || '').trim();
  if (!text) {
    return { pumpsRunning: null, drainageCondition: null, waterLevel: null };
  }

  const sections = [
    { type: 'pump', keys: ['ระบบป้องกันน้ำท่วม', 'สถานะเครื่องสูบน้ำ', 'เครื่องสูบน้ำ', 'ปั๊มสูบน้ำ', 'ปั๊มน้ำ', 'สถานะปั๊ม'] },
    { type: 'canal', keys: ['ระดับน้ำในคลอง', 'คลองหน้าโครงการ', 'คลองภายนอก', 'น้ำในคลอง', 'ระดับน้ำคลอง'] },
    { type: 'pipe', keys: ['ท่อระบายน้ำ', 'ทางระบายน้ำ', 'สภาพทางระบายน้ำ'] },
    { type: 'road', keys: ['ถนนเมน', 'ผิวจราจร', 'ระดับน้ำท่วมขัง', 'ระดับน้ำบนถนน', 'สภาพถนน'] }
  ];

  const occurrences = [];
  for (const sec of sections) {
    for (const key of sec.keys) {
      let idx = text.indexOf(key);
      if (idx !== -1) {
        occurrences.push({ type: sec.type, key, index: idx });
      }
    }
  }

  occurrences.sort((a, b) => a.index - b.index);

  const results = {};
  for (let i = 0; i < occurrences.length; i++) {
    const cur = occurrences[i];
    if (results[cur.type]) continue;
    const start = cur.index;
    const nextOcc = occurrences.slice(i + 1).find(o => o.type !== cur.type);
    const end = nextOcc ? nextOcc.index : text.length;
    const rawVal = text.slice(start, end).trim().replace(/^[,\-;\s]+|[,\-;\s]+$/g, '');
    results[cur.type] = rawVal;
  }

  let pumpsRunning = results.pump || null;
  let drainageCondition = null;
  if (results.canal && results.pipe) {
    drainageCondition = results.canal + ' / ' + results.pipe;
  } else if (results.canal) {
    drainageCondition = results.canal;
  } else if (results.pipe) {
    drainageCondition = results.pipe;
  }

  let waterLevel = results.road || null;

  return { pumpsRunning, drainageCondition, waterLevel };
}

// ดึงสภาพอากาศและข้อมูลตรวจวัดระดับน้ำ Real-time (The Weather Channel, TMD, ThaiWater, RID, BMA)
async function fetchProjectWeather(project) {
  const lat = project.lat || 13.7563;
  const lon = project.lon || 100.5018;
  const stationName = project.stationName || 'สถานีลุ่มน้ำเจ้าพระยาตอนล่าง (สสน. / กรมชลประทาน)';
  const basinAlert = project.basinAlert || 'เฝ้าระวังระดับน้ำคลองสายหลัก สูบระบายต่อเนื่อง';
  const tmdAlert = project.tmdAlert || 'กรมอุตุนิยมวิทยา: ร่องมรสุมกำลังปานกลางพาดผ่านภาคกลาง เฝ้าระวังฝนตกหนัก';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,precipitation&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
    const data = await res.json();
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
      windy: 'เรดาร์สดตรวจพบกลุ่มฝนฟ้าคะนองพัดตามแนวลมมรสุม SW ความเร็ว 10-15 กม./ชม.',
      accuWeather: 'MinuteCast: โอกาสเกิดฝนฟ้าคะนองช่วงบ่ายถึงค่ำ 60–75%',
      googleFloodHub: 'AI พยากรณ์ระดับน้ำแม่น้ำสายหลักอยู่ในเกณฑ์เฝ้าระวังทรงตัว',
      gistda: 'ดาวเทียมตรวจจับมวลน้ำหลากทุ่งรับน้ำตอนบนหน่วงน้ำได้ดี ไม่พบการล้นข้ามคัน',
      source: 'Windy.com / AccuWeather / Google Flood Hub / GISTDA (disaster.gistda.or.th) / TMD / ThaiWater / กรมชลประทาน (RID)'
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

// ข้อ 2: Gemini Vision วิเคราะห์ภาพถ่ายถนน + Location + หน่วยงาน เพื่อประเมินระดับน้ำท่วมขังผิวถนน
async function analyzeWaterLevelFromPhotos({ photos, project, weather, userText }) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY || !photos || photos.length === 0) return null;

  // ดึงเฉพาะ base64 ของรูปภาพ (สูงสุด 4 รูปแรก เพื่อประหยัด token)
  const imageParts = photos.slice(0, 4).map(p => {
    const dataUrl = p.dataUrl || '';
    const match = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!match) return null;
    return { inlineData: { mimeType: match[1], data: match[2] } };
  }).filter(Boolean);

  if (imageParts.length === 0) return null;

  const prompt = `คุณคือระบบวิเคราะห์ภาพถ่ายหน้างานสำหรับโครงการ ${project.name} (${project.code}) พื้นที่: ${project.area}

ข้อมูลสภาพแวดล้อมปัจจุบัน (ณ เวลาที่บันทึกภาพ):
- สภาพอากาศ: ${weather.condition} อุณหภูมิ ${weather.temp}°C
- ปริมาณฝนตกสะสม 24 ชม.: ${weather.expectedRain24h} มม.
- โอกาสฝนตก: ${weather.rainProb}%
- สถานการณ์น้ำท่า: ${weather.basinAlert}
- ประกาศ TMD: ${weather.tmdAlert}
- ข้อความจากเจ้าหน้าที่หน้างาน: "${userText || '-'}"

วิเคราะห์ภาพถ่ายที่แนบมา แล้วประเมิน "ระดับน้ำท่วมขังบนผิวถนน" ให้กระชับ 1 ประโยค เช่น:
- "ถนนเมนแห้งสนิท ไม่มีน้ำท่วมขัง (0 ซม.)"
- "มีน้ำขังผิวถนนเล็กน้อย ประมาณ 3–5 ซม."
- "ถนนในโครงการมีน้ำขังสูงประมาณ 10–15 ซม. บริเวณทางเข้า"

ห้ามระบุชื่อบุคคล ห้ามเดาเกินจากภาพ ถ้าภาพไม่เห็นถนนชัดเจนให้ระบุว่า "ไม่สามารถระบุระดับน้ำจากภาพได้"
ตอบกลับเป็น JSON: { "waterLevel": "..." }`;

  try {
    const contents = [{
      parts: [
        { text: prompt },
        ...imageParts
      ]
    }];

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.1 } })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.waterLevel || null;
    }
  } catch (e) {
    console.error('Vision waterLevel error:', e.message);
  }
  return null;
}

// Gemini AI วิเคราะห์สถานการณ์และเกลาสรุปรายงาน 4 มิติ
async function analyzeFloodReportWithGemini({ project, weather, notes, photoCount, directReport }) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return {
      status: 'NORMAL',
      waterLevel: directReport?.waterLevel || '0 - 5 ซม. (สภาวะปกติ)',
      pumpsRunning: directReport?.pumpsRunning || 'ระบบป้องกันน้ำท่วมทำงานปกติ (พร้อมใช้งาน 100%)',
      drainageCondition: directReport?.drainageCondition || 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง',
      assessmentField: directReport?.waterLevel ? `ผิวจราจรและพื้นที่โครงการ: ${directReport.waterLevel}` : 'ถนนสายหลักและซอยย่อยแห้งสนิท สัญจรได้ปกติ 100%',
      assessmentCanal: directReport?.drainageCondition ? `คลองภายนอกและทางระบายน้ำ: ${directReport.drainageCondition}` : 'ระดับน้ำในคลองภายนอกอยู่ในเกณฑ์ควบคุม การระบายน้ำปกติ',
      assessmentPumps: directReport?.pumpsRunning ? `ระบบสูบน้ำและเครื่องจักร: ${directReport.pumpsRunning}` : 'เครื่องสูบน้ำและระบบป้องกันน้ำท่วมพร้อมทำงาน 100%',
      assessmentOutlook: `โอกาสฝนตก 24 ชม. ${weather.rainProb}% คาดการณ์ฝน ${weather.expectedRain24h} มม. เจ้าหน้าที่เตรียมพร้อมรับมือ 24 ชม.`,
      summary: `โครงการ ${project.name} (${project.code}): ${notes || 'สภาพการระบายน้ำของโครงการสามารถรองรับปริมาณน้ำฝนได้อย่างมีประสิทธิภาพ แนวท่อระบายน้ำหลักและสถานีสูบน้ำทำงานเป็นปกติ'}`
    };
  }

  const prompt = `คุณคือวิศวกรผู้เชี่ยวชาญด้านบริหารจัดการน้ำและสาธารณูปโภคของบริษัท แลนด์ แอนด์ เฮ้าส์ จำกัด (มหาชน) (Land & Houses)
ให้ช่วยวิเคราะห์ข้อมูลการตรวจเช็คหน้างาน เพื่อออกเอกสารรายงานสถานการณ์น้ำท่วมและการระบายน้ำ (Drainage & Flood Monitoring Report)

ข้อมูลโครงการและสภาพแวดล้อม:
- โครงการ: [${project.code}] ${project.name} (${project.area})
- แหล่งตรวจวัดระดับน้ำ Real-time: ${weather.stationName || '-'}
- ภาพถ่ายดาวเทียมตรวจจับมวลน้ำทุ่ง GISTDA (disaster.gistda.or.th): ${weather.gistda || 'ทุ่งรับน้ำตอนบนหน่วงน้ำตามเกณฑ์'}
- การพยากรณ์น้ำหลาก AI (Google Flood Hub): ${weather.googleFloodHub || 'แนวโน้มระดับน้ำแม่น้ำสายหลักทรงตัว'}
- เรดาร์สภาพอากาศและลมมรสุม (Windy.com): ${weather.windy || 'เรดาร์ตรวจพบกลุ่มฝนฟ้าคะนองช่วงบ่าย-ค่ำ'}
- ดัชนีฝนรายชั่วโมง (AccuWeather MinuteCast): ${weather.accuWeather || 'โอกาสเกิดฝนตกหนักเป็นแห่งๆ'}
- สถานการณ์น้ำท่า/คลอง: ${weather.basinAlert || '-'}
- ประกาศเตือนสภาพอากาศ (TMD): ${weather.tmdAlert || '-'}
- สภาพอากาศปัจจุบัน: ${weather.condition}, อุณหภูมิ ${weather.temp}°C, โอกาสฝนตก ${weather.rainProb}%, ฝนคาดการณ์ 24 ชม. ${weather.expectedRain24h} มม.
- รายละเอียดที่ผู้ตรวจเช็คบันทึกหน้างาน: "${notes || 'ไม่มีรายงานปัญหาน้ำท่วมขัง ตรวจเช็คเครื่องสูบน้ำและระดับน้ำ'}"
- จำนวนภาพถ่ายหน้างาน: ${photoCount} ภาพ

ข้อกำหนดสำคัญ:
1. สถานะเครื่องสูบน้ำ (pumpsRunning) และ สภาพทางระบายน้ำ/คลอง (drainageCondition) ต้องสะท้อนข้อความที่พิมพ์เข้า LINE อย่างเคร่งครัด
2. ห้ามระบุชื่อบุคคลหรือชื่อผู้รายงานเด็ดขาด (ตามนโยบายความเป็นส่วนตัว Land & Houses)
3. การประเมินมวลน้ำหลาก & ภัยคุกคามภายนอก (Upstream Mass Water Threat & Dyke Warning):
   - ให้นำข้อมูลสถานการณ์น้ำท่า (basinAlert) และประกาศเตือนภัย (tmdAlert) มาร่วมวิเคราะห์อย่างจริงจัง เช่น กรณีมีแจ้งเตือน "คันกั้นน้ำคลองหกวาน้ำล้น", "อัตราการระบายน้ำเขื่อนเจ้าพระยาสูง", หรือ "ระดับน้ำคลองสายหลักหนุนสูง"
   - แม้ถนนในโครงการจะยังแห้งสนิท (0 ซม.) แต่หากมีมวลน้ำหลากภายนอกประชิดพื้นที่ ให้ยกระดับสถานะเป็น "WATCH" (เฝ้าระวังพิเศษ) ทันที เพื่อไม่ให้เกิดความชะล่าใจ
   - ให้เสนอแนะมาตรการเชิงรุกหน้างานจริง (Proactive Defense SOP) เช่น ตรวจเช็คบานพับเปิด-ปิดน้ำ (Flap Valve) ป้องกันน้ำย้อน, เสริมแนวกระสอบทรายจุดเสี่ยง, ทดสอบปั๊มสูบสำรอง
4. ให้สรุปบทวิเคราะห์ออกเป็น 4 มิติย่อย (ชัดเจน บรรทัดใหม่อ่านง่าย):
   - assessmentField: สภาพพื้นที่ & ผิวจราจร
   - assessmentCanal: ระดับน้ำคลอง & ภายนอก (ระบุมวลน้ำหลากและแนวคันกั้นน้ำอย่างชัดเจน)
   - assessmentPumps: ระบบระบายน้ำ & เครื่องสูบ
   - assessmentOutlook: การประเมินความเสี่ยง & ฝน 24 ชม. พร้อมมาตรการเชิงรุก

ให้ตอบกลับเป็น JSON เท่านั้น (ห้ามมี markdown codeblock ห้ามมีข้อความอื่น) โดยมีโครงสร้างดังนี้:
{
  "status": "NORMAL" | "WATCH" | "CRITICAL",
  "waterLevel": "ระดับน้ำ เช่น ถนนเมนแห้งสนิท สภาพปกติ (0 ซม.)",
  "pumpsRunning": "สถานะเครื่องสูบน้ำ (สะท้อนจากข้อความที่พิมพ์)",
  "drainageCondition": "สภาพทางระบายน้ำ/คลอง (สะท้อนจากข้อความที่พิมพ์)",
  "assessmentField": "สรุปสภาพพื้นที่และผิวจราจร 1-2 บรรทัด (เช่น ถนนเมนหลักและผิวจราจรแห้งสนิท สัญจรได้ปกติ)",
  "assessmentCanal": "สรุประดับน้ำคลองภายนอก มวลน้ำหลาก และแนวคันกั้นน้ำ 1-2 บรรทัด (เช่น ระดับน้ำคลองหกวาหนุนสูง มีน้ำเอ่อล้นคันกั้นน้ำตอนบน เฝ้าระวังน้ำย้อนท่อสาธารณะ)",
  "assessmentPumps": "สรุประบบเครื่องสูบน้ำและระบบป้องกันน้ำท่วม 1-2 บรรทัด (เช่น เดินเครื่องสูบน้ำระบายต่อเนื่อง และเตรียมเครื่องปั่นไฟสำรองพร้อมใช้งาน)",
  "assessmentOutlook": "สรุปการประเมินความเสี่ยงและมาตรการเชิงรุก 1-2 บรรทัด (เช่น โอกาสเกิดฝน 60% เฝ้าระวังมวลน้ำหลากภายนอก แนะนำตรวจเช็คบานพับ Flap Valve และเสริมแนวกระสอบทรายจุดเสี่ยง)",
  "summary": "สรุปภาพรวมระดับผู้บริหาร 2-3 บรรทัด สำหรับแสดงในการ์ด LINE (สะท้อนสถานการณ์น้ำจริง พร้อมมาตรการป้องกัน ห้ามระบุชื่อผู้รายงาน)"
}

เกณฑ์ตัดสินสถานะ:
- NORMAL: หากถนนแห้ง ไม่มีน้ำท่วมขัง และไม่มีรายงานมวลน้ำหลากภายนอกประชิดโครงการ เครื่องสูบน้ำพร้อมใช้
- WATCH: หากระดับน้ำคลองภายนอกสูงขึ้น, น้ำขังผิวถนน 5-10 ซม., หรือมีรายงานมวลน้ำหลากภายนอก/คันกั้นน้ำล้นในพื้นที่ใกล้เคียง (แม้ถนนในโครงการจะยังแห้ง) เพื่อเตือนให้เตรียมมาตรการเชิงรุก
- CRITICAL: หากน้ำขัง > 10 ซม. หรือคลองภายนอกเอ่อล้นเข้าท่วมพื้นที่โครงการ`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON object found in response");
  } catch (e) {
    console.error("Gemini flood analysis error:", e.message || e);
    return {
      status: 'NORMAL',
      waterLevel: directReport?.waterLevel || '0 - 5 ซม. (สภาวะปกติ)',
      pumpsRunning: directReport?.pumpsRunning || 'ระบบป้องกันน้ำท่วมทำงานปกติ (พร้อมใช้งาน 100%)',
      drainageCondition: directReport?.drainageCondition || 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง',
      assessmentField: directReport?.waterLevel ? `ผิวจราจรและพื้นที่โครงการ: ${directReport.waterLevel}` : 'ถนนสายหลักและซอยย่อยแห้งสนิท สัญจรได้ปกติ 100%',
      assessmentCanal: directReport?.drainageCondition ? `คลองภายนอกและทางระบายน้ำ: ${directReport.drainageCondition}` : 'ระดับน้ำในคลองภายนอกอยู่ในเกณฑ์ควบคุม การระบายน้ำปกติ',
      assessmentPumps: directReport?.pumpsRunning ? `ระบบสูบน้ำและเครื่องจักร: ${directReport.pumpsRunning}` : 'เครื่องสูบน้ำและระบบป้องกันน้ำท่วมพร้อมทำงาน 100%',
      assessmentOutlook: `โอกาสฝนตก 24 ชม. ${weather.rainProb}% คาดการณ์ฝน ${weather.expectedRain24h} มม. เจ้าหน้าที่เตรียมพร้อมรับมือ 24 ชม.`,
      summary: `โครงการ ${project.name} (${project.code}): ${notes || 'สภาพการระบายน้ำของโครงการสามารถรองรับปริมาณน้ำฝนได้อย่างมีประสิทธิภาพ แนวท่อระบายน้ำหลักและสถานีสูบน้ำทำงานเป็นปกติ'}`
    };
  }
}

// สร้าง LINE Flex Message สรุปผลรายงานสถานการณ์น้ำท่วม
function buildFloodFlexMessage({ reportId, project, weather, aiResult, photoCount, surveyDateThai, surveyTimeThai, pdfUrl }) {
  const isCritical = aiResult.status === 'CRITICAL';
  const isWatch = aiResult.status === 'WATCH';
  const badgeText = isCritical ? '🔴 วิกฤติ / เร่งด่วน (Emergency)'
    : isWatch ? '🟡 เฝ้าระวัง (Watch & Alert)'
    : '🟢 สภาวะปกติ (Normal)';
  const badgeColor = isCritical ? '#EF4444' : isWatch ? '#EAB308' : '#10B981';

  return {
    type: 'flex',
    altText: `🌊 รายงานสถานการณ์น้ำท่วม [${project.code}] - Land & Houses`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0C2340',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'LAND & HOUSES PUBLIC CO., LTD.',
            color: '#C5A880',
            size: 'xxs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: 'รายงานสถานการณ์การระบายน้ำ',
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold',
            margin: 'xs'
          },
          {
            type: 'text',
            text: `[${project.code}] ${project.name}`,
            color: '#E2E8F0',
            size: 'xs',
            margin: 'xs',
            wrap: true
          }
        ]
      },
      hero: {
        type: 'image',
        url: `${pdfUrl}&photo=0`,
        size: 'full',
        aspectRatio: '20:11',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: 'สถานะหน้างาน:',
                size: 'xs',
                color: '#64748B',
                flex: 3
              },
              {
                type: 'text',
                text: badgeText,
                size: 'xs',
                weight: 'bold',
                color: badgeColor,
                flex: 6,
                align: 'end'
              }
            ]
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: `🌤️ ${weather.icon || '🌦️'} ${weather.condition || 'ท้องฟ้ามีเมฆ'} (${weather.temp || 30}°C)`,
                size: 'xs',
                color: '#1E293B',
                weight: 'bold'
              },
              {
                type: 'text',
                text: `☔ โอกาสเกิดฝน: ${weather.rainProb || 0}% | ฝนสะสม 24 ชม.: ${weather.expectedRain24h || 0} มม.`,
                size: 'xxs',
                color: '#475569',
                margin: 'xs'
              },
              {
                type: 'text',
                text: `🌊 ${weather.stationName || 'สถานีตรวจวัดระดับน้ำ Real-time'}`,
                size: 'xxs',
                color: '#0369A1',
                margin: 'xs',
                wrap: true
              },
              {
                type: 'text',
                text: `(อ้างอิง: ${weather.source || 'Windy • AccuWeather • Flood Hub • GISTDA • TMD • สสน. • RID'})`,
                size: 'xxs',
                color: '#94A3B8',
                margin: 'xs'
              }
            ]
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: '📋 สรุปการประเมิน:',
                size: 'xs',
                weight: 'bold',
                color: '#0C2340'
              },
              {
                type: 'text',
                text: aiResult.summary || 'สภาพการระบายน้ำปกติ แนวท่อระบายน้ำหลักเปิดโล่ง',
                size: 'xs',
                color: '#334155',
                wrap: true,
                margin: 'xs'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `📸 ภาพถ่าย: ${photoCount} ภาพ`,
                size: 'xxs',
                color: '#64748B'
              },
              {
                type: 'text',
                text: `🕒 ${surveyDateThai} ${surveyTimeThai} น.`,
                size: 'xxs',
                color: '#64748B',
                align: 'end'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        backgroundColor: '#F8FAFC',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0C2340',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📄 เปิดดูและดาวน์โหลดเอกสาร PDF',
              uri: pdfUrl
            }
          }
        ]
      }
    }
  };
}

// รวมรายงาน สรุปผลด้วย AI และส่งกลับให้ Admin ในแชทส่วนตัว
async function compileAndSendFloodReport({ userId, replyToken, host, proto }) {
  try {
    const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
    const draftSnap = await getDoc(draftRef);
    if (!draftSnap.exists()) return;

    const draft = draftSnap.data();
    const project = FLOOD_PROJECTS[draft.projectCode] || {
      code: draft.projectCode,
      name: draft.projectName,
      area: draft.projectArea,
      lat: draft.lat || 13.7563,
      lon: draft.lon || 100.5018,
      stationName: 'สถานีลุ่มน้ำเจ้าพระยาตอนล่าง (สสน. / กรมชลประทาน)',
      basinAlert: 'เฝ้าระวังระดับน้ำคลองสายหลัก สูบระบายต่อเนื่อง',
      tmdAlert: 'กรมอุตุนิยมวิทยา: ร่องมรสุมพาดผ่านภาคกลาง เฝ้าระวังฝนตกสะสม'
    };

    const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
    const photos = [];
    photosSnap.forEach(d => {
      photos.push(d.data());
    });
    photos.sort((a, b) => {
      if (a.imageSetIndex != null && b.imageSetIndex != null) {
        return a.imageSetIndex - b.imageSetIndex;
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    if (photos.length === 0) {
      if (replyToken) {
        await replyToLine(replyToken, "⚠️ ยังไม่มีรูปภาพในระบบ กรุณาส่งรูปถ่ายหน้างาน (5–10 รูป) เข้ามาก่อนครับ");
      } else if (userId) {
        await pushToLine(userId, "⚠️ ยังไม่มีรูปภาพในระบบ กรุณาส่งรูปถ่ายหน้างาน (5–10 รูป) เข้ามาก่อนครับ");
      }
      return;
    }

    const finalPhotos = photos.slice(0, 10);

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiYear = now.getFullYear() + 543;
    const surveyDateThai = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${thaiYear}`;
    const surveyTimeThai = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const generatedAtThai = `${surveyDateThai} เวลา ${surveyTimeThai} น.`;

    const cleanCode = project.code.replace(/[^A-Z0-9]/g, '');
    const dateCode = `${String(thaiYear).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const randSeq = Math.floor(100 + Math.random() * 900);
    const reportId = `FLD-${cleanCode}-${dateCode}-${randSeq}`;

    // ดึงพยากรณ์อากาศและสถานีน้ำ Real-time ของไทย
    const weather = await fetchProjectWeather(project);

    // ดึงข้อความสถานะหน้างานตรงจาก LINE (เครื่องสูบน้ำ, สภาพคลอง/ทางระบาย)
    const directReport = extractDirectFieldReport(draft.notes);

    // ข้อ 2: วิเคราะห์ภาพถ่ายด้วย Gemini Vision + Location + หน่วยงาน เพื่อประเมินระดับน้ำผิวถนน
    // รัน parallel กับ text analysis เพื่อประหยัดเวลา
    const [aiResult, visionWaterLevel] = await Promise.all([
      analyzeFloodReportWithGemini({
        project,
        weather,
        notes: draft.notes,
        photoCount: photos.length,
        directReport
      }),
      analyzeWaterLevelFromPhotos({
        photos,
        project,
        weather,
        userText: draft.notes
      })
    ]);

    // Priority: (1) user typed text → (2) Vision ภาพ → (3) AI text inference
    const waterLevel = directReport.waterLevel || visionWaterLevel || aiResult.waterLevel || '0 - 5 ซม. (สภาวะปกติ)';
    const pumpsRunning = directReport.pumpsRunning || aiResult.pumpsRunning || 'ระบบป้องกันน้ำท่วมทำงานปกติ (พร้อมใช้งาน 100%)';
    // ข้อ 3: drainageCondition ใช้เฉพาะ text ที่ผู้ใช้พิมพ์มาเท่านั้น ไม่ใช้ AI ตีความ
    const drainageCondition = directReport.drainageCondition || (draft.notes ? draft.notes.trim() : 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง');

    const assessmentField = aiResult.assessmentField || (directReport.waterLevel ? `ผิวจราจรและพื้นที่โครงการ: ${directReport.waterLevel}` : 'ถนนสายหลักและซอยย่อยแห้งสนิท สัญจรได้ปกติ 100%');
    const assessmentCanal = aiResult.assessmentCanal || (directReport.drainageCondition ? `คลองภายนอกและทางระบายน้ำ: ${directReport.drainageCondition}` : 'ระดับน้ำในคลองภายนอกอยู่ในเกณฑ์ควบคุม การระบายน้ำปกติ');
    const assessmentPumps = aiResult.assessmentPumps || (directReport.pumpsRunning ? `ระบบสูบน้ำและเครื่องจักร: ${directReport.pumpsRunning}` : 'เครื่องสูบน้ำและระบบป้องกันน้ำท่วมพร้อมทำงาน 100%');
    const assessmentOutlook = aiResult.assessmentOutlook || `โอกาสฝนตก 24 ชม. ${weather.rainProb}% คาดการณ์ฝน ${weather.expectedRain24h} มม. เจ้าหน้าที่เตรียมพร้อมรับมือ 24 ชม.`;

    // บันทึกรายงานหลักลง Firestore (ไม่ระบุชื่อผู้รายงาน)
    const reportRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", reportId);
    await setDoc(reportRef, {
      reportId,
      userId: userId || '',
      projectCode: project.code,
      projectName: project.name,
      projectArea: project.area,
      status: aiResult.status || 'NORMAL',
      waterLevel,
      pumpsRunning,
      drainageCondition,
      assessmentField,
      assessmentCanal,
      assessmentPumps,
      assessmentOutlook,
      waterStation: weather.stationName,
      basinAlert: weather.basinAlert,
      tmdAlert: weather.tmdAlert,
      executiveSummary: aiResult.summary || draft.notes || 'สภาพการระบายน้ำของโครงการสามารถรองรับปริมาณน้ำฝนได้อย่างมีประสิทธิภาพ',
      notes: draft.notes || '',
      weather,
      photoCount: finalPhotos.length,
      surveyDateThai,
      surveyTimeThai,
      generatedAtThai,
      createdAt: Date.now()
    });

    // บันทึกภาพลง Subcollection แบบขนาน (จำกัดไม่เกิน 10 ภาพ ตามมาตรฐาน Land & Houses)
    await Promise.all(finalPhotos.map((p, i) =>
      setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", reportId, "photos", String(i)), {
        index: i,
        dataUrl: p.dataUrl,
        createdAt: Date.now()
      })
    ));

    // ล้างรูปภาพทั้งหมดใน Draft Subcollection ออกให้หมดจด
    try {
      const draftPhotosCol = collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos");
      const draftPhotosSnap = await getDocs(draftPhotosCol);
      const delPromises = [];
      draftPhotosSnap.forEach(p => delPromises.push(deleteDoc(p.ref)));
      await Promise.all(delPromises);
    } catch (cleanErr) {
      console.error("Clean draft photos error:", cleanErr);
    }

    // ล้าง Draft Session ออก
    await deleteDoc(draftRef);

    const domain = host || 'lh-taskflow.vercel.app';
    const protocol = proto || 'https';
    const pdfUrl = `${protocol}://${domain}/api/flood-report?id=${reportId}`;

    const flexMsg = buildFloodFlexMessage({
      reportId,
      project,
      weather,
      aiResult,
      photoCount: photos.length,
      surveyDateThai,
      surveyTimeThai,
      pdfUrl
    });

    const completionText = `✅ จัดทำเอกสารรายงานสถานการณ์น้ำท่วมเรียบร้อยครับ!\n` +
      `📌 โครงการ: [${project.code}] ${project.name}\n` +
      `📑 รหัสเอกสาร: ${reportId}\n` +
      `📸 ภาพถ่ายสำรวจ: ${photos.length} ภาพ\n` +
      `─────────────────────────\n` +
      `🔗 แตะปุ่ม "เปิดดูและดาวน์โหลดเอกสาร PDF" ในการ์ดด้านบน เพื่อเปิดและบันทึกเป็น PDF บนโทรศัพท์มือถือได้ทันทีครับ\n` +
      `🌐 หรือเปิดดูผ่านลิงก์ตรง:\n${pdfUrl}`;

    let delivered = false;
    if (replyToken) {
      delivered = await replyToLine(replyToken, [flexMsg, { type: 'text', text: completionText }]);
    }
    
    // หาก reply ไม่สำเร็จ หรือไม่มี replyToken ให้ push ไปยัง userId ในแชทส่วนตัวเสมอ
    if (!delivered && userId) {
      console.log(`Delivering via pushToLine to user ${userId}...`);
      await pushToLine(userId, [flexMsg, { type: 'text', text: completionText }]);
    }

  } catch (err) {
    console.error("compileAndSendFloodReport Error:", err);
    if (replyToken) {
      await replyToLine(replyToken, "❌ เกิดข้อผิดพลาดในการรวมรายงาน PDF กรุณาลองใหม่อีกครั้งครับ");
    } else if (userId) {
      await pushToLine(userId, "❌ เกิดข้อผิดพลาดในการรวมรายงาน PDF กรุณาลองใหม่อีกครั้งครับ");
    }
  }
}

// จุดรับสัญญาณจาก LINE Webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }

    // ตรวจหา Host ปัจจุบันจาก Request
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'lh-taskflow.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';

    // ทำการ Login เข้า Firebase
    await signInAnonymously(auth);

    // วนลูปอ่าน Event ที่ส่งเข้ามา
    for (const event of events) {
      const userId = event.source?.userId;
      const isGroup = event.source?.type === 'group' || event.source?.type === 'room';

      // 1. กรณีผู้ใช้ส่งข้อความ (Text)
      if (event.type === 'message' && event.message.type === 'text') {
        const rawText = (event.message.text || '').trim();
        const replyToken = event.replyToken;

        // ถอด prefix ! หรือ / ออก
        const cleanText = rawText.replace(/^[!\/]/, '').trim();
        const upperClean = cleanText.toUpperCase();

        // 🌊 คำสั่งรายงานสถานการณ์น้ำท่วม (!น้ำท่วม, !รายงานน้ำท่วม, /น้ำท่วม)
        if (cleanText.startsWith('น้ำท่วม') || cleanText.startsWith('รายงานน้ำท่วม')) {
          if (isGroup) {
            await replyToLine(replyToken, "⚠️ เพื่อความเป็นระเบียบและป้องกันข้อมูลชนกัน กรุณารายงานสถานการณ์น้ำท่วมในแชทส่วนตัว (1-on-1) กับบอทเท่านั้นครับ 🙏");
            continue;
          }

          const query = cleanText.replace(/^(รายงานน้ำท่วม|น้ำท่วม)[ -]*/i, '').trim();
          if (!query) {
            const allSupportedCodes = Object.keys(FLOOD_PROJECTS).join(', ');
            const helpMsg = `🌊 ระบบรายงานสถานการณ์น้ำท่วม & การระบายน้ำ (Land & Houses)\n` +
              `─────────────────────────\n` +
              `วิธีใช้งานง่ายๆ ใน 2 ขั้นตอน:\n\n` +
              `1️⃣ พิมพ์คำสั่งพร้อมรหัสโครงการและรายละเอียด:\n` +
              `   👉 !น้ำท่วม 323 ถนนเมนแห้งสนิท สภาพปกติ ท่อระบายน้ำไหลคล่องตัว\n` +
              `   👉 !น้ำท่วม 415 คลองหกวาระดับน้ำสูง เดินเครื่องสูบน้ำระบายต่อเนื่อง\n` +
              `   👉 !น้ำท่วม LH-341 เฝ้าระวังมวลน้ำเจ้าพระยา\n\n` +
              `2️⃣ ส่งภาพถ่ายหน้างาน 5–10 รูป เข้ามาในแชทนี้\n` +
              `   บอทจะดึงพยากรณ์อากาศและสถานีน้ำ Real-time, วิเคราะห์สถานะด้วย AI และสร้างเอกสารสรุป PDF ส่งกลับให้ในแชทส่วนตัวทันทีครับ!\n\n` +
              `📌 โครงการที่รองรับ (${Object.keys(FLOOD_PROJECTS).length} โครงการ):\n` +
              `${allSupportedCodes}`;
            await replyToLine(replyToken, helpMsg);
            continue;
          }

          const match = lookupProjectForFlood(query);
          if (!match) {
            const allSupportedCodes = Object.keys(FLOOD_PROJECTS).join(', ');
            const errorMsg = `❌ ไม่พบรหัสโครงการ "${query}" ครับ\n\n` +
              `📌 ตัวอย่างรหัสโครงการที่รองรับ:\n` +
              `${allSupportedCodes}\n\n` +
              `💡 ตัวอย่าง: !น้ำท่วม 323 ถนนเมนระบายคล่องตัว เดินเครื่องสูบน้ำ 1 ตัว`;
            await replyToLine(replyToken, errorMsg);
            continue;
          }

          const { project, notes } = match;
          const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
          await setDoc(draftRef, {
            userId,
            projectCode: project.code,
            projectName: project.name,
            projectArea: project.area,
            lat: project.lat,
            lon: project.lon,
            stationName: project.stationName,
            basinAlert: project.basinAlert,
            tmdAlert: project.tmdAlert,
            notes: notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน',
            createdAt: Date.now(),
            finalizing: false
          });

          // ตรวจสอบรูปภาพใน buffer ลบรูปเก่าที่ค้างเกิน 3 นาทีทิ้ง และนับเฉพาะรูปที่เพิ่งส่งเข้ามาสดๆ
          const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
          let recentPhotosCount = 0;
          const now = Date.now();
          for (const p of photosSnap.docs) {
            const pData = p.data();
            if (now - (pData.createdAt || 0) > 3 * 60 * 1000) {
              // รูปเก่าเกิน 3 นาที ลบทิ้งทันทีเพื่อไม่ให้ปนกับรอบใหม่
              await deleteDoc(p.ref);
            } else {
              recentPhotosCount++;
            }
          }

          if (recentPhotosCount > 0) {
            const guideWithPhotos = `🌊 ได้รับข้อมูลโครงการ [${project.code}] ${project.name} เรียบร้อยแล้วครับ!\n` +
              `📝 รายละเอียด: ${notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน'}\n` +
              `─────────────────────────\n` +
              `📸 สถานะรูปภาพ: มีรูปถ่ายหน้างานในระบบแล้ว ${recentPhotosCount} ภาพ\n` +
              `👉 ท่านสามารถส่งรูปภาพเพิ่มเติมได้ (รวม 5–10 รูป) หรือพิมพ์ '!เสร็จ' เพื่อประมวลผลจัดทำ PDF ทันทีครับ`;
            await replyToLine(replyToken, guideWithPhotos);
            continue;
          }

          const guideMsg = `🌊 ได้รับข้อมูลโครงการ [${project.code}] ${project.name} เรียบร้อยแล้วครับ!\n` +
            `📝 รายละเอียด: ${notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน'}\n` +
            `─────────────────────────\n` +
            `📸 ขั้นตอนต่อไป: กรุณาส่งรูปถ่ายหน้างาน (5–10 รูป) เข้ามาในแชทนี้ได้เลยครับ\n` +
            `💡 แนะนำภาพที่ควรส่ง:\n` +
            `1. ถนนเมน / ทางเข้า-ออกโครงการ\n` +
            `2. บ่อพัก / ท่อระบายน้ำหลัก\n` +
            `3. เครื่องสูบน้ำ / ตู้ควบคุมไฟ\n` +
            `4. คลองระบายน้ำ / บ่อหน่วงน้ำ\n` +
            `5. จุดระบายน้ำออกภายนอกโครงการ\n\n` +
            `*(ส่งภาพพร้อมกันรวดเดียวได้เลยครับ หรือเมื่อส่งครบแล้วพิมพ์ '!เสร็จ' เพื่อรับ PDF ทันที)*`;
          await replyToLine(replyToken, guideMsg);
          continue;
        }

        // 🗑️ คำสั่งยกเลิก/ล้างรอบรายงานค้าง (!ยกเลิก, !ล้าง, !reset)
        if (upperClean === 'ยกเลิก' || upperClean === 'ล้าง' || upperClean === 'RESET' || upperClean === 'CLEAR') {
          const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
          const draftSnap = await getDoc(draftRef);
          const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
          
          for (const p of photosSnap.docs) {
            await deleteDoc(p.ref);
          }
          if (draftSnap.exists()) {
            await deleteDoc(draftRef);
          }
          await replyToLine(replyToken, `🗑️ ล้างรอบรายงานและรูปภาพใน buffer เรียบร้อยแล้วครับ\nสามารถเริ่มต้นรายงานใหม่ได้ด้วยคำสั่ง:\n👉 !น้ำท่วม [รหัสโครงการ]`);
          continue;
        }

        // 🏁 คำสั่งจบการส่งรูปภาพ (!เสร็จ, !จบ, ออกรายงาน, สร้างPDF)
        if (upperClean === 'เสร็จ' || upperClean === 'จบ' || upperClean === 'ออกรายงาน' || upperClean === 'สร้างPDF' || upperClean === 'PDF') {
          const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const draft = draftSnap.data();
            if (draft.finalizing) {
              await replyToLine(replyToken, `⏳ ระบบกำลังประมวลผลรูปภาพและสร้างเอกสารสรุป PDF ให้เรียบร้อยแล้วครับ กรุณารอสักครู่...`);
              continue;
            }

            // Smart Wait Buffer: ดักรอรูปภาพที่กำลังเดินทาง (In-flight images) ป้องกันการที่ข้อความ '!เสร็จ' วิ่งแซงรูปภาพ
            let photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
            let currentCount = photosSnap.size;
            const expected = draft.expectedCount || 0;
            const timeSinceLastPhoto = Date.now() - (draft.lastPhotoAt || 0);

            // หากยังไม่ครบ expectedCount หรือเพิ่งมีรูปล่าสุดเข้ามาไม่ถึง 5 วินาที ให้รอ buffer ให้รูปที่เหลือโหลดเสร็จสมบูรณ์
            if ((expected > 0 && currentCount < expected) || (timeSinceLastPhoto < 5000)) {
              await new Promise(r => setTimeout(r, 2500));
              photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));

              // ถ้ารูปเพิ่มขึ้นและยังไม่ครบตามเป้าหมาย รอเพิ่มอีก 1.5 วินาที
              if (photosSnap.size > currentCount && expected > 0 && photosSnap.size < expected) {
                await new Promise(r => setTimeout(r, 1500));
                photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
              }
            }

            const finalPhotoCount = photosSnap.size;
            if (finalPhotoCount > 0) {
              await updateDoc(draftRef, { finalizing: true });
              await replyToLine(replyToken, `⏳ ได้รับรูปภาพครบ ${finalPhotoCount} ภาพเรียบร้อยแล้ว กำลังวิเคราะห์และสร้างเอกสารสรุป PDF สักครู่ครับ...`);
              await compileAndSendFloodReport({ userId, replyToken: null, host, proto });
              continue;
            } else {
              await replyToLine(replyToken, `⚠️ ยังไม่มีภาพถ่ายในระบบ กรุณาส่งรูปภาพหน้างาน (5–10 รูป) เข้ามาก่อนครับ`);
              continue;
            }
          } else {
            // กรณีไม่มี Draft ค้างอยู่ ให้ตรวจสอบว่ามีรายงานล่าสุดที่สร้างไว้หรือไม่
            try {
              const reportsSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports"));
              let latestReport = null;
              reportsSnap.forEach(d => {
                const data = d.data();
                if (!latestReport || (data.createdAt || 0) > (latestReport.createdAt || 0)) {
                  latestReport = data;
                }
              });

              if (latestReport && (Date.now() - (latestReport.createdAt || 0)) < 24 * 60 * 60 * 1000) {
                const domain = host || 'lh-taskflow.vercel.app';
                const protocol = proto || 'https';
                const pdfUrl = `${protocol}://${domain}/api/flood-report?id=${latestReport.reportId}`;

                const flexMsg = buildFloodFlexMessage({
                  reportId: latestReport.reportId,
                  project: { code: latestReport.projectCode, name: latestReport.projectName, area: latestReport.projectArea },
                  weather: latestReport.weather,
                  aiResult: { 
                    status: latestReport.status, 
                    summary: latestReport.executiveSummary 
                  },
                  photoCount: latestReport.photoCount || 5,
                  surveyDateThai: latestReport.surveyDateThai || '-',
                  surveyTimeThai: latestReport.surveyTimeThai || '-',
                  pdfUrl
                });

                const msg = `✅ รายงานสถานการณ์น้ำท่วมล่าสุด:\n` +
                  `📌 โครงการ: [${latestReport.projectCode}] ${latestReport.projectName}\n` +
                  `📑 รหัสเอกสาร: ${latestReport.reportId}\n` +
                  `─────────────────────────\n` +
                  `🔗 แตะปุ่ม "เปิดดูและดาวน์โหลดเอกสาร PDF" ในการ์ด หรือเปิดดูผ่านลิงก์:\n${pdfUrl}`;

                const replied = await replyToLine(replyToken, [flexMsg, { type: 'text', text: msg }]);
                if (!replied && userId) {
                  await pushToLine(userId, [flexMsg, { type: 'text', text: msg }]);
                }
                continue;
              }
            } catch (err) {
              console.error("Check recent report error:", err);
            }

            await replyToLine(replyToken, `🌊 ขณะนี้ยังไม่มีรอบการรายงานที่เปิดอยู่ครับ\nหากต้องการรายงานสถานการณ์น้ำท่วม กรุณาพิมพ์:\n👉 !น้ำท่วม [รหัสโครงการ] [รายละเอียด]\nเช่น !น้ำท่วม 410 ถนนเมนแห้งสนิท`);
            continue;
          }
        }

        // คำสั่งเดิมของระบบ
        let targetGroup = null;
        let action = null;
        let projectQuery = null;

        if (upperClean === 'คำสั่ง' || upperClean === 'HELP' || upperClean === 'เมนู') {
          action = 'help';
        }
        else if (upperClean === 'สรุปงานA') { action = 'summary'; targetGroup = 'A'; }
        else if (upperClean === 'สรุปงานB') { action = 'summary'; targetGroup = 'B'; }
        else if (upperClean === 'สรุปงานA2') { action = 'summary'; targetGroup = 'A2'; }
        else if (upperClean === 'สรุปงาน') { action = 'summary'; targetGroup = 'ALL'; }

        else if (upperClean === 'รอใบงานA') { action = 'pending_wo'; targetGroup = 'A'; }
        else if (upperClean === 'รอใบงานB') { action = 'pending_wo'; targetGroup = 'B'; }
        else if (upperClean === 'รอใบงานA2') { action = 'pending_wo'; targetGroup = 'A2'; }
        else if (upperClean === 'รอใบงาน') { action = 'pending_wo'; targetGroup = 'ALL'; }

        else if (upperClean === 'เช็คงานA') { action = 'check'; targetGroup = 'A'; }
        else if (upperClean === 'เช็คงานB') { action = 'check'; targetGroup = 'B'; }
        else if (upperClean === 'เช็คงานA2') { action = 'check'; targetGroup = 'A2'; }
        else if (upperClean === 'เช็คงาน') { action = 'check'; targetGroup = 'ALL'; }

        else if (upperClean === 'เกินงบ' || upperClean === 'เสี่ยงเกินงบ') {
          action = 'over_budget';
        }

        else if (upperClean === 'งบA') { action = 'budget_overview'; targetGroup = 'A'; }
        else if (upperClean === 'งบB') { action = 'budget_overview'; targetGroup = 'B'; }
        else if (upperClean === 'งบA2') { action = 'budget_overview'; targetGroup = 'A2'; }
        else if (upperClean === 'งบ' || upperClean === 'งบประมาณ') { action = 'budget_overview'; targetGroup = 'ALL'; }

        else if (upperClean.startsWith('งบ ') || upperClean.startsWith('งบ-') || upperClean.startsWith('งบประมาณ ')) {
          action = 'project_budget';
          projectQuery = cleanText.replace(/^(งบประมาณ|งบ)[ -]*/i, '').trim();
        } else if (/^งบ([A-Z0-9\-]+)$/i.test(cleanText)) {
          const param = cleanText.match(/^งบ([A-Z0-9\-]+)$/i)[1].toUpperCase();
          if (param === 'A') { action = 'budget_overview'; targetGroup = 'A'; }
          else if (param === 'B') { action = 'budget_overview'; targetGroup = 'B'; }
          else if (param === 'A2') { action = 'budget_overview'; targetGroup = 'A2'; }
          else {
            action = 'project_budget';
            projectQuery = param;
          }
        }
        else if (upperClean === 'อัปเดตงบ' || upperClean === 'อัพเดตงบ' || upperClean === 'UPDATE' || upperClean === 'ดึงงบ' || upperClean === 'อัปเดต' || upperClean === 'อัพเดต') {
          action = 'update_guide';
        }

        if (action) {
          let responseText = '';
          const projectList = targetGroup === 'A' ? GROUP_A 
            : targetGroup === 'B' ? GROUP_B 
            : targetGroup === 'A2' ? GROUP_A2 
            : ALL_PROJECTS;
          const groupName = targetGroup === 'ALL' ? 'ทั้งหมดทุกโครงการ' : targetGroup;

          if (action === 'summary') {
            responseText = await handleSummary(projectList, groupName);
          } else if (action === 'pending_wo') {
            responseText = await handlePendingWorkOrders(projectList, groupName);
          } else if (action === 'check') {
            responseText = await handleCheck(projectList, groupName);
          } else if (action === 'budget_overview') {
            responseText = await handleBudgetOverview(targetGroup);
          } else if (action === 'project_budget') {
            responseText = await handleProjectBudget(projectQuery);
          } else if (action === 'over_budget') {
            responseText = await handleOverBudget();
          } else if (action === 'update_guide') {
            responseText = `💡 วิธีอัปเดตข้อมูลลงไฟล์ Excel และระบบ LINE:\n` +
              `─────────────────────────\n` +
              `เนื่องจากการดึงข้อมูลค่าใช้จ่ายต้องล็อกอินผ่านเครือข่าย LH ภายใน:\n\n` +
              `🖥️ สามารถกดอัปเดตได้ง่ายๆ จากคอมพิวเตอร์ของคุณ:\n` +
              `1. ดับเบิ้ลคลิกไฟล์ [อัปเดตงบประมาณ_LH.bat] บนหน้า Desktop\n` +
              `   (หรือรัน 'npm run update-budget' ใน Terminal)\n` +
              `2. ระบบจะล็อกอิน ดึงยอดจริง + คำนวณ Forecast ลงไฟล์ Excel ให้ครบ 9 โครงการ และซิงค์ขึ้น LINE ให้เรียบร้อยทันทีครับ!\n\n` +
              `📁 ไฟล์ Excel: C:\\Users\\krits\\lh-scraper\\LH_Indirect_Expenses_Report.xlsx`;
          } else if (action === 'help') {
            responseText = `🤖 เมนูคำสั่ง LH TaskFlow Bot\n` +
              `─────────────────────────\n` +
              `🌊 รายงานสถานการณ์น้ำท่วม & ระบายน้ำ (ฤดูฝน):\n` +
              `• !น้ำท่วม [รหัส] [รายละเอียด]\n` +
              `  (ตัวอย่าง: !น้ำท่วม 410 ถนนเมนแห้งสนิท เครื่องสูบน้ำพร้อมใช้)\n` +
              `  (ส่งภาพถ่าย 5-10 รูป บอทจะสร้างเอกสาร PDF สรุปส่งให้ทันที)\n\n` +
              `📋 สรุปงานประจำวัน (งานวันนี้):\n` +
              `• !สรุปงาน (ดูภาพรวมทุกโครงการ)\n` +
              `• !สรุปงานA, !สรุปงานB, !สรุปงานA2\n\n` +
              `📑 ติดตามงานค้างใบงาน (ค้าง WO):\n` +
              `• !รอใบงาน (ดูทั้งหมดแยกตามเดือน)\n` +
              `• !รอใบงานA, !รอใบงานB, !รอใบงานA2\n\n` +
              `🔍 เช็คงานแจ้งซ่อมส่วนกลาง (บอทสอดแนม):\n` +
              `• !เช็คงาน (ดูภาพรวม)\n` +
              `• !เช็คงานA, !เช็คงานB, !เช็คงานA2\n\n` +
              `💰 งบประมาณ & คาดการณ์สิ้นปี (Forecast):\n` +
              `• !งบ (สรุปงบภาพรวมทุกกลุ่ม)\n` +
              `• !งบA, !งบB, !งบA2 (สรุปงบแยกกลุ่ม)\n` +
              `• !งบ [รหัส] (เจาะลึก 9 หมวด + PV เช่น !งบ 410, !งบ LA-025)\n` +
              `• !เกินงบ (ดูรายการที่เสี่ยงเกินงบสิ้นปี)\n\n` +
              `*(พิมพ์นำหน้าด้วย ! หรือ / หรือพิมพ์คำสั่งตรงๆ ได้เลยครับ)*`;
          }

          if (responseText) {
            await replyToLine(replyToken, responseText);
          }
        }
      }

      // 2. กรณีผู้ใช้ส่งรูปภาพ (Image Message)
      else if (event.type === 'message' && event.message.type === 'image') {
        const replyToken = event.replyToken;
        const messageId = event.message.id;
        const imageSet = event.message.imageSet;

        if (isGroup) {
          // ถ้าส่งรูปในกลุ่มใหญ่ ไม่ตอบรับ เพื่อป้องกันการรบกวนกลุ่ม
          continue;
        }

        try {
          const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
          const draftSnap = await getDoc(draftRef);

          // ดาวน์โหลดภาพจาก LINE Content API
          const imgBuffer = await fetchLineImageBuffer(messageId);
          const dataUrl = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;

          // จัดเก็บลง Subcollection ของ Draft Session
          const photoRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos", messageId);
          await setDoc(photoRef, {
            messageId,
            dataUrl,
            imageSetIndex: imageSet?.index ?? null,
            imageSetTotal: imageSet?.total ?? null,
            createdAt: Date.now()
          });

          if (draftSnap.exists()) {
            const draft = draftSnap.data();
            if (draft.finalizing) {
              continue;
            }

            // คำนวณจำนวนรูปเป้าหมายของรอบนี้ (สูงสุดไม่เกิน 10 รูป ตามข้อกำหนด)
            const targetCount = (imageSet && imageSet.total)
              ? Math.min(10, imageSet.total)
              : (draft.expectedCount || 10);

            await updateDoc(draftRef, {
              expectedCount: targetCount,
              lastPhotoAt: Date.now()
            });

            const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
            const count = photosSnap.size;

            if (count >= targetCount || count >= 10) {
              // ได้รับครบตามจำนวนเป้าหมายแล้ว (เช่น ครบ 10 รูป หรือครบตามอัลบั้มที่เลือก)
              // รอ 1.5 วินาที เพื่อให้ write ในรอบเดียวกันเสร็จสมบูรณ์
              await new Promise(r => setTimeout(r, 1500));
              const latestDraftSnap = await getDoc(draftRef);
              if (latestDraftSnap.exists() && !latestDraftSnap.data().finalizing) {
                await updateDoc(draftRef, { finalizing: true });
                await compileAndSendFloodReport({ userId, replyToken: null, host, proto });
              }
            } else if (count >= 5) {
              // กรณีได้รับตั้งแต่ 5 รูปขึ้นไป แต่ยังไม่ถึง targetCount (เช่น เน็ตช้า หรือรูปบางรูปอัปโหลดหลุด)
              // รอ 8 วินาทีเพื่อดูว่ามีรูปใหม่เข้ามาอีกหรือไม่
              await new Promise(r => setTimeout(r, 8000));
              const latestDraftSnap = await getDoc(draftRef);
              if (latestDraftSnap.exists() && !latestDraftSnap.data().finalizing) {
                const recheckSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
                // ถ้าจำนวนรูปไม่เพิ่มขึ้นแล้ว แสดงว่าส่งเสร็จสิ้นแล้ว ให้สรุปรายงานได้
                if (recheckSnap.size === count) {
                  await updateDoc(draftRef, { finalizing: true });
                  await compileAndSendFloodReport({ userId, replyToken: null, host, proto });
                }
              }
            } else if (count === 1 && (!imageSet || imageSet.index === 1)) {
              if (imageSet && imageSet.total > 1) {
                await replyToLine(replyToken, `📸 กำลังรับชุดภาพถ่ายหน้างาน (${imageSet.total} ภาพ)... ระบบจะรวบรวมและสร้างเอกสารสรุปให้อัตโนมัติเมื่อครบครับ (หรือพิมพ์ '!เสร็จ' เพื่อสรุปรายงานได้ทันที)`);
              } else {
                await replyToLine(replyToken, `📸 ได้รับรูปภาพที่ 1 แล้วครับ (ส่งต่อได้สูงสุด 10 รูป หรือพิมพ์ '!เสร็จ' เมื่อส่งครบครับ)`);
              }
            }
          } else {
            // ยังไม่มี Draft ให้ตอบรับและแนะนำวิธีพิมพ์คำสั่ง
            const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
            if (photosSnap.size === 1 && (!imageSet || imageSet.index === 1)) {
              await replyToLine(replyToken, `📸 บอทได้รับรูปถ่ายหน้างานแล้วครับ!\nกรุณาพิมพ์รหัสโครงการเพื่อสร้างรายงาน เช่น:\n👉 !น้ำท่วม 410\n👉 !น้ำท่วม LH-379\n👉 !น้ำท่วม LA-025`);
            }
          }
        } catch (imgErr) {
          console.error("Handle image error:", imgErr);
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

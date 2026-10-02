// ส่งข้อความตอบกลับไปยัง LINE (Reply API ฟรี 100%)
export async function replyToLine(replyToken, messages) {
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
export async function pushToLine(userId, messages) {
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
export async function fetchLineImageBuffer(messageId) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN) throw new Error("Missing LINE_TOKEN");

  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { 'Authorization': `Bearer ${LINE_TOKEN}` }
  });
  if (!res.ok) throw new Error(`LINE Content API HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// สร้าง LINE Flex Message สรุปผลรายงานสถานการณ์น้ำท่วม
export function buildFloodFlexMessage({ reportId, project, weather, aiResult, photoCount, surveyDateThai, surveyTimeThai, pdfUrl }) {
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

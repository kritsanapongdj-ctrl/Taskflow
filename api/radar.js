// 📡 Vercel Serverless Function: BMA Doppler Radar Proxy
// Bypasses BMA anti-hotlinking protection by injecting official Referer headers

export default async function handler(req, res) {
  const station = (req.query.station || 'nongchok').toLowerCase();
  let targetUrl = '';
  let referer = '';

  if (station === 'nongkam' || station === 'nongkhem' || station === 'bangna') {
    // เรดาร์หนองแขม กทม. (ครอบคลุม กทม. ฝั่งธนบุรี, พระราม 2, บางนา, สมุทรปราการ, สมุทรสาคร)
    targetUrl = `https://weather.bangkok.go.th/Radar/ImageHandlerNongkam.ashx?_t=${Date.now()}`;
    referer = 'https://weather.bangkok.go.th/Radar/RadarNongkam.aspx';
  } else {
    // เรดาร์หนองจอก กทม. (ครอบคลุม กทม. ตะวันออก, ปทุมธานี รังสิต ลำลูกกา, ฉะเชิงเทรา)
    targetUrl = `https://weather.bangkok.go.th/Radar/ImageHandlerNongchok.ashx?_t=${Date.now()}`;
    referer = 'https://weather.bangkok.go.th/Radar/RadarNongchok.aspx';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const upstreamRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Upstream radar error: ${upstreamRes.status}`);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const arrayBuf = await upstreamRes.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=180, s-maxage=180, stale-while-revalidate=60');
    return res.status(200).send(Buffer.from(arrayBuf));
  } catch (err) {
    console.error('Radar proxy failed:', err);
    return res.status(502).send('Failed to fetch radar image');
  }
}

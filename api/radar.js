// 📡 Vercel Serverless Function: BMA Doppler Radar Proxy
// Bypasses BMA anti-hotlinking protection by injecting official Referer headers

export default async function handler(req, res) {
  const station = (req.query.station || 'bma').toLowerCase();
  let targetUrl = 'https://weather.bangkok.go.th/Images/Radar/radar.jpg';

  if (station === 'tmd' || station === 'svp' || station === 'suvarnabhumi') {
    targetUrl = 'https://weather.tmd.go.th/svp/svp120_latest.jpg';
  } else if (station === 'tmd240' || station === 'wide') {
    targetUrl = 'https://weather.tmd.go.th/svp/svp240_latest.jpg';
  } else if (station === 'hii' || station === 'thaiwater') {
    targetUrl = 'https://live1.hii.or.th/product/latest/radar/plot/composite_radar.png';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    let upstreamRes = await fetch(targetUrl + '?_t=' + Date.now(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    // If BMA fails, fallback to TMD Suvarnabhumi
    if (!upstreamRes.ok && targetUrl.includes('bangkok.go.th')) {
      upstreamRes = await fetch('https://weather.tmd.go.th/svp/svp120_latest.jpg?_t=' + Date.now(), {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
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

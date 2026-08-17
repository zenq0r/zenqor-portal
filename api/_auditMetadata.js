function getClientIp(headers = {}) {
    const value = headers['x-vercel-forwarded-for'] || headers['x-forwarded-for'] || headers['x-real-ip'] || '';
    return String(value).split(',')[0].trim() || 'Unavailable';
}

function parseUserAgent(value) {
    const ua = String(value || '').slice(0, 500);
    let browser = 'Unknown Browser';
    if (/Edg\/([\d.]+)/.test(ua)) browser = `Microsoft Edge ${RegExp.$1}`;
    else if (/OPR\/([\d.]+)/.test(ua)) browser = `Opera ${RegExp.$1}`;
    else if (/Chrome\/([\d.]+)/.test(ua)) browser = `Google Chrome ${RegExp.$1}`;
    else if (/Firefox\/([\d.]+)/.test(ua)) browser = `Mozilla Firefox ${RegExp.$1}`;
    else if (/Version\/([\d.]+).*Safari\//.test(ua)) browser = `Safari ${RegExp.$1}`;

    let os = 'Unknown OS';
    if (/Windows NT 10\.0/.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
    else if (/Android ([\d.]+)/.test(ua)) os = `Android ${RegExp.$1}`;
    else if (/(?:iPhone OS|CPU OS) ([\d_]+)/.test(ua)) os = `iOS ${RegExp.$1.replace(/_/g, '.')}`;
    else if (/Mac OS X ([\d_]+)/.test(ua)) os = `macOS ${RegExp.$1.replace(/_/g, '.')}`;
    else if (/Linux/.test(ua)) os = 'Linux';

    const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile/Tablet' : 'Desktop';
    return { browser, os, device, userAgent: ua || 'Unavailable' };
}

module.exports = { getClientIp, parseUserAgent };

// Sólo para QA: revierte transformaciones conocidas del edge, no contenido propio.
export function normalizePagesResponse(value) {
  return value.replace(/\r\n/g, '\n').replace(/<!--\/?email_off-->/g, '')
    .replace(/<a href="\/cdn-cgi\/l\/email-protection" class="__cf_email__" data-cfemail="([a-f0-9]{4,512})">\[email&#160;protected\]<\/a>/g, (original, hex) => {
      if (hex.length % 2) return original;
      const bytes = Buffer.from(hex, 'hex'), salt = bytes[0];
      const plain = Buffer.from(bytes.subarray(1).map(byte => byte ^ salt)).toString('utf8');
      // No convertir un contenido arbitrario en HTML ni aceptar bytes inválidos.
      return /^[a-z0-9.!#$%'+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(plain) ? plain : original;
    })
    .replaceAll('<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>', '');
}

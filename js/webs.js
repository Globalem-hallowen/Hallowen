import { $ } from "./utils.js";

/* ---------- Telarañas de fondo ---------- */
export function drawWebs() {
  // Telarañas de esquina algo irregulares, como las de la tarjeta: azul grisáceo arriba, óxido abajo.
  const web = (seed, rays, rings) => {
    let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const ang = Array.from({ length: rays }, (_, i) => (i / (rays - 1)) * Math.PI / 2 + (i && i < rays - 1 ? (rnd() - .5) * .12 : 0));
    let d = "";
    ang.forEach(a => { const r = 330 + rnd() * 20; d += `M0 0L${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`; });
    rings.forEach(r0 => {
      const p = ang.map(a => { const r = r0 * (0.94 + rnd() * .12); return [r * Math.cos(a), r * Math.sin(a)]; });
      d += `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
      for (let i = 1; i < p.length; i++) {
        const a = (ang[i - 1] + ang[i]) / 2, rr = r0 * (0.80 + rnd() * .06);
        d += `Q${(rr * Math.cos(a)).toFixed(1)} ${(rr * Math.sin(a)).toFixed(1)} ${p[i][0].toFixed(1)} ${p[i][1].toFixed(1)}`;
      }
    });
    return d;
  };
  const svg = (cls, seed, color, rings) => `<svg class="${cls}" viewBox="0 0 330 330"><path d="${web(seed, 8, rings)}" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
  $("#webs").innerHTML =
    svg("tl", 7, "#8fa6b8", [28, 60, 96, 136, 180, 228, 280]) +
    svg("tr", 21, "#8fa6b8", [34, 76, 124, 178, 236]) +
    svg("br", 43, "#c9824f", [26, 56, 90, 128, 170, 216, 266, 318]) +
    svg("bl", 77, "#8fa6b8", [40, 88, 140, 196, 256]);
}

/* ---------- Íconos SVG compartidos por index.html y resultados.html ---------- */
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="i-bat" viewBox="0 0 64 40">
      <path d="M32 12l-3-6-2 7c-5-3-14-5-25 0 6 3 9 8 8 15 4-4 9-4 12 1 2-4 6-6 10-3 4-3 8-1 10 3 3-5 8-5 12-1-1-7 2-12 8-15-11-5-20-3-25 0l-2-7z" fill="currentColor"/>
    </symbol>
    <symbol id="i-spider" viewBox="0 0 40 40">
      <path d="M17 20Q10 12 4 14M17 22Q9 18 2 22M17 24Q10 26 4 32M18 26Q13 32 10 38M23 20Q30 12 36 14M23 22Q31 18 38 22M23 24Q30 26 36 32M22 26Q27 32 30 38" fill="none" stroke="#8fa6b8" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>
      <ellipse cx="20" cy="25" rx="5.2" ry="6.4" fill="#07080a" stroke="#8fa6b8" stroke-width=".7" stroke-opacity=".6"/>
      <circle cx="20" cy="17" r="3.6" fill="#07080a" stroke="#8fa6b8" stroke-width=".7" stroke-opacity=".6"/>
      <circle cx="18.6" cy="16.6" r=".95" fill="#ff4a3a"/><circle cx="21.4" cy="16.6" r=".95" fill="#ff4a3a"/>
    </symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></symbol>
    <symbol id="i-left" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-web" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/><path d="M12 6l4.2 1.8L18 12l-1.8 4.2L12 18l-4.2-1.8L6 12l1.8-4.2z"/></g></symbol>
    <symbol id="i-mask" viewBox="0 0 24 24"><path d="M3 7c3-2 15-2 18 0 0 7-3 11-9 11S3 14 3 7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 10.5c1-1 3-1 4 0M13 10.5c1-1 3-1 4 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></symbol>
  </defs>
</svg>`;

export function mountSprite() { document.body.insertAdjacentHTML("afterbegin", SPRITE); }

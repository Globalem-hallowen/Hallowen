/* ---------- Datos fijos del concurso ---------- */
export const JUECES = ["Jorge", "Invitado especial", "Tifanny"];
export const GRUPOS = {
  1: { isla: "Isla 1", tema: "Alicia en el País de las Maravillas", lider: "Sandra Sanchez" },
  2: { isla: "Isla 2", tema: "Tim Burton", detalle: "El extraño mundo de Jack y El cadáver de la novia", lider: "Paola Archila" },
  3: { isla: "Isla 3", tema: "Alicia en el País de las Maravillas", lider: "Karen Farfán" },
  4: { isla: "Isla 4", tema: "Piratas del Caribe", lider: "Laura Clavijo" }
};
export const ISLAS = [1, 2, 3, 4].map(g => ({ key: "isla-" + g, group: g, name: GRUPOS[g].isla }));
export const CRIT = {
  isla: [
    { t: "Coherencia con la temática", d: "La decoración representa claramente la película o serie escogida." },
    { t: "Creatividad y originalidad", d: "Ideas propias y elementos hechos a mano, no solo artículos comprados." },
    { t: "Detalle y elaboración", d: "Cuidado en los acabados y aprovechamiento del espacio de la isla." },
    { t: "Ambientación e impacto visual", d: "Ambiente, iluminación y efecto general al llegar a la isla." }
  ],
  disfraz: [
    { t: "Coherencia con la temática", d: "El personaje pertenece a la película o serie de su grupo." },
    { t: "Creatividad y originalidad", d: "Interpretación propia del personaje." },
    { t: "Elaboración y detalle", d: "Calidad y acabado del disfraz con cualquier material (tela, cartón, papel, plástico u otros elementos reciclados); ingenio en el uso de los materiales; maquillaje y peinado; accesorios y utilería; fidelidad al personaje; esfuerzo y trabajo propio. El costo no da ventaja." },
    { t: "Caracterización en el desfile", d: "Actitud y actuación del personaje en la pasarela." }
  ]
};
export const PREMIO = { isla: "$300.000", disfraz: "$200.000" };
export const CREAT = 1; // índice de "Creatividad y originalidad" (desempate)
export const SAVED_MSGS = [
  "¡Calificación sellada con sangre de calabaza!",
  "¡Anotado en el libro de hechizos!",
  "¡El caldero ya la guardó!",
  "¡Los murciélagos llevaron tu nota!",
  "¡Guardada bajo siete telarañas!",
  "¡La bruja dio fe de tu voto!"
];
// Texto de los filtros de grupo: número y temática, como en las tarjetas de decoración.
export function grpChip(g) { return g ? `<b>Grupo ${g}</b><small>${GRUPOS[g].tema}</small>` : `<b>Todos</b><small>Los 4 grupos</small>`; }
export function label(n) { return !n ? "" : n <= 2 ? "Deficiente" : n <= 4 ? "Regular" : n <= 6 ? "Bueno" : n <= 8 ? "Muy bueno" : "Excelente"; }

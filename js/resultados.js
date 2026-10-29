/* Punto de entrada de resultados.html (página independiente del detalle de resultados). */
import { mountSprite } from "./sprite.js";
import { drawWebs, trackEye } from "./webs.js";
import { startAmbient } from "./ambient.js";
import { startDetailPage } from "./views/detail.js";

mountSprite();
drawWebs();
trackEye();
startAmbient();
startDetailPage();

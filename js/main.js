/* Punto de entrada: dibuja el fondo, conecta los eventos y arranca el tiempo real. */
import { CONFIG_OK } from "./api.js";
import { mountSprite } from "./sprite.js";
import { drawWebs, trackEye } from "./webs.js";
import { startAmbient } from "./ambient.js";
import { bindEvents } from "./events.js";
import { render } from "./router.js";
import { startSync } from "./sync.js";

mountSprite();
drawWebs();
trackEye();
startAmbient();
bindEvents();
render();
if (CONFIG_OK) startSync();

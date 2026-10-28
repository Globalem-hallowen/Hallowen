/* Punto de entrada: dibuja el fondo, conecta los eventos y arranca el tiempo real. */
import { CONFIG_OK } from "./api.js";
import { drawWebs } from "./webs.js";
import { bindEvents } from "./events.js";
import { render } from "./router.js";
import { startSync } from "./sync.js";

drawWebs();
bindEvents();
render();
if (CONFIG_OK) startSync();

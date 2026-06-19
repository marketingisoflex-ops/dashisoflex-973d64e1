/**
 * Módulo isolado para a direção da transição de página.
 * Separado para evitar conflito com o HMR do plugin React
 * que exige que arquivos de rotas só exportem componentes.
 */
let _direction: "up" | "down" = "down";

export function setPageTransitionDirection(dir: "up" | "down") {
  _direction = dir;
}

export function getPageTransitionDirection(): "up" | "down" {
  return _direction;
}

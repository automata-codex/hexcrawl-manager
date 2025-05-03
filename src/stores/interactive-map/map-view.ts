import { writable } from 'svelte/store';

export const mapView = writable({
  zoom: 1,
  zoomFactor: 1.1,
  minZoom: 0.25,
  maxZoom: 8,
  centerX: 400,
  centerY: 400,
  svgWidth: 800,
  svgHeight: 800,
});

export function panBy(deltaX: number, deltaY: number) {
  mapView.update(state => ({
    ...state,
    centerX: state.centerX - deltaX / state.zoom,
    centerY: state.centerY - deltaY / state.zoom,
  }));
}

export function updateZoomAtPoint(
  svgX: number,
  svgY: number,
  screenX: number,
  screenY: number,
  delta: number,
) {
  mapView.update(state => {
    const { zoom, zoomFactor, minZoom, maxZoom, svgWidth, svgHeight } = state;
    const newZoom = delta > 0 ? zoom * zoomFactor : zoom / zoomFactor;
    const clampedZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));

    const newViewWidth = svgWidth / clampedZoom;
    const newViewHeight = svgHeight / clampedZoom;

    const centerX = svgX - (screenX / svgWidth) * newViewWidth + newViewWidth / 2;
    const centerY = svgY - (screenY / svgHeight) * newViewHeight + newViewHeight / 2;

    return {
      ...state,
      zoom: clampedZoom,
      centerX,
      centerY,
    };
  });
}

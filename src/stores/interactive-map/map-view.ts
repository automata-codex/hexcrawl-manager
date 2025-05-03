import { writable } from 'svelte/store';

export interface MapViewState {
  zoom: number;
  zoomFactor: number;
  minZoom: number;
  maxZoom: number;
  centerX: number;
  centerY: number;
  svgWidth: number;
  svgHeight: number;
}

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

export function applyZoomAtCenter(delta: number) {
  mapView.update(state => {
    const { zoom, zoomFactor, minZoom, maxZoom, svgWidth, svgHeight, centerX, centerY } = state;
    const screenX = svgWidth / 2;
    const screenY = svgHeight / 2;

    const viewX = centerX - svgWidth / 2 / zoom;
    const viewY = centerY - svgHeight / 2 / zoom;

    const svgX = viewX + (screenX / svgWidth) * (svgWidth / zoom);
    const svgY = viewY + (screenY / svgHeight) * (svgHeight / zoom);

    const newZoom = delta > 0 ? zoom * zoomFactor : zoom / zoomFactor;
    const clampedZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));

    const newViewWidth = svgWidth / clampedZoom;
    const newViewHeight = svgHeight / clampedZoom;

    const adjustedCenterX = svgX - (screenX / svgWidth) * newViewWidth + newViewWidth / 2;
    const adjustedCenterY = svgY - (screenY / svgHeight) * newViewHeight + newViewHeight / 2;

    return {
      ...state,
      zoom: clampedZoom,
      centerX: adjustedCenterX,
      centerY: adjustedCenterY,
    };
  });
}

export function computeViewBox({ centerX, centerY, svgWidth, svgHeight, zoom }: MapViewState) {
  const width = svgWidth / zoom;
  const height = svgHeight / zoom;
  return `${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`;
}

export function panBy(deltaX: number, deltaY: number) {
  mapView.update(state => ({
    ...state,
    centerX: state.centerX - deltaX / state.zoom,
    centerY: state.centerY - deltaY / state.zoom,
  }));
}

export function updateSvgSizeAndPreserveCenter(newWidth: number, newHeight: number) {
  mapView.update(state => {
    const { zoom, centerX, centerY, svgWidth, svgHeight } = state;

    const oldViewWidth = svgWidth / zoom;
    const oldViewHeight = svgHeight / zoom;
    const newViewWidth = newWidth / zoom;
    const newViewHeight = newHeight / zoom;

    const viewX = centerX - oldViewWidth / 2;
    const viewY = centerY - oldViewHeight / 2;

    const adjustedCenterX = viewX + newViewWidth / 2;
    const adjustedCenterY = viewY + newViewHeight / 2;

    return {
      ...state,
      svgWidth: newWidth,
      svgHeight: newHeight,
      centerX: adjustedCenterX,
      centerY: adjustedCenterY,
    };
  });
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

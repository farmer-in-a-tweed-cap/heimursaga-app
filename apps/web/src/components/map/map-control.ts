export class MapNavigationControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl map-control-group map-control';
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;

    // Zoom In Button with SVG
    const zoomIn = document.createElement('button');
    zoomIn.innerHTML = '+';
    zoomIn.addEventListener('click', () => this.map?.zoomIn());
    this.container.appendChild(zoomIn);

    // Zoom Out Button with SVG
    const zoomOut = document.createElement('button');
    zoomOut.innerHTML = '-';
    zoomOut.addEventListener('click', () => this.map?.zoomOut());
    this.container.appendChild(zoomOut);

    // Geolocate Button with SVG
    const geolocate = document.createElement('button');
    geolocate.className = 'geolocate-btn';
    geolocate.innerHTML = '📍';
    geolocate.addEventListener('click', () => this.locateUser());
    this.container.appendChild(geolocate);

    return this.container;
  }

  private locateUser() {
    if (!this.map) return;

    const geolocateBtn = this.container.querySelector(
      '.geolocate-btn',
    ) as HTMLButtonElement;
    geolocateBtn.disabled = true;
    geolocateBtn.innerHTML = '<span class="animate-spin">⏳</span>';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.map?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            speed: 1.2,
          });
          geolocateBtn.disabled = false;
          geolocateBtn.innerHTML = '📍';
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to retrieve your location');
          geolocateBtn.disabled = false;
          geolocateBtn.innerHTML = '📍';
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } else {
      alert('Geolocation is not supported by your browser');
      geolocateBtn.disabled = false;
      geolocateBtn.innerHTML = '📍';
    }
  }

  onRemove(): void {
    this.container.remove();
    this.map = undefined;
  }
}

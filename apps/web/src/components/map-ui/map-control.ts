export class MapNavigationControl implements mapboxgl.IControl {
  private map?: mapboxgl.Map;
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl map-control-group map-control';
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;

    // zoom in buttom
    const zoomIn = document.createElement('button');
    zoomIn.innerHTML = '+';
    zoomIn.addEventListener('click', () => this.map?.zoomIn());
    this.container.appendChild(zoomIn);

    // zoom out button
    const zoomOut = document.createElement('button');
    zoomOut.innerHTML = '-';
    zoomOut.addEventListener('click', () => this.map?.zoomOut());
    this.container.appendChild(zoomOut);

    // geolocate button
    const geolocate = document.createElement('button');
    geolocate.className = 'geolocate-btn';
    geolocate.innerHTML = '<svg width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64Zm0,112a48,48,0,1,1,48-48A48.05,48.05,0,0,1,128,176ZM128,8V40a8,8,0,0,1-16,0V8a8,8,0,0,1,16,0ZM40,128a8,8,0,0,1-8-8H8a8,8,0,0,1,0-16H32a8,8,0,0,1,8,8Zm176,0a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H224A8,8,0,0,1,216,128Zm-88,80v32a8,8,0,0,1-16,0V208a8,8,0,0,1,16,0Z"></path></svg>';
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
    geolocateBtn.innerHTML = '<div class="animate-spin"><svg width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><circle cx="128" cy="128" r="96" opacity="0.2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM128,200a72,72,0,1,1,72-72A72.08,72.08,0,0,1,128,200Z"/></svg></div>';

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
          geolocateBtn.innerHTML = '<svg width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64Zm0,112a48,48,0,1,1,48-48A48.05,48.05,0,0,1,128,176ZM128,8V40a8,8,0,0,1-16,0V8a8,8,0,0,1,16,0ZM40,128a8,8,0,0,1-8-8H8a8,8,0,0,1,0-16H32a8,8,0,0,1,8,8Zm176,0a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H224A8,8,0,0,1,216,128Zm-88,80v32a8,8,0,0,1-16,0V208a8,8,0,0,1,16,0Z"></path></svg>';
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to retrieve your location');
          geolocateBtn.disabled = false;
          geolocateBtn.innerHTML = '<svg width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64Zm0,112a48,48,0,1,1,48-48A48.05,48.05,0,0,1,128,176ZM128,8V40a8,8,0,0,1-16,0V8a8,8,0,0,1,16,0ZM40,128a8,8,0,0,1-8-8H8a8,8,0,0,1,0-16H32a8,8,0,0,1,8,8Zm176,0a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H224A8,8,0,0,1,216,128Zm-88,80v32a8,8,0,0,1-16,0V208a8,8,0,0,1,16,0Z"></path></svg>';
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

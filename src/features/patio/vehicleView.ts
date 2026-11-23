export type VehicleView = 'cards' | 'list';
export const vehicleViewStorageKey = (org: number, login: string) => `yes7parking.patio.vehicles-view.${org}.${encodeURIComponent(login)}`;

export function readVehicleView(org: number, login: string): VehicleView {
  try { return localStorage.getItem(vehicleViewStorageKey(org, login)) === 'list' ? 'list' : 'cards'; }
  catch { return 'cards'; }
}

export function writeVehicleView(org: number, login: string, view: VehicleView) {
  try { localStorage.setItem(vehicleViewStorageKey(org, login), view); }
  catch { /* A preferência indisponível não deve bloquear a operação da sessão. */ }
}

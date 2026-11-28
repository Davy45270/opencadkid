const owlUrl = new URL('./motsmeles-chouette.webp', import.meta.url).href;
const logoUrl = new URL('./motsmeles-logo.webp', import.meta.url).href;

export const pictogram = `<img class="motsmeles-logo" src="${logoUrl}" alt="" width="96" height="96">`;
export const owl = (alt: string): string => `<img class="motsmeles-owl" src="${owlUrl}" alt="${alt}">`;

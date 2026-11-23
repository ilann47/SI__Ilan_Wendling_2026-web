/** Altura da barra superior (Home e módulos). */
export const APP_HEADER_HEIGHT = 64;

/** Segunda linha de áreas em desktops intermediários; inline em xl+. */
export const APP_HEADER_NAV_HEIGHT = 44;
export const APP_HEADER_HEIGHTS = { xs: APP_HEADER_HEIGHT, md: APP_HEADER_HEIGHT + APP_HEADER_NAV_HEIGHT, xl: APP_HEADER_HEIGHT } as const;

/** Padding horizontal do header — o mesmo na Home e nos módulos. */
export const APP_HEADER_PX = { xs: 1.5, sm: 2.25 } as const;

/** Largura máxima do campo de busca global. */
export const APP_HEADER_SEARCH_MAX_WIDTH = 520;

/** Tamanho da marca no header. */
export const APP_HEADER_BRAND_SIZE = 34;

/** Slot reservado do hamburger (mobile) para o cluster esquerdo não se deslocar. */
export const APP_HEADER_NAV_SLOT = 40;

/** Largura da sidebar de módulos (aberta). */
export const APP_SIDEBAR_WIDTH = 228;

/** Largura da sidebar recolhida (só ícones). */
export const APP_SIDEBAR_COLLAPSED_WIDTH = 72;

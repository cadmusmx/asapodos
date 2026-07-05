// Máscara CRUD (R/W/U/D), canonicidad y helpers de bits. Fuente única de orden de bits.
export * from './permission-mask';

// Errores tipados que el HOF traduce a 401/403.
export * from './errors';

// Resolver de bajo nivel (recibe tx; lo usa /api/me dentro de su propia transacción).
export * from './resolve-permissions';

// Wrapper que abre el contexto de tenant y resuelve (para quien no tiene tx propio).
export * from './get-effective-views';

// Core puro de autorización (lanza ForbiddenError).
export * from './require-permission';

// HOF de ruta que blinda un handler de App Router.
export * from './with-permission';


export * from './assign-permission';

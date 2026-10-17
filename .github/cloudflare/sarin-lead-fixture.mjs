// Datos sintéticos mínimos para las pruebas; nunca información de visitantes.
export const LEAD = Object.freeze({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.test' });
export const LEAD_BYTES = Buffer.byteLength(LEAD.firstName) + Buffer.byteLength(LEAD.lastName) + Buffer.byteLength(LEAD.email);

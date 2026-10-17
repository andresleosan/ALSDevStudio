// @ts-check
import { handleSarinAdmin } from '../../../server/sarin/admin.js';
export const onRequest = context => handleSarinAdmin(context.request, context.env);

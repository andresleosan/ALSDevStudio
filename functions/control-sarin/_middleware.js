// @ts-check
import { protectSarinAdmin } from '../../server/sarin/access.js';
export const onRequest = context => protectSarinAdmin(context);

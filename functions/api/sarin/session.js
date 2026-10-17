// @ts-check
import { handleSarinSession } from '../../../server/sarin/sessions.js';
export function onRequest(context) { return handleSarinSession(context.request,context.env); }

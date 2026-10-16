// @ts-check
import { handleSarin } from '../../server/sarin/handler.js';
export function onRequest(context){return handleSarin(context.request,context.env);}

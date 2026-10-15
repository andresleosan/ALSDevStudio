// @ts-check
export class ControlError extends Error {
  /** @param {string} code @param {string} message @param {number} [status] */
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'ControlError';
    this.code = code;
    this.status = status;
  }
}

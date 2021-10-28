export class ParqetParserError extends Error {
  /**
   * @param {string} message - error message
   * @param {string} input - input that caused the error
   * @param {number} [status=3] - Parqet error code
   */
  constructor(message, input, status = 3) {
    super(message);
    this.name = this.constructor.name;
    this.data = { input, status };
  }
}

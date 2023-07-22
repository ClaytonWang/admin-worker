import { createLogger, format, transports } from 'winston';
import moment from 'moment';

export default class LogHandler {
  constructor(name, type) {
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.splat(), // formats level.message based on Node's util.format().
        format.colorize(),
        format.label({ label: name, type }),
        format.errors({ stack: true }),
        format.printf(({ label, type, message, timestamp }) => `${timestamp} [${label}][${type}] : ${message}`)
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: `./logs/${name}/${type.replaceAll(':', '')}/${moment().format('YYMMDD-HHmmss')}.log` })
      ]
    });
  }
  log(...arg) {
    this.logger.info(arg)
  }
}



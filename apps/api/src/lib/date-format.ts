import * as dayjs from 'dayjs';
import * as between from 'dayjs/plugin/isBetween';
import * as today from 'dayjs/plugin/isToday';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';

export const dateformat = dayjs;

dateformat.extend(utc);
dateformat.extend(timezone);
dateformat.extend(between);
dateformat.extend(today);

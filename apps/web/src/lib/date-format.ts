import dayjs from 'dayjs';
import between from 'dayjs/plugin/isBetween';
import today from 'dayjs/plugin/isToday';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

export const dateformat = dayjs;

dateformat.extend(utc);
dateformat.extend(timezone);
dateformat.extend(between);
dateformat.extend(today);

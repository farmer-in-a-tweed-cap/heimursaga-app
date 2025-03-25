import { IEmailSendPayload } from '@/modules/email';
import { IUploadMediaPayload } from '@/modules/upload';

export interface IEmailSendEvent<T = any> extends IEmailSendPayload<T> {}

export interface IUploadEvent extends IUploadMediaPayload {}

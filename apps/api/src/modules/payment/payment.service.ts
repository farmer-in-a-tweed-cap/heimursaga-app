import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';
import { getUploadStaticUrl } from '@/lib/upload';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import {
  IPaymentMethodCreateOptions,
  IPaymentMethodDeleteOptions,
  IPaymentMethodGetByIdOptions,
  IPaymentMethodQueryOptions,
} from './payment.interface';

@Injectable()
export class PaymentService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async getPaymentMethods(query: IPaymentMethodQueryOptions) {
    try {
      const { userId } = query;

      if (!userId) throw new ServiceForbiddenException();

      const where = {
        public_id: { not: null },
        deleted_at: null,
        user_id: userId,
      } as Prisma.PaymentMethodWhereInput;

      const take = 20;

      // search payment methods
      const results = await this.prisma.paymentMethod.count({ where });
      const data = await this.prisma.paymentMethod.findMany({
        where,
        select: {
          public_id: true,
          label: true,
          last4: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      return { results, data };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment methods not found');
      throw exception;
    }
  }

  async getPaymentMethodById(query: IPaymentMethodGetByIdOptions) {
    try {
      const { userId } = query;

      if (!userId) throw new ServiceForbiddenException();

      const where = {
        public_id: { not: null },
        deleted_at: null,
        user_id: userId,
      } as Prisma.PaymentMethodWhereInput;

      const take = 20;

      // search payment methods
      const results = await this.prisma.paymentMethod.count({ where });
      const data = await this.prisma.paymentMethod.findMany({
        where,
        select: {
          public_id: true,
          label: true,
          last4: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      return { results, data };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment methods not found');
      throw exception;
    }
  }

  // @todo
  async createPaymentMethod(payload: IPaymentMethodCreateOptions) {
    try {
      const { userId } = payload;

      if (!userId) throw new ServiceForbiddenException();
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment method not created');
      throw exception;
    }
  }

  // @todo
  async deletePaymentMethod(payload: IPaymentMethodDeleteOptions) {
    try {
      const { userId } = payload;

      if (!userId) throw new ServiceForbiddenException();
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment method not deleted');
      throw exception;
    }
  }
}

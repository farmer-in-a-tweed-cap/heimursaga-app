import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { dateformat } from '@/lib/date-format';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import {
  IPostCreatePayload,
  IPostDeletePayload,
  IPostUpdatePayload,
} from './post.interface';

@Injectable()
export class PostService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async search() {
    try {
      const where = { deleted_at: null } as Prisma.PostWhereInput;

      // search posts
      const results = await this.prisma.post.count({ where });
      const data = await this.prisma.post
        .findMany({
          where,
          select: {
            id: true,
            title: true,
            content: true,
            author: {
              select: {
                profile: {
                  select: { first_name: true, picture: true },
                },
              },
            },
            created_at: true,
          },
          orderBy: [{ id: 'desc' }],
        })
        .then((posts) =>
          posts.map((post) => ({
            id: post.id,
            title: post.title,
            author: {
              name: post.author?.profile?.first_name,
              picture: post.author?.profile?.picture,
            },
            createdAt: post.created_at,
          })),
        );

      return { results, data };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not created');
      throw exception;
    }
  }

  async getById(id: number) {
    try {
      // get the post
      const data = await this.prisma.post
        .findFirstOrThrow({
          where: { id, deleted_at: null },
          select: {
            id: true,
            title: true,
            content: true,
            author: {
              select: {
                profile: {
                  select: { first_name: true, picture: true },
                },
              },
            },
            created_at: true,
          },
        })
        .then((post) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          author: {
            name: post.author?.profile?.first_name,
            picture: post.author?.profile?.picture,
          },
          createdAt: post.created_at,
        }));

      return data;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('post not found');
      throw exception;
    }
  }

  async create(payload: IPostCreatePayload): Promise<void> {
    try {
      const { userId, ...data } = payload;

      // create a post
      const post = await this.prisma.post.create({
        data: {
          ...data,
          author: { connect: { id: userId } },
        },
      });

      console.log({ post });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not created');
      throw exception;
    }
  }

  async update(payload: IPostUpdatePayload): Promise<void> {
    try {
      const { id, userId, ...data } = payload;

      if (!id || !userId) throw new ServiceNotFoundException('post not found');

      // access check
      const access = await this.prisma.post
        .findFirstOrThrow({
          where: { id, author_id: userId },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceForbiddenException('post can not be updated');

      // update the post
      const post = await this.prisma.post.update({
        where: { id, author_id: userId },
        data,
      });

      console.log({ post });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not updated');
      throw exception;
    }
  }

  async delete(payload: IPostDeletePayload): Promise<void> {
    try {
      const { id, userId } = payload;

      if (!id || !userId) throw new ServiceNotFoundException('post not found');

      // access check
      const access = await this.prisma.post
        .findFirstOrThrow({
          where: { id, author_id: userId },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceForbiddenException('post can not be deleted');

      // update the post
      const post = await this.prisma.post.update({
        where: { id, author_id: userId, deleted_at: null },
        data: { deleted_at: dateformat().toDate() },
      });

      console.log({ post });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not deleted');
      throw exception;
    }
  }
}

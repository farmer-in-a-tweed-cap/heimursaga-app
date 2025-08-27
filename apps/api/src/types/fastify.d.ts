declare global {
  namespace Fastify {
    interface FastifyRequest {
      session: {
        get(key: string): any;
        set(key: string, value: any): void;
        delete(): void;
      };
    }

    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        stream: Readable;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

export {};

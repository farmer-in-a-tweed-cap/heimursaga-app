export const getStaticMediaUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  const baseUrl = process.env.S3_ENDPOINT;
  const url = new URL(path, baseUrl).toString();
  return url;
};

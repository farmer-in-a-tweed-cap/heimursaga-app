export const getStaticMediaUrl = (path: string): string => {
  const baseUrl = process.env.S3_ENDPOINT;
  const url = new URL(path, baseUrl).toString();
  return url;
};

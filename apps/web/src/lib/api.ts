export const API_ROUTER = {
  TEST: 'test',
};

export const QUERY_KEYS = {
  POSTS: 'posts',
};

const { API_BASE_URL } = process.env;

const baseUrl = `${API_BASE_URL}`;

const request = async (path: string, config?: globalThis.Request) => {
  const url = `${baseUrl}/${path}`;

  const response = await fetch(url, config);
  if (!response.ok) {
    throw new Error('failed to fetch');
  }
  return response.json();
};

export const fetchPosts = async () => {
  return request('test');
};

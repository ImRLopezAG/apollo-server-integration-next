import { isNextApiRequest } from './isNextApiRequest';
import { HeaderMap } from '@apollo/server';

const getHeaders = (req: Request) => {
  const headers = new HeaderMap();

  if (isNextApiRequest(req)) {
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      }
    }
  } else {
    req.headers.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
};

export { getHeaders };

import { isNextApiRequest } from './isNextApiRequest';

const getBody = async (req: Request) => {
  if (isNextApiRequest(req)) {
    return req.body;
  }
  const result = req.headers.get('content-type') === 'application/json' ? req.json() : req.text();
  return result;
};

export { getBody };
